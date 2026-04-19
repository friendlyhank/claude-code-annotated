/**
 * FileEditTool - 文件编辑工具
 *
 * 设计原因：
 * 1. 精确字符串替换：old_string → new_string，保证原子性
 * 2. 先验证后执行：validateInput 检查前置条件，call 执行实际编辑
 * 3. 引号规范化：LLM 输出直引号时仍能匹配文件中的弯引号
 * 4. 防冲突：检测文件在读后被修改，避免覆盖用户更改
 *
 * 今日最小闭环：call 主链路（读文件 → 查找替换 → 生成 patch → 写入）
 */

import { dirname, isAbsolute, sep } from 'path'
import type { ToolPermissionContext, PermissionResult } from '../../types/permissions.js'
import type { ToolUseContext } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { isENOENT } from '../../utils/errors.js'
import {
  FILE_NOT_FOUND_CWD_NOTE, // 未找到文件时的提示
  findSimilarFile, // 查找相似文件（按文件名）
  getFileModificationTime, // 获取文件修改时间
  suggestPathUnderCwd, // 建议文件路径（当前目录）
  writeTextContent, // 写入文本内容（覆盖写入）
} from '../../utils/file.js'
import { formatFileSize } from '../../utils/format.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { expandPath } from '../../utils/path.js'
import {
  checkReadPermissionForTool, // 检查读取权限（deny 规则优先）
  matchingRuleForInput, // 匹配输入规则（LLM 输出）
} from '../../utils/permissions/filesystem.js'
import type { PermissionDecision } from '../../types/permissions.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import {
  FILE_EDIT_TOOL_NAME, // 工具名称
  FILE_UNEXPECTEDLY_MODIFIED_ERROR, // 文件在读后被修改时的错误提示
} from './constants.js'
import { getEditToolDescription } from './prompt.js'
import {
  type FileEditInput,
  type FileEditOutput,
  inputSchema,
  outputSchema,
} from './types.js'
import {
  areFileEditsInputsEquivalent, // 检查文件编辑输入是否相等
  findActualString,
  getPatchForEdit,
  preserveQuoteStyle,
} from './utils.js'

// 文件大小上限：1 GiB
// 对齐上游实现：V8/Bun 字符串长度限制约 2^30，1 GiB 是安全的字节级防护
const MAX_EDIT_FILE_SIZE = 1024 * 1024 * 1024

// TODO: UI.tsx 渲染函数待 TUI 层实现后补齐
// 对齐上游实现：当前使用简单文本渲染
function userFacingName(
  input:
    | Partial<{
        file_path: string // 文件路径
        old_string: string // 要替换的字符串
        new_string: string // 新字符串
        replace_all: boolean // 是否替换所有匹配项
        edits: unknown[] // 文件编辑操作列表
      }>
    | undefined,
): string {
  if (!input) {
    return 'Update'
  }
  if (input.old_string === '') {
    return 'Create'
  }
  return 'Update'
}

// 对齐上游实现：当前使用简单文本渲染
function getToolUseSummary(
  input:
    | Partial<{
        file_path: string // 文件路径
        old_string: string // 要替换的字符串
        new_string: string // 新字符串
        replace_all: boolean // 是否替换所有匹配项
      }>
    | undefined,
): string | null {
  if (!input?.file_path) {
    return null
  }
  // 简单展示路径
  const parts = input.file_path.split('/')
  return parts[parts.length - 1] || input.file_path
}

