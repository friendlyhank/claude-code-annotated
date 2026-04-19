/**
 * FileWriteTool - 文件写入工具
 *
 * 设计原因：
 * 1. 全量写入：覆盖文件全部内容，用于创建新文件或完全重写
 * 2. 先验证后执行：validateInput 检查前置条件（密钥检测、deny 规则、先读后写、修改时间），
 *    call 执行原子读写
 * 3. 防冲突：检测文件在读后被修改，避免覆盖用户更改
 * 4. 内容替换不重写行尾：模型发送的 content 包含明确的行尾，不应被旧文件的行尾风格覆盖
 *
 * 今日最小闭环：validateInput + call 主链路 + mapToolResultToToolResultBlockParam
 */

import { dirname, sep } from 'path'
import { z } from 'zod/v4'
import type { ToolUseContext } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { getPatchForDisplay } from '../../utils/diff.js'
import { isENOENT } from '../../utils/errors.js'
import {
  getFileModificationTime, // 获取文件修改时间
  writeTextContent, // 写入文本内容
} from '../../utils/file.js'
import { readFileSyncWithMetadata } from '../../utils/fileRead.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath } from '../../utils/path.js'
import {
  checkWritePermissionForTool, // 检查写入权限
  matchingRuleForInput, // 匹配输入规则
} from '../../utils/permissions/filesystem.js'
import type { PermissionDecision } from '../../types/permissions.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import { FILE_UNEXPECTEDLY_MODIFIED_ERROR } from '../FileEditTool/constants.js'
import { hunkSchema, gitDiffSchema } from '../FileEditTool/types.js'
import { FILE_WRITE_TOOL_NAME, getWriteToolDescription } from './prompt.js'

// ============================================================================
// Schema 定义
// ============================================================================

const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z
      .string()
      .describe(
        'The absolute path to the file to write (must be absolute, not relative)',
      ),
    content: z.string().describe('The content to write to the file'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['create', 'update'])
      .describe(
        'Whether a new file was created or an existing file was updated',
      ),
    filePath: z.string().describe('The path to the file that was written'),
    content: z.string().describe('The content that was written to the file'),
    structuredPatch: z
      .array(hunkSchema())
      .describe('Diff patch showing the changes'),
    originalFile: z
      .string()
      .nullable()
      .describe(
        'The original file content before the write (null for new files)',
      ),
    gitDiff: gitDiffSchema().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>
export type FileWriteToolInput = InputSchema

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 用户面向名称
 * 对齐上游实现：plan 文件显示 'Updated plan'，其他显示 'Write'
 * TODO: getPlansDirectory 待 plans 模块实现后补齐
 */
function userFacingName(
  input: Partial<{ file_path: string; content: string }> | undefined,
): string {
  // TODO: 检查 plan 文件路径
  // if (input?.file_path?.startsWith(getPlansDirectory())) {
  //   return 'Updated plan'
  // }
  return 'Write'
}

/**
 * 工具使用摘要
 * 对齐上游实现：返回文件路径的简短展示形式
 * TODO: getDisplayPath 待 file.ts 补齐后替换
 */
function getToolUseSummary(
  input: Partial<{ file_path: string; content: string }> | undefined,
): string | null {
  if (!input?.file_path) {
    return null
  }
  // 简单展示路径：取最后一段
  const parts = input.file_path.split('/')
  return parts[parts.length - 1] || input.file_path
}

// ============================================================================
// FileWriteTool 定义
// ============================================================================

