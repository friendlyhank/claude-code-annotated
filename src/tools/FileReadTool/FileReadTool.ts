/**
 * FileReadTool - 文件读取工具
 *
 * 核心职责：读取本地文件系统文件，支持文本、图片、PDF、Notebook
 * 当前实现：文本文件读取主链路
 * TODO: 图片读取（readImageWithTokenBudget）、PDF 读取、Notebook 读取待后续补齐
 */

import { z } from 'zod/v4'
import * as path from 'path'
import { hasBinaryExtension } from '../../constants/files.js'
import type { PermissionResult } from '../../types/permissions.js'
import type { UserMessage, AssistantMessage, AttachmentMessage, SystemMessage } from '../../types/message.js'
import type { ToolUseContext } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { getErrnoCode, isENOENT } from '../../utils/errors.js'
import {
  addLineNumbers, // 为文本文件添加行号
  FILE_NOT_FOUND_CWD_NOTE, // 文件不存在时的提示
  findSimilarFile, // 查找相似文件
  getFileModificationTimeAsync, // 获取文件修改时间
  suggestPathUnderCwd, // 建议文件路径（当前目录）
} from '../../utils/file.js'
import { formatFileSize } from '../../utils/format.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath } from '../../utils/path.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import { readFileInRange } from '../../utils/readFileInRange.js'
import { semanticNumber } from '../../utils/semanticNumber.js'
import { getDefaultFileReadingLimits } from './limits.js'
import {
  DESCRIPTION, // 工具描述
  FILE_READ_TOOL_NAME, // 工具名称
  FILE_UNCHANGED_STUB,  // 文件未改变时的提示
  LINE_FORMAT_INSTRUCTION, // 文本文件行号格式
  OFFSET_INSTRUCTION_DEFAULT, // 默认偏移量指令
  OFFSET_INSTRUCTION_TARGETED, // 目标偏移量指令
  renderPromptTemplate, // 渲染提示模板
} from './prompt.js'

// ---------------------------------------------------------------------------
// 设备文件黑名单 — 纯路径检查（无 I/O），防止读取后进程卡死或 OOM
//
// 这些是 Linux/macOS 的特殊设备文件，一旦打开读取就会导致进程异常：
// - 无限输出：read 永远不会 EOF，进程卡在 I/O 等待，内存持续增长直到 OOM
// - 阻塞等待：read 会等待外部输入（键盘/终端），进程挂起无法继续
// - 无意义读取：指向输出流，读取无实际含义
//
// 必须在做任何 I/O 之前纯靠路径字符串判断并拒绝，因为这些文件一旦打开
// 就停不下来，不可能"试一下再关掉"。/dev/null 故意不在黑名单中，
// 因为读它立即返回 EOF，是安全的。
// ---------------------------------------------------------------------------

const BLOCKED_DEVICE_PATHS = new Set([
  // 无限输出 — read 永远不会 EOF，进程卡死，内存增长到 OOM
  '/dev/zero', // 无限输出 \0 字节
  '/dev/random', // 无限输出随机字节，熵池耗尽时阻塞
  '/dev/urandom', // 同 random，不阻塞但永不 EOF
  '/dev/full', // 读取时行为类似 /dev/zero
  // 阻塞等待输入 — read 等待外部数据，进程挂起
  '/dev/stdin', // 指向当前进程标准输入，等待键盘输入
  '/dev/tty', // 指向当前终端，等待终端输入
  '/dev/console', // 系统控制台，同样阻塞
  // 无意义读取 — 指向输出流，读它没有实际含义
  '/dev/stdout', // 指向标准输出
  '/dev/stderr', // 指向标准错误
  // stdin/stdout/stderr 的 fd 数字别名
  '/dev/fd/0', // 等同 /dev/stdin
  '/dev/fd/1', // 等同 /dev/stdout
  '/dev/fd/2', // 等同 /dev/stderr
])