// 构造文件编辑工具实例
export const FileEditTool = buildTool({
  name: FILE_EDIT_TOOL_NAME, // 工具名称
  searchHint: 'modify file contents in place', // 搜索提示
  maxResultSizeChars: 100_000, // 最大结果字符数
  strict: true, // 严格模式
  async description() {
    return 'A tool for editing files'
  },
  async prompt() {
    return getEditToolDescription()
  },
  userFacingName, // 用户可见名称
  getToolUseSummary, // 获取工具使用摘要
  getActivityDescription(input) {
    const summary = getToolUseSummary(input)
    return summary ? `Editing ${summary}` : 'Editing file'
  },
  get inputSchema() {
    return inputSchema()
  },
  get outputSchema() {
    return outputSchema()
  },
  // 转换为自动分类器输入
  toAutoClassifierInput(input) {
    return `${input.file_path}: ${input.new_string}`
  },
  getPath(input): string {
    return input.file_path
  },
  // 回填可观察输入
  backfillObservableInput(input) {
    // 对齐上游实现：hooks.mdx 文档要求 file_path 为绝对路径
    // 扩展 ~ 和相对路径，防止 hook allowlist 被绕过
    if (typeof input.file_path === 'string') {
      input.file_path = expandPath(input.file_path)
    }
  },
  // 准备权限匹配器
  async preparePermissionMatcher({ file_path }) {
    return pattern => matchWildcardPattern(pattern, file_path)
  },
  // 检查权限
  async checkPermissions(input, context): Promise<PermissionResult> {
    const appState = context.getAppState()
    return checkReadPermissionForTool(
      FileEditTool,
      input,
      (appState as { toolPermissionContext: ToolPermissionContext }).toolPermissionContext,
    )
  },
  // TODO: renderToolUseMessage 等 UI 渲染函数待 TUI 层实现后补齐
  renderToolUseMessage() {
    return null
  },
  async validateInput(input: FileEditInput, toolUseContext: ToolUseContext) {
    const { file_path, old_string, new_string, replace_all = false } = input
    const fullFilePath = expandPath(file_path)

    // TODO: checkTeamMemSecrets 待 teamMemorySync 模块实现后补齐
    // 对齐上游实现：拒绝向团队记忆文件中引入密钥的编辑

    // old_string 和 new_string 完全相同时，无需编辑
    if (old_string === new_string) {
      return {
        result: false,
        behavior: 'ask',
        message:
          'No changes to make: old_string and new_string are exactly the same.',
        errorCode: 1,
      }
    }

    // 检查 deny 规则
    const appState = toolUseContext.getAppState()
    const denyRule = matchingRuleForInput(
      fullFilePath,
      (appState as { toolPermissionContext: ToolPermissionContext }).toolPermissionContext,
      'write' as const,
      'deny',
    )
    if (denyRule !== null) {
      return {
        result: false,
        behavior: 'ask',
        message:
          'File is in a directory that is denied by your permission settings.',
        errorCode: 2,
      }
    }

    // UNC 路径安全检查
    // 对齐上游实现：Windows UNC 路径触发 SMB 认证可能泄露凭据
    if (fullFilePath.startsWith('\\\\') || fullFilePath.startsWith('//')) {
      return { result: true }
    }

    const fs = getFsImplementation()

    // 文件大小检查，防止 OOM
    try {
      const fsStat = await fs.stat(fullFilePath)
      // 获取文件大小
      const size: number = 'size' in fsStat ? (fsStat as { size: number }).size : (await (await import('fs/promises')).stat(fullFilePath)).size
      // 检查文件大小是否超过最大可编辑大小
      if (size > MAX_EDIT_FILE_SIZE) {
        return {
          result: false,
          behavior: 'ask',
          message: `File is too large to edit (${formatFileSize(size)}). Maximum editable file size is ${formatFileSize(MAX_EDIT_FILE_SIZE)}.`,
          errorCode: 10,
        }
      }
    } catch (e) {
      if (!isENOENT(e)) {
        throw e
      }
    }

    // 读取文件内容
    let fileContent: string | null
    try {
      const { readFile: readFileAsync } = await import('fs/promises')
      // 读取文件内容，处理编码问题
      const fileBuffer = await readFileAsync(fullFilePath)
      const encoding: BufferEncoding =
        fileBuffer.length >= 2 &&
        fileBuffer[0] === 0xff &&
        fileBuffer[1] === 0xfe
          ? 'utf16le'
          : 'utf8'
      fileContent = fileBuffer.toString(encoding).replaceAll('\r\n', '\n')
    } catch (e) {
      if (isENOENT(e)) {
        fileContent = null
      } else {
        throw e
      }
    }

    // 文件不存在
    if (fileContent === null) {
      // 空的 old_string 在不存在的文件上意味着创建新文件 — 合法
      if (old_string === '') {
        return { result: true }
      }
      // 检查是否存在相似文件名
      const similarFilename = findSimilarFile(fullFilePath)
      // 检查是否存在相似文件名
      const cwdSuggestion = await suggestPathUnderCwd(fullFilePath)
      let message = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`

      if (cwdSuggestion) {
        message += ` Did you mean ${cwdSuggestion}?`
      } else if (similarFilename) {
        message += ` Did you mean ${similarFilename}?`
      }

      return {
        result: false,
        behavior: 'ask',
        message,
        errorCode: 4,
      }
    }

    // 文件存在但 old_string 为空 — 仅当文件为空时合法
    if (old_string === '') {
      if (fileContent.trim() !== '') {
        return {
          result: false,
          behavior: 'ask',
          message: 'Cannot create new file - file already exists.',
          errorCode: 3,
        }
      }
      return { result: true }
    }

    // TODO: .ipynb 检查待 NotebookEditTool 常量导入后补齐
    // 对齐上游实现：Jupyter Notebook 文件应使用 NotebookEditTool 编辑

    // 文件未读取检查
    // 对齐上游实现：必须先读取文件才能编辑，防止盲目修改
    const readFileState = (toolUseContext as { readFileState?: Map<string, { timestamp: number; isPartialView?: boolean; content?: string; offset?: number; limit?: number }> }).readFileState
    // 检查文件是否已读取
    const readTimestamp = readFileState?.get(fullFilePath)
    if (!readTimestamp || readTimestamp.isPartialView) {
      return {
        result: false,
        behavior: 'ask',
        message:
          'File has not been read yet. Read it first before writing to it.',
        meta: {
          isFilePathAbsolute: String(isAbsolute(file_path)),
        },
        errorCode: 6,
      }
    }

    // 文件修改时间检查
    // 对齐上游实现：检测文件在读后被修改，防止覆盖用户更改
    if (readTimestamp) {
      // 获取文件最后修改时间
      const lastWriteTime = getFileModificationTime(fullFilePath)
      // 检查文件是否在读后被修改
      if (lastWriteTime > readTimestamp.timestamp) {
        // Windows 上时间戳可能因云同步/杀毒等变化但内容未变
        const isFullRead =
          readTimestamp.offset === undefined &&
          readTimestamp.limit === undefined
        if (isFullRead && fileContent === readTimestamp.content) {
          // 内容未变，安全继续
        } else {
          return {
            result: false,
            behavior: 'ask',
            message:
              'File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.',
            errorCode: 7,
          }
        }
      }
    }

    const file = fileContent

    // 使用 findActualString 处理引号规范化
    const actualOldString = findActualString(file, old_string)
    if (!actualOldString) {
      return {
        result: false,
        behavior: 'ask',
        message: `String to replace not found in file.\nString: ${old_string}`,
        meta: {
          isFilePathAbsolute: String(isAbsolute(file_path)),
        },
        errorCode: 8,
      }
    }

    // 如果要替换的old_string在文件中出现多次，且replace_all为false，提示用户确认是否替换所有实例
    const matches = file.split(actualOldString).length - 1

    // 多匹配但 replace_all 为 false
    if (matches > 1 && !replace_all) {
      return {
        result: false,
        behavior: 'ask',
        message: `Found ${matches} matches of the string to replace, but replace_all is false. To replace all occurrences, set replace_all to true. To replace only one occurrence, please provide more context to uniquely identify the instance.\nString: ${old_string}`,
        meta: {
          isFilePathAbsolute: String(isAbsolute(file_path)),
          actualOldString,
        },
        errorCode: 9,
      }
    }

    // TODO: validateInputForSettingsFileEdit 待 settings 模块实现后补齐
    // 对齐上游实现：对 Claude 设置文件的额外验证

    return { result: true, meta: { actualOldString } }
  },
  // 检查两个输入是否相等
  inputsEquivalent(input1, input2) {
    return areFileEditsInputsEquivalent(
      {
        file_path: input1.file_path,
        edits: [
          {
            old_string: input1.old_string,
            new_string: input1.new_string,
            replace_all: input1.replace_all ?? false,
          },
        ],
      },
      {
        file_path: input2.file_path,
        edits: [
          {
            old_string: input2.old_string,
            new_string: input2.new_string,
            replace_all: input2.replace_all ?? false,
          },
        ],
      },
    )
  },
  async call(
    input: FileEditInput, // 输入参数
    context: ToolUseContext, // 上下文参数
    _,
    parentMessage,
  ) {
    // 获取文件读取状态
    const readFileState = context.readFileState as Map<string, { timestamp: number; isPartialView?: boolean; content?: string; offset?: number; limit?: number }> | undefined
    // 获取用户是否修改了文件状态
    const userModified = (context as { userModified?: boolean }).userModified
    const { file_path, old_string, new_string, replace_all = false } = input

    // 1. 获取当前状态
    const fs = getFsImplementation()
    // 获取绝对文件路径
    const absoluteFilePath = expandPath(file_path)

    // TODO: discoverSkillDirsForPaths / addSkillDirectories / activateConditionalSkillsForPaths
    // 对齐上游实现：发现并激活与编辑路径关联的技能，当前跳过

    // TODO: diagnosticTracker.beforeFileEdited 待 LSP 模块实现后补齐
    // 对齐上游实现：在文件编辑前通知诊断追踪器

    // 确保父目录存在
    // 对齐上游实现：这些 await 必须在临界区外，防止并发编辑交错
    const { mkdir: mkdirAsync } = await import('fs/promises')
    // 确保父目录存在
    await mkdirAsync(dirname(absoluteFilePath), { recursive: true })

    // TODO: fileHistoryTrackEdit 待 fileHistory 模块实现后补齐
    // 对齐上游实现：备份编辑前内容，支持撤销

    // 2. 加载当前状态并确认文件未被修改
    // 对齐上游实现：请避免在此处和写入磁盘之间添加异步操作，以保持原子性
    const {
      content: originalFileContents,// 原始文件内容
      fileExists, // 文件是否存在
      encoding, // 文件编码
      lineEndings: endings, // 行尾符
    } = readFileForEdit(absoluteFilePath)

    // 文件存在时，检查是否被修改
    if (fileExists) {
      // 检查文件是否被修改
      const lastWriteTime = getFileModificationTime(absoluteFilePath)
      // 文件最后读取时间戳
      const lastRead = readFileState?.get(absoluteFilePath)
      // 如果文件未被读取过，或文件内容已修改
      if (!lastRead || lastWriteTime > lastRead.timestamp) {
        // Windows 时间戳可能变化但内容未变，用内容比较兜底
        const isFullRead =
          lastRead &&
          (lastRead as { offset?: number; limit?: number }).offset === undefined &&
          (lastRead as { offset?: number; limit?: number }).limit === undefined
          // 检查文件内容是否未被修改
        const contentUnchanged =
          isFullRead && originalFileContents === (lastRead as { content?: string }).content
        if (!contentUnchanged) {
          throw new Error(FILE_UNEXPECTEDLY_MODIFIED_ERROR)
        }
      }
    }

    // 3. 使用 findActualString 处理引号规范化
    const actualOldString =
      findActualString(originalFileContents, old_string) || old_string

    // 保持弯引号风格
    const actualNewString = preserveQuoteStyle(
      old_string,
      actualOldString,
      new_string,
    )

    // 4. 生成 patch
    const { patch, updatedFile } = getPatchForEdit({
      filePath: absoluteFilePath, // 文件路径
      fileContents: originalFileContents, // 原始文件内容 
      oldString: actualOldString, // 旧字符串
      newString: actualNewString, // 新字符串
      replaceAll: replace_all,// 是否替换所有实例
    })

    // 5. 写入磁盘
    writeTextContent(absoluteFilePath, updatedFile, encoding, endings)

    // TODO: LSP 通知待 LSP 模块实现后补齐
    // 对齐上游实现：通知 LSP 服务器文件已修改和保存

    // TODO: notifyVscodeFileUpdated 待 MCP 模块实现后补齐
    // 对齐上游实现：通知 VSCode 文件变更以更新 diff 视图

    // 6. 更新读取时间戳，使后续写入不误判为过期
    if (readFileState && readFileState instanceof Map) {
      readFileState.set(absoluteFilePath, {
        content: updatedFile, // 更新后文件内容
        timestamp: getFileModificationTime(absoluteFilePath), // 更新时间戳
        offset: undefined, // 未偏移量
        limit: undefined, // 未限制
      })
    }

    // TODO: 日志事件（logEvent, countLinesChanged, logFileOperation）待分析模块实现后补齐
    // TODO: git diff 计算（fetchSingleFileGitDiff）待 gitDiff 模块实现后补齐

    // 7. 返回结果
    const data = {
      filePath: file_path,
      oldString: actualOldString,
      newString: new_string,
      originalFile: originalFileContents,
      structuredPatch: patch,
      userModified: userModified ?? false,
      replaceAll: replace_all,
    }
    return {
      data,
    }
  },
  // 映射工具结果为工具调用参数
  mapToolResultToToolResultBlockParam(data: FileEditOutput, toolUseID) {
    const { filePath, userModified, replaceAll } = data
    const modifiedNote = userModified
      ? '.  The user modified your proposed changes before accepting them. '
      : ''

    if (replaceAll) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: `The file ${filePath} has been updated${modifiedNote}. All occurrences were successfully replaced.`,
      }
    }

    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `The file ${filePath} has been updated successfully${modifiedNote}.`,
    }
  },
} satisfies ToolDef<ReturnType<typeof inputSchema>, FileEditOutput>)

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 读取文件用于编辑，返回内容、编码和行尾信息
 *
 * 设计原因：
 * - 同步读取确保临界区内无 yield
 * - 保留编码和行尾信息，写入时还原
 * - 文件不存在时返回空内容和默认编码
 */
function readFileForEdit(absoluteFilePath: string): {
  content: string // 文件内容
  fileExists: boolean // 文件是否存在
  encoding: BufferEncoding // 文件编码
  lineEndings: string // 行尾符
} {
  try {
    // eslint-disable-next-line custom-rules/no-sync-fs
    const fs = require('fs')
    // 读取文件内容
    const buffer = fs.readFileSync(absoluteFilePath)

    // 检测编码：BOM 标记判断 UTF-16LE
    const encoding: BufferEncoding =
      buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe
        ? 'utf16le'
        : 'utf8'

    // 转换为字符串并替换 CRLF 为 LF，保持 LF 行尾符
    const content = buffer.toString(encoding).replaceAll('\r\n', '\n')

    // 检测行尾类型
    const rawContent = buffer.toString(encoding)
    const lineEndings = rawContent.includes('\r\n') ? 'CRLF' : 'LF'

    return {
      content, // 文件内容
      fileExists: true, // 文件是否存在
      encoding, // 文件编码
      lineEndings, // 行尾符
    }
  } catch (e) {
    if (isENOENT(e)) {
      return {
        content: '',
        fileExists: false,
        encoding: 'utf8',
        lineEndings: 'LF',
      }
    }
    throw e
  }
}