export const FileWriteTool = buildTool({
  name: FILE_WRITE_TOOL_NAME,
  searchHint: 'create or overwrite files',// 创建或覆盖文件
  maxResultSizeChars: 100_000, // 最大结果大小，单位字符
  strict: true, // 严格模式，拒绝无效输入
  async description() {
    return 'Write a file to the local filesystem.'
  },
  userFacingName, // 用户面向名称
  getToolUseSummary, // 工具使用摘要
  getActivityDescription(input) { // 活动描述
    const summary = getToolUseSummary(input)
    return summary ? `Writing ${summary}` : 'Writing file'
  },
  async prompt() {
    return getWriteToolDescription()
  },
  // TODO: renderToolUseMessage 等 UI 渲染函数待 TUI 层实现后补齐
  renderToolUseMessage() {
    return null
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  // 自动分类输入
  toAutoClassifierInput(input) {
    return `${input.file_path}: ${input.content}`
  },
  getPath(input): string {
    return input.file_path
  },
  // 后填充可观察输入
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
  async checkPermissions(input, context): Promise<PermissionDecision> {
    const appState = context.getAppState()
    return checkWritePermissionForTool(
      FileWriteTool,
      input,
      (appState as { toolPermissionContext: import('../../types/permissions.js').ToolPermissionContext }).toolPermissionContext,
    )
  },
  extractSearchText() {
    // 对齐上游实现：transcript 渲染显示 content（create 模式）或 diff（update 模式）
    // 'content' 索引键在 update 模式下会索引不显示的原始内容——虚幻
    // tool_use 已经索引了 file_path，此处返回空
    return ''
  },
  async validateInput({ file_path, content }, toolUseContext: ToolUseContext) {
    const fullFilePath = expandPath(file_path)

    // TODO: checkTeamMemSecrets 待 teamMemorySync 模块实现后补齐
    // 对齐上游实现：拒绝向团队记忆文件中写入密钥

    // 检查 deny 规则
    const appState = toolUseContext.getAppState()
    const denyRule = matchingRuleForInput(
      fullFilePath,
      (appState as { toolPermissionContext: import('../../types/permissions.js').ToolPermissionContext }).toolPermissionContext,
      'edit',
      'deny',
    )
    if (denyRule !== null) {
      return {
        result: false,
        message:
          'File is in a directory that is denied by your permission settings.',
        errorCode: 1,
      }
    }

    // UNC 路径安全检查
    // 对齐上游实现：Windows UNC 路径触发 SMB 认证可能泄露凭据
    if (fullFilePath.startsWith('\\\\') || fullFilePath.startsWith('//')) {
      return { result: true }
    }

    const fs = getFsImplementation()
    let fileMtimeMs: number
    try {
      const fileStat = await fs.stat(fullFilePath)
      fileMtimeMs = fileStat.mtimeMs
    } catch (e) {
      if (isENOENT(e)) {
        // 文件不存在，允许创建
        return { result: true }
      }
      throw e
    }

    // 文件存在，检查是否已读取
    const readFileState = (toolUseContext as { readFileState?: Map<string, { timestamp: number; isPartialView?: boolean; content?: string; offset?: number; limit?: number }> }).readFileState
    const readTimestamp = readFileState?.get(fullFilePath)
    if (!readTimestamp || readTimestamp.isPartialView) {
      return {
        result: false,
        message:
          'File has not been read yet. Read it first before writing to it.',
        errorCode: 2,
      }
    }

    // 对齐上游实现：复用上面的 stat mtime，避免冗余 statSync
    const lastWriteTime = Math.floor(fileMtimeMs)
    if (lastWriteTime > readTimestamp.timestamp) {
      return {
        result: false,
        message:
          'File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.',
        errorCode: 3,
      }
    }

    return { result: true }
  },
  async call(
    { file_path, content },
    { readFileState, updateFileHistoryState, dynamicSkillDirTriggers },
    _,
    parentMessage,
  ) {
    const fullFilePath = expandPath(file_path)
    const dir = dirname(fullFilePath)

    // TODO: discoverSkillDirsForPaths / addSkillDirectories / activateConditionalSkillsForPaths
    // 对齐上游实现：发现并激活与写入路径关联的技能，当前跳过

    // TODO: diagnosticTracker.beforeFileEdited 待 LSP 模块实现后补齐
    // 对齐上游实现：在文件写入前通知诊断追踪器

    // 确保父目录存在
    // 对齐上游实现：必须在临界区外执行，await 之间的 yield 会让并发编辑交错
    // 必须在 writeTextContent 之前，否则 ENOENT 会触发虚假错误
    await getFsImplementation().mkdir(dir)

    // TODO: fileHistoryTrackEdit 待 fileHistory 模块实现后补齐
    // 对齐上游实现：备份编辑前内容，支持撤销

    // 加载当前状态并确认文件在读后未被修改
    // 对齐上游实现：请避免在此处和写入磁盘之间添加异步操作，以保持原子性
    let meta: ReturnType<typeof readFileSyncWithMetadata> | null
    try {
      meta = readFileSyncWithMetadata(fullFilePath)
    } catch (e) {
      if (isENOENT(e)) {
        meta = null
      } else {
        throw e
      }
    }

    // 检查文件是否在读取后被修改
    if (meta !== null) {
      const lastWriteTime = getFileModificationTime(fullFilePath)
      const readFileStateMap = readFileState as Map<string, { timestamp: number; isPartialView?: boolean; content?: string; offset?: number; limit?: number }> | undefined
      const lastRead = readFileStateMap?.get(fullFilePath)
      // 检查文件是否在读取后被修改
      if (!lastRead || lastWriteTime > lastRead.timestamp) {
        // 对齐上游实现：Windows 时间戳可能因云同步/杀毒变化但内容未变
        // 对于完整读取，用内容比较兜底避免误判
        const isFullRead =
          lastRead &&
          lastRead.offset === undefined &&
          lastRead.limit === undefined
        // meta.content 是 CRLF 规范化后的，与 readFileState 中规范化形式一致
        if (!isFullRead || meta.content !== lastRead.content) {
          throw new Error(FILE_UNEXPECTEDLY_MODIFIED_ERROR)
        }
      }
    }

    const enc = meta?.encoding ?? 'utf8'
    const oldContent = meta?.content ?? null

    // 写入是全量内容替换
    // 对齐上游实现：模型在 content 中发送了明确的行尾，不应重写
    // 之前保留旧文件行尾（或用 ripgrep 采样仓库）会在 Linux 上覆盖 CRLF 文件时
    // 产生 \r 损坏，或当 cwd 中的二进制文件污染了仓库采样时出错
    writeTextContent(fullFilePath, content, enc, 'LF')

    // TODO: LSP 通知（clearDeliveredDiagnosticsForFile, lspManager.changeFile, lspManager.saveFile）
    // 对齐上游实现：通知 LSP 服务器文件已修改和保存

    // TODO: notifyVscodeFileUpdated 待 MCP 模块实现后补齐
    // 对齐上游实现：通知 VSCode 文件变更以更新 diff 视图

    // 更新读取时间戳，使后续写入不误判为过期
    if (readFileState && readFileState instanceof Map) {
      readFileState.set(fullFilePath, {
        content,
        timestamp: getFileModificationTime(fullFilePath),
        offset: undefined,
        limit: undefined,
      } as { timestamp: number; content: string; offset: undefined; limit: undefined; isPartialView?: boolean })
    }

    // TODO: 日志事件（logEvent for CLAUDE.md、countLinesChanged、logFileOperation）
    // 对齐上游实现：写入 CLAUDE.md 时记录事件，统计行变更，记录文件操作

    // TODO: git diff 计算（fetchSingleFileGitDiff）待 gitDiff 模块实现后补齐

    if (oldContent) {
      // 更新现有文件
      const patch = getPatchForDisplay({
        filePath: file_path,
        fileContents: oldContent,
        edits: [
          {
            old_string: oldContent,
            new_string: content,
            replace_all: false,
          },
        ],
      })

      const data = {
        type: 'update' as const,
        filePath: file_path,
        content,
        structuredPatch: patch,
        originalFile: oldContent,
      }

      // TODO: countLinesChanged(patch) 待 diff 模块完整实现后补齐
      // TODO: logFileOperation 待 analytics 模块实现后补齐

      return {
        data,
      }
    }

    // 创建新文件
    const data = {
      type: 'create' as const,
      filePath: file_path,
      content,
      structuredPatch: [],
      originalFile: null,
    }

    // TODO: countLinesChanged([], content) 待 diff 模块完整实现后补齐
    // TODO: logFileOperation 待 analytics 模块实现后补齐

    return {
      data,
    }
  },
  mapToolResultToToolResultBlockParam({ filePath, type }, toolUseID) {
    switch (type) {
      case 'create':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: `File created successfully at: ${filePath}`,
        }
      case 'update':
        return {
          tool_use_id: toolUseID,
          type: 'tool_result',
          content: `The file ${filePath} has been updated successfully.`,
        }
    }
  },
} satisfies ToolDef<InputSchema, Output>)