// 检查文件路径是否在设备文件黑名单中
function isBlockedDevicePath(filePath: string): boolean {
  if (BLOCKED_DEVICE_PATHS.has(filePath)) return true
  // /proc/<pid>/fd/0-2 是 Linux 下 stdin/stdout/stderr 的符号链接别名
  // 例如 /proc/self/fd/0 → /dev/stdin，/proc/1234/fd/2 → /dev/stderr
  // 无法穷举所有 pid，所以用 startsWith + endsWith 模式匹配
  if (
    filePath.startsWith('/proc/') &&
    (filePath.endsWith('/fd/0') ||
      filePath.endsWith('/fd/1') ||
      filePath.endsWith('/fd/2'))
  )
    return true
  return false
}

// ---------------------------------------------------------------------------
// macOS 截图路径空格处理
// ---------------------------------------------------------------------------

// macOS 部分版本在截图文件名 AM/PM 前使用窄不换行空格 (U+202F)
const THIN_SPACE = String.fromCharCode(8239)

/**
 * 对于含 AM/PM 的 macOS 截图路径，AM/PM 前的空格可能是普通空格或窄空格
 * 返回备选路径，原始路径不存在时尝试
 */
function getAlternateScreenshotPath(filePath: string): string | undefined {
  const filename = path.basename(filePath)
  const amPmPattern = /^(.+)([ \u202F])(AM|PM)(\.png)$/
  const match = filename.match(amPmPattern)
  if (!match) return undefined

  const currentSpace = match[2]
  const alternateSpace = currentSpace === ' ' ? THIN_SPACE : ' '
  return filePath.replace(
    `${currentSpace}${match[3]}${match[4]}`,
    `${alternateSpace}${match[3]}${match[4]}`,
  )
}

// ---------------------------------------------------------------------------
// 文件读取监听器
// ---------------------------------------------------------------------------

type FileReadListener = (filePath: string, content: string) => void
const fileReadListeners: FileReadListener[] = []

// 注册文件读取监听器
// 设计原因：在读取文件内容后，通知监听器文件路径和内容
export function registerFileReadListener(
  listener: FileReadListener,
): () => void {
  fileReadListeners.push(listener)
  return () => {
    const i = fileReadListeners.indexOf(listener)
    if (i >= 0) fileReadListeners.splice(i, 1)
  }
}

// ---------------------------------------------------------------------------
// 错误类
// ---------------------------------------------------------------------------

export class MaxFileReadTokenExceededError extends Error {
  constructor(
    public tokenCount: number,
    public maxTokens: number,
  ) {
    super(
      `File content (${tokenCount} tokens) exceeds maximum allowed tokens (${maxTokens}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`,
    )
    this.name = 'MaxFileReadTokenExceededError'
  }
}

// ---------------------------------------------------------------------------
// 图片扩展名集合
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

