/**
 * GlobTool - 文件名模式匹配工具
 *
 * 设计原因：
 * 1. 只读、并发安全的搜索工具
 * 2. 基于ripgrep实现，支持glob模式匹配
 * 3. 结果按修改时间排序，最多返回100个文件
 * 4. 路径自动相对化以节省token
 */

import { z } from 'zod/v4'
import type { ValidationResult } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { isENOENT } from '../../utils/errors.js'
import {
  FILE_NOT_FOUND_CWD_NOTE, 
  suggestPathUnderCwd, 
} from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { glob } from '../../utils/glob.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath, toRelativePath } from '../../utils/path.js'
import { checkReadPermissionForTool } from '../../utils/permissions/filesystem.js'
import type { PermissionResult, ToolPermissionContext } from '../../types/permissions.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import { DESCRIPTION, GLOB_TOOL_NAME } from './prompt.js'
// TODO: UI 渲染函数待实现，先用内联占位
// import {
//   getToolUseSummary,
//   renderToolResultMessage,
//   renderToolUseErrorMessage,
//   renderToolUseMessage,
//   userFacingName,
// } from './UI.js'

// ============================================================================
// 内联占位：UI 渲染函数
// 对齐上游实现：按 claude-code/src/tools/GlobTool/UI.tsx 原样复刻
// TODO: 待 React 组件依赖就绪后替换为真实 UI.tsx
// ============================================================================

function userFacingName(): string {
  return 'Search'
}

// UI 渲染函数：工具使用消息
function renderToolUseMessage(
  { pattern, path }: Partial<{ pattern: string; path: string }>,
  _options: { verbose: boolean },
): null {
  // 对齐上游实现：无 pattern 时返回 null
  if (!pattern) return null
  if (!path) return null
  // TODO: 真实实现返回 React 节点
  return null
}

// UI 渲染函数：工具使用摘要
function getToolUseSummary(
  input: Partial<{ pattern: string; path: string }> | undefined,
): string | null {
  if (!input?.pattern) return null
  // TODO: 接入 truncate 和 TOOL_SUMMARY_MAX_LENGTH
  if (input.pattern.length > 80) return input.pattern.slice(0, 77) + '...'
  return input.pattern
}

// ============================================================================
// Schema 定义 重要的glob工具提示词文本
// ============================================================================

const inputSchema = lazySchema(() =>
  z.strictObject({
    pattern: z.string().describe('The glob pattern to match files against'),
    path: z
      .string()
      .optional()
      .describe(
        'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.',
      ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    durationMs: z
      .number()
      .describe('Time taken to execute the search in milliseconds'),  // 搜索耗时
    numFiles: z.number().describe('Total number of files found'),  // 总文件数
    filenames: z
      .array(z.string())
      .describe('Array of file paths that match the pattern'),  // 匹配文件路径数组
    truncated: z
      .boolean()
      .describe('Whether results were truncated (limited to 100 files)'),  // 是否截断（最多返回100个文件）
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// ============================================================================
// GlobTool 定义
// ============================================================================

export const GlobTool = buildTool({
  name: GLOB_TOOL_NAME, // 工具名称
  searchHint: 'find files by name pattern or wildcard', // 搜索提示
  maxResultSizeChars: 100_000, // 最大结果大小（字符数）
  async description() {
    return DESCRIPTION
  },
  userFacingName, // 用户可见名称
  getToolUseSummary, // 工具使用摘要
  getActivityDescription(input) {
    const summary = getToolUseSummary(input)
    return summary ? `Finding ${summary}` : 'Finding files'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isConcurrencySafe() { // 是否并发安全
    return true
  },
  isReadOnly() { // 是否只读
    return true
  },
  toAutoClassifierInput(input) { // 自动分类输入
    return input.pattern
  },
  isSearchOrReadCommand() { // 是否搜索或读取命令
    return { isSearch: true, isRead: false }
  },
  getPath({ path }): string { // 获取路径
    return path ? expandPath(path) : getCwd()
  },
  async preparePermissionMatcher({ pattern }) { // 准备权限匹配器
    return rulePattern => matchWildcardPattern(rulePattern, pattern)
  },
  async validateInput({ path }): Promise<ValidationResult> { // 验证输入
    // 边界处理：路径验证——目录必须存在
    if (path) {
      const fs = getFsImplementation() // 获取文件系统实现
      const absolutePath = expandPath(path) // 展开路径

      // 安全检查：跳过 UNC 路径的文件系统操作，防止 NTLM 凭据泄露
      if (absolutePath.startsWith('\\\\') || absolutePath.startsWith('//')) {
        return { result: true }
      }

      let stats
      try {
        stats = await fs.stat(absolutePath)
      } catch (e: unknown) {
        // 处理文件不存在错误
        if (isENOENT(e)) {
          // 处理文件不存在错误，提供当前工作目录下的建议路径
          const cwdSuggestion = await suggestPathUnderCwd(absolutePath)
          let message = `Directory does not exist: ${path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`
          if (cwdSuggestion) {
            message += ` Did you mean ${cwdSuggestion}?`
          }
          return {
            result: false,
            message,
            errorCode: 1,
          }
        }
        throw e
      }

      if (!stats.isDirectory()) {
        return {
          result: false,
          message: `Path is not a directory: ${path}`,
          errorCode: 2,
        }
      }
    }

    return { result: true }
  },
  async checkPermissions(input, context): Promise<PermissionResult> {
    const appState = context.getAppState() as { toolPermissionContext: ToolPermissionContext }
    return checkReadPermissionForTool(
      GlobTool,
      input,
      appState.toolPermissionContext,
    )
  },
  async prompt() {
    return DESCRIPTION
  },
  renderToolUseMessage, // 渲染工具使用消息
  // TODO: renderToolUseErrorMessage 待 UI.tsx 实现
  // TODO: renderToolResultMessage 待 UI.tsx 实现（复用 GrepTool 的渲染）
  // 对齐上游实现：GlobTool.renderToolResultMessage 复用 GrepTool.renderToolResultMessage
  extractSearchText({ filenames }) { // 提取搜索文本
    return filenames.join('\n') // 搜索文本为匹配文件路径数组，每个路径占一行
  },
  // 调用工具
  async call(input, { abortController, getAppState, globLimits }) {
    const start = Date.now()
    const appState = getAppState() as { toolPermissionContext: ToolPermissionContext }
    const limit = globLimits?.maxResults ?? 100 // 最大结果数
    const { files, truncated } = await glob(
      input.pattern,
      GlobTool.getPath?.(input) ?? getCwd(),
      { limit, offset: 0 },
      abortController.signal,
      appState.toolPermissionContext,
    )
    // 对齐上游实现：路径相对化以节省 token（与 GrepTool 一致）
    const filenames = files.map(toRelativePath)
    const output: Output = {
      filenames,
      durationMs: Date.now() - start,
      numFiles: filenames.length,
      truncated,
    }
    return {
      data: output,
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) { // 映射工具结果为工具结果块参数
    // 边界处理：无匹配文件时返回简单提示
    if (output.filenames.length === 0) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: 'No files found',
      }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        ...output.filenames,
        ...(output.truncated
          ? [
              '(Results are truncated. Consider using a more specific path or pattern.)',
            ]
          : []),
      ].join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
