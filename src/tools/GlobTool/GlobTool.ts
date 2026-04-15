/**
 * GlobTool - 文件名模式匹配工具
 *
 * 对齐上游实现：按 claude-code/src/tools/GlobTool/GlobTool.ts 原样复刻
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

function getToolUseSummary(
  input: Partial<{ pattern: string; path: string }> | undefined,
): string | null {
  if (!input?.pattern) return null
  // TODO: 接入 truncate 和 TOOL_SUMMARY_MAX_LENGTH
  if (input.pattern.length > 80) return input.pattern.slice(0, 77) + '...'
  return input.pattern
}

// ============================================================================
// Schema 定义
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
      .describe('Time taken to execute the search in milliseconds'),
    numFiles: z.number().describe('Total number of files found'),
    filenames: z
      .array(z.string())
      .describe('Array of file paths that match the pattern'),
    truncated: z
      .boolean()
      .describe('Whether results were truncated (limited to 100 files)'),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// ============================================================================
// GlobTool 定义
// ============================================================================

export const GlobTool = buildTool({
  name: GLOB_TOOL_NAME,
  searchHint: 'find files by name pattern or wildcard',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  userFacingName,
  getToolUseSummary,
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
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return input.pattern
  },
  isSearchOrReadCommand() {
    return { isSearch: true, isRead: false }
  },
  getPath({ path }): string {
    return path ? expandPath(path) : getCwd()
  },
  async preparePermissionMatcher({ pattern }) {
    return rulePattern => matchWildcardPattern(rulePattern, pattern)
  },
  async validateInput({ path }): Promise<ValidationResult> {
    // 边界处理：路径验证——目录必须存在
    if (path) {
      const fs = getFsImplementation()
      const absolutePath = expandPath(path)

      // 安全检查：跳过 UNC 路径的文件系统操作，防止 NTLM 凭据泄露
      // 对齐上游实现：按源码原样复刻此安全检查
      if (absolutePath.startsWith('\\\\') || absolutePath.startsWith('//')) {
        return { result: true }
      }

      let stats
      try {
        stats = await fs.stat(absolutePath)
      } catch (e: unknown) {
        if (isENOENT(e)) {
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
  renderToolUseMessage,
  // TODO: renderToolUseErrorMessage 待 UI.tsx 实现
  // TODO: renderToolResultMessage 待 UI.tsx 实现（复用 GrepTool 的渲染）
  // 对齐上游实现：GlobTool.renderToolResultMessage 复用 GrepTool.renderToolResultMessage
  extractSearchText({ filenames }) {
    return filenames.join('\n')
  },
  async call(input, { abortController, getAppState, globLimits }) {
    const start = Date.now()
    const appState = getAppState() as { toolPermissionContext: ToolPermissionContext }
    const limit = globLimits?.maxResults ?? 100
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
  mapToolResultToToolResultBlockParam(output, toolUseID) {
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