// ---------------------------------------------------------------------------
// Input / Output Schema
// ---------------------------------------------------------------------------
// todo hank 这是重点
const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z.string().describe('The absolute path to the file to read'), // 要读取的文件的绝对路径
    offset: semanticNumber(z.number().int().nonnegative().optional()).describe(
      'The line number to start reading from. Only provide if the file is too large to read at once',
    ),
    limit: semanticNumber(z.number().int().positive().optional()).describe(
      'The number of lines to read. Only provide if the file is too large to read at once.',
    ),
    pages: z
      .string()
      .optional()
      .describe(
        'Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files.',
      ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

export type Input = z.infer<InputSchema>

const outputSchema = lazySchema(() => {
  const imageMediaTypes = z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ])

  return z.discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      file: z.object({
        filePath: z.string().describe('The path to the file that was read'),
        content: z.string().describe('The content of the file'),
        numLines: z
          .number()
          .describe('Number of lines in the returned content'),
        startLine: z.number().describe('The starting line number'),
        totalLines: z.number().describe('Total number of lines in the file'),
      }),
    }),
    z.object({
      type: z.literal('image'),
      file: z.object({
        base64: z.string().describe('Base64-encoded image data'),
        type: imageMediaTypes.describe('The MIME type of the image'),
        originalSize: z.number().describe('Original file size in bytes'),
        dimensions: z
          .object({
            originalWidth: z.number().optional(),
            originalHeight: z.number().optional(),
            displayWidth: z.number().optional(),
            displayHeight: z.number().optional(),
          })
          .optional()
          .describe('Image dimension info for coordinate mapping'),
      }),
    }),
    z.object({
      type: z.literal('notebook'),
      file: z.object({
        filePath: z.string().describe('The path to the notebook file'),
        cells: z.array(z.any()).describe('Array of notebook cells'),
      }),
    }),
    z.object({
      type: z.literal('pdf'),
      file: z.object({
        filePath: z.string().describe('The path to the PDF file'),
        base64: z.string().describe('Base64-encoded PDF data'),
        originalSize: z.number().describe('Original file size in bytes'),
      }),
    }),
    z.object({
      type: z.literal('parts'),
      file: z.object({
        filePath: z.string().describe('The path to the PDF file'),
        originalSize: z.number().describe('Original file size in bytes'),
        count: z.number().describe('Number of pages extracted'),
        outputDir: z
          .string()
          .describe('Directory containing extracted page images'),
      }),
    }),
    z.object({
      type: z.literal('file_unchanged'),
      file: z.object({
        filePath: z.string().describe('The path to the file'),
      }),
    }),
  ])
})
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// ---------------------------------------------------------------------------
// 工具定义
// ---------------------------------------------------------------------------

export const FileReadTool = buildTool({
  name: FILE_READ_TOOL_NAME, // 读取文件工具名称
  searchHint: 'read files, images, PDFs, notebooks', // 搜索提示
  // 输出受 maxTokens 约束（validateContentTokens），不应持久化
  maxResultSizeChars: Infinity, // 最大输出字符数
  strict: true, // 严格模式
  async description() {
    return DESCRIPTION // 读取文件工具描述
  },
  async prompt() {
    const limits = getDefaultFileReadingLimits()
    const maxSizeInstruction = limits.includeMaxSizeInPrompt
      ? `. Files larger than ${formatFileSize(limits.maxSizeBytes)} will return an error; use offset and limit for larger files`
      : ''
    const offsetInstruction = limits.targetedRangeNudge
      ? OFFSET_INSTRUCTION_TARGETED
      : OFFSET_INSTRUCTION_DEFAULT
    return renderPromptTemplate(
      pickLineFormatInstruction(),
      maxSizeInstruction,
      offsetInstruction,
    )
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName: () => 'Read',
  getToolUseSummary(input: Partial<Input> | undefined): string | null {
    if (!input?.file_path) return null
    return input.file_path
  },
  getActivityDescription(input: Partial<Input> | undefined) {
    const summary = input?.file_path ?? null
    return summary ? `Reading ${summary}` : 'Reading file'
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  // 自动分类输入：返回文件路径
  toAutoClassifierInput(input) {
    return input.file_path
  },
  isSearchOrReadCommand() {
    return { isSearch: false, isRead: true }
  },
  getPath({ file_path }): string {
    return file_path || getCwd()
  },
  // 后填充可观察输入：扩展路径 ~ 或相对路径
  backfillObservableInput(input) {
    // hooks.mdx 文档 file_path 为绝对路径；扩展以防止 hook allowlist 通过 ~ 或相对路径绕过
    if (typeof input.file_path === 'string') {
      input.file_path = expandPath(input.file_path)
    }
  },
  // 准备权限匹配器
  async preparePermissionMatcher({ file_path }) {
    return pattern => matchWildcardPattern(pattern, file_path)
  },
  async checkPermissions(input, _context): Promise<PermissionResult> {
    // TODO: 完整权限检查，当前简化为允许
    return { behavior: 'allow', updatedInput: input }
  },
  // UI 渲染函数：工具使用消息
  renderToolUseMessage(
    { file_path }: Partial<Input>,
    _options: { verbose: boolean },
  ) {
    if (!file_path) return null
    return file_path
  },
  renderToolUseTag() {
    return null
  },
  // UI 渲染函数：工具结果消息
  renderToolResultMessage(output: Output) {
    switch (output.type) {
      case 'text': {
        const { numLines } = output.file
        return `Read ${numLines} ${numLines === 1 ? 'line' : 'lines'}`
      }
      case 'image':
        return `Read image (${formatFileSize(output.file.originalSize)})`
      case 'notebook':
        return `Read ${output.file.cells?.length ?? 0} cells`
      case 'pdf':
        return `Read PDF (${formatFileSize(output.file.originalSize)})`
      case 'parts':
        return `Read ${output.file.count} pages`
      case 'file_unchanged':
        return 'Unchanged since last read'
    }
  },
  extractSearchText() {
    // UI 只展示摘要（行数/大小），不展示内容本身，无需索引
    return ''
  },
  // UI 渲染函数：工具错误消息
  renderToolUseErrorMessage() {
    return 'Error reading file'
  },
  // 校验输入：检查文件路径是否存在
  async validateInput({ file_path, pages }, toolUseContext: ToolUseContext) {
    // TODO: pages 参数校验（parsePDFPageRange）待 pdfUtils 实现后补齐

    // 路径扩展 + deny rule 检查（无 I/O）
    const fullFilePath = expandPath(file_path)

    const appState = toolUseContext.getAppState()
    // TODO: matchingRuleForInput 完整实现待权限系统补齐后启用
    // const denyRule = matchingRuleForInput(fullFilePath, appState.toolPermissionContext, 'read', 'deny')
    // if (denyRule !== null) {
    //   return { result: false, message: 'File is in a directory that is denied by your permission settings.', errorCode: 1 }
    // }

    // 安全：UNC 路径检查（无 I/O）— 用户授权后再执行文件操作，防止 NTLM 凭证泄露
    const isUncPath =
      fullFilePath.startsWith('\\\\') || fullFilePath.startsWith('//')
    if (isUncPath) {
      return { result: true }
    }

    // 二进制扩展检查（仅扩展名字符串，无 I/O）
    // PDF、图片、SVG 除外 — 本工具原生渲染
    const ext = path.extname(fullFilePath).toLowerCase()
    if (
      // 检查文件扩展名是否为二进制文件
      hasBinaryExtension(fullFilePath) &&
      !IMAGE_EXTENSIONS.has(ext.slice(1))
    ) {
      return {
        result: false,
        message: `This tool cannot read binary files. The file appears to be a binary ${ext} file. Please use appropriate tools for binary file analysis.`,
        errorCode: 4,
      }
    }

    // 阻塞特定设备文件（无限输出或阻塞输入）
    if (isBlockedDevicePath(fullFilePath)) {
      return {
        result: false,
        message: `Cannot read '${file_path}': this device file would block or produce infinite output.`,
        errorCode: 9,
      }
    }

    return { result: true }
  },
  async call(
    { file_path, offset = 1, limit = undefined, pages },
    context,
    _canUseTool?,
    _parentMessage?,
  ) {
    const { readFileState, fileReadingLimits } = context
    // 从上下文获取文件读取限制
    const defaults = getDefaultFileReadingLimits()
    // 从上下文获取文件读取限制
    const maxSizeBytes =
      fileReadingLimits?.maxSizeBytes ?? defaults.maxSizeBytes
    const maxTokens = fileReadingLimits?.maxTokens ?? defaults.maxTokens

    // 文件扩展名（无点号）
    const ext = path.extname(file_path).toLowerCase().slice(1)
    // expandPath 用于一致的路径规范化（处理空白修剪和 Windows 路径分隔符）
    const fullFilePath = expandPath(file_path)

    // 去重：如果已读取相同范围且文件未修改，返回 stub 而非重发全部内容
    // 仅适用于文本/Notebook — 图片/PDF 不在 readFileState 中缓存 isPartialView表示是否为部分视图
    const existingState = (readFileState as Map<string, {
      isPartialView?: boolean
      offset?: number
      limit?: number
      timestamp: number
    }> | undefined)?.get(fullFilePath)
    if (
      existingState &&
      !existingState.isPartialView &&
      existingState.offset !== undefined
    ) {
      // 检查读取范围是否相同
      const rangeMatch =
        existingState.offset === offset && existingState.limit === limit
      if (rangeMatch) {
        try {
          const mtimeMs = await getFileModificationTimeAsync(fullFilePath)
          // 检查文件修改时间是否相同
          if (mtimeMs === existingState.timestamp) {
            // 如果文件未修改，不用重复读取，会返回告诉LLM文件未变更的提示FILE_UNCHANGED_STUB，节省token
            return {
              data: {
                type: 'file_unchanged' as const,
                file: { filePath: file_path },
              },
            }
          }
        } catch {
          // stat 失败 — 回退到完整读取
        }
      }
    }

    // TODO: 发现技能目录（discoverSkillDirsForPaths）待技能系统实现后补齐

    try {
      return await callInner(
        file_path,
        fullFilePath,
        fullFilePath,
        ext,
        offset,
        limit,
        pages,
        maxSizeBytes,
        maxTokens,
        readFileState,
        context,
      )
    } catch (error) {
      // 文件不存在时提供友好提示
      const code = getErrnoCode(error)
      if (code === 'ENOENT') {
        // macOS 截图路径可能使用窄空格或普通空格，尝试备选路径
        const altPath = getAlternateScreenshotPath(fullFilePath)
        if (altPath) {
          try {
            return await callInner(
              file_path,
              fullFilePath,
              altPath,
              ext,
              offset,
              limit,
              pages,
              maxSizeBytes,
              maxTokens,
              readFileState,
              context,
            )
          } catch (altError) {
            if (!isENOENT(altError)) {
              throw altError
            }
            // 备选路径也不存在 — 继续输出友好错误
          }
        }
        
        // 检查是否有相似文件名
        const similarFilename = findSimilarFile(fullFilePath)
        // 检查是否有当前工作目录下的相似文件名
        const cwdSuggestion = await suggestPathUnderCwd(fullFilePath)
        let message = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`
        if (cwdSuggestion) {
          message += ` Did you mean ${cwdSuggestion}?`
        } else if (similarFilename) {
          message += ` Did you mean ${similarFilename}?`
        }
        throw new Error(message)
      }
      throw error
    }
  },
  mapToolResultToToolResultBlockParam(data, toolUseID) {
    switch (data.type) {
      case 'image': {
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                data: data.file.base64,
                media_type: data.file.type,
              },
            },
          ],
        }
      }
      // TODO: notebook — mapNotebookCellsToToolResult 待 notebook.ts 实现后补齐
      case 'notebook':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: JSON.stringify(data.file.cells),
        }
      case 'pdf':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: `PDF file read: ${data.file.filePath} (${formatFileSize(data.file.originalSize)})`,
        }
      case 'parts':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: `PDF pages extracted: ${data.file.count} page(s) from ${data.file.filePath} (${formatFileSize(data.file.originalSize)})`,
        }
      case 'file_unchanged':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: FILE_UNCHANGED_STUB,
        }
      case 'text': {
        let content: string

        if (data.file.content) {
          content =
            formatFileLines(data.file) +
            (shouldIncludeFileReadMitigation()
              ? CYBER_RISK_MITIGATION_REMINDER
              : '')
        } else {
          // 空文件或偏移超出文件行数
          content =
            data.file.totalLines === 0
              ? '<system-reminder>Warning: the file exists but the contents are empty.</system-reminder>'
              : `<system-reminder>Warning: the file exists but is shorter than the provided offset (${data.file.startLine}). The file has ${data.file.totalLines} lines.</system-reminder>`
        }

        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content,
        }
      }
    }
  },
} satisfies ToolDef<InputSchema, Output>)

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function pickLineFormatInstruction(): string {
  return LINE_FORMAT_INSTRUCTION
}

function formatFileLines(file: { content: string; startLine: number }): string {
  return addLineNumbers(file)
}

/**
 * 恶意软件风险提醒 — 在读取文件内容后追加
 */
export const CYBER_RISK_MITIGATION_REMINDER =
  '\n\n<system-reminder>\nWhenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about what it is not appropriate to suggest changes.\n</system-reminder>\n'

// TODO: MITIGATION_EXEMPT_MODELS 和 shouldIncludeFileReadMitigation 待 model 工具函数实现后补齐
// 当前默认返回 true（包含风险提醒）
function shouldIncludeFileReadMitigation(): boolean {
  return true
}

// TODO: validateContentTokens — token 数量校验待 tokenEstimation 实现后补齐

// ---------------------------------------------------------------------------
// callInner — 实际文件读取逻辑
// ---------------------------------------------------------------------------

async function callInner(
  file_path: string, // 输入文件路径
  fullFilePath: string, // 完整文件路径（包含扩展名）
  resolvedFilePath: string, // 已解析文件路径（包含扩展名）
  ext: string, // 文件扩展名（无点号）
  offset: number, // 读取偏移量（行号）
  limit: number | undefined, // 最大读取行数（行号）
  pages: string | undefined, // PDF 页面范围（无默认值）
  maxSizeBytes: number, // 最大文件大小
  maxTokens: number, // 最大输出 token 数
  readFileState: ToolUseContext['readFileState'], // 文件读取状态缓存
  context: ToolUseContext, // 工具调用上下文
): Promise<{
  data: Output
  newMessages?: (UserMessage | AssistantMessage | AttachmentMessage | SystemMessage)[]
}> {
  // --- Notebook ---
  if (ext === 'ipynb') {
    // TODO: Notebook 读取（readNotebook）待 notebook.ts 实现后补齐
    throw new Error('Notebook reading is not yet implemented')
  }

  // --- Image ---
  if (IMAGE_EXTENSIONS.has(ext)) {
    // TODO: 图片读取（readImageWithTokenBudget）待 imageResizer 实现后补齐
    throw new Error('Image reading is not yet implemented')
  }

  // --- PDF ---
  if (ext === 'pdf') {
    // TODO: PDF 读取（extractPDFPages/readPDF）待 pdfUtils 实现后补齐
    throw new Error('PDF reading is not yet implemented')
  }

  // --- 文本文件（通过 readFileInRange 异步读取）---
  const lineOffset = offset === 0 ? 0 : offset - 1
  const { content, lineCount, totalLines, totalBytes, readBytes, mtimeMs } =
    await readFileInRange(
      resolvedFilePath, // 输入路径（包含扩展名）
      lineOffset, // 读取偏移量（行号）
      limit, // 最大读取行数（行号）
      limit === undefined ? maxSizeBytes : undefined, // 截断字节数
      // 取消信号
      context.abortController.signal,
    )

  // TODO: validateContentTokens 待 tokenEstimation 实现后补齐

  // 更新 readFileState（去重用）
  const stateMap = readFileState as Map<string, {
    content: string // 选中的行内容
    timestamp: number // 文件修改时间时间戳
    offset: number // 读取偏移量（行号）
    limit: number | undefined // 最大读取行数（行号）
  }>
  if (stateMap && stateMap instanceof Map) {
    stateMap.set(fullFilePath, {
      content,
      timestamp: Math.floor(mtimeMs),
      offset,
      limit,
    })
  }

  // 通知文件读取监听器
  // 快照后遍历 — 防止监听器在回调中取消订阅导致跳过后续监听器
  for (const listener of fileReadListeners.slice()) {
    listener(resolvedFilePath, content)
  }

  const data = {
    type: 'text' as const,
    file: {
      filePath: file_path,
      content,
      numLines: lineCount,
      startLine: offset,
      totalLines,
    },
  }

  // TODO: logFileOperation 待 fileOperationAnalytics 实现后补齐
  // TODO: detectSessionFileType + logEvent 待 analytics 实现后补齐

  return { data }
}
