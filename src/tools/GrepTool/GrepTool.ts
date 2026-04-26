/**
 * GrepTool - 文件内容搜索工具
 *
 * 对齐上游实现：按 claude-code/src/tools/GrepTool/GrepTool.ts 原样复刻
 * 当前为简化实现：仅包含核心功能
 * TODO: 完整实现待后续补齐
 */

import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import type { ValidationResult, ToolResult, ToolUseContext } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { isENOENT } from '../../utils/errors.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath, toRelativePath } from '../../utils/path.js'
import { checkReadPermissionForTool } from '../../utils/permissions/filesystem.js'
import type { PermissionDecision, ToolPermissionContext } from '../../types/permissions.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import { ripGrep } from '../../utils/ripgrep.js'
import { plural } from '../../utils/stringUtils.js'
import { GREP_TOOL_NAME, getDescription } from './prompt.js'
import { renderToolUseMessage, renderToolResultMessage, renderToolUseErrorMessage } from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    pattern: z.string().describe('The regular expression pattern to search for'),
    path: z.string().optional().describe('Directory to search in'),
    output_mode: z.enum(['content', 'files_with_matches', 'count']).optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const VCS_DIRECTORIES_TO_EXCLUDE = ['.git', '.svn', '.hg', '.bzr', '.jj', '.sl'] as const
const DEFAULT_HEAD_LIMIT = 250

const outputSchema = lazySchema(() =>
  z.object({
    mode: z.enum(['content', 'files_with_matches', 'count']).optional(),
    numFiles: z.number(),
    filenames: z.array(z.string()),
    content: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const GrepTool = buildTool({
  name: GREP_TOOL_NAME,
  searchHint: 'search file contents with regex (ripgrep)',
  maxResultSizeChars: 20_000,
  strict: true,
  async description(_input, _options) {
    return getDescription()
  },
  userFacingName(_input) {
    return 'Search'
  },
  getToolUseSummary(input) {
    if (!input?.pattern) return null
    return input.pattern.length > 80 ? input.pattern.slice(0, 77) + '...' : input.pattern
  },
  getActivityDescription(input) {
    const summary = this.getToolUseSummary?.(input)
    return summary ? `Searching for ${summary}` : 'Searching'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isConcurrencySafe(_input) {
    return true
  },
  isReadOnly(_input) {
    return true
  },
  toAutoClassifierInput(input) {
    return input.path ? `${input.pattern} in ${input.path}` : input.pattern
  },
  isSearchOrReadCommand(_input) {
    return { isSearch: true, isRead: false }
  },
  getPath({ path }): string {
    return path || getCwd()
  },
  async preparePermissionMatcher({ pattern }) {
    return rulePattern => matchWildcardPattern(rulePattern, pattern)
  },
  async validateInput({ path }, _context): Promise<ValidationResult> {
    if (path) {
      const fs = getFsImplementation()
      const absolutePath = expandPath(path)
      if (absolutePath.startsWith('\\\\') || absolutePath.startsWith('//')) {
        return { result: true }
      }
      try {
        await fs.stat(absolutePath)
      } catch (e: unknown) {
        if (isENOENT(e)) {
          return { result: false, message: `Path does not exist: ${path}`, errorCode: 1 }
        }
        throw e
      }
    }
    return { result: true }
  },
  async checkPermissions(input, context): Promise<PermissionDecision> {
    const appState = context.getAppState() as { toolPermissionContext: ToolPermissionContext }
    return checkReadPermissionForTool(GrepTool, input, appState.toolPermissionContext)
  },
  async prompt(_options) {
    return getDescription()
  },
  renderToolUseMessage,
  renderToolUseErrorMessage,
  renderToolResultMessage,
  extractSearchText({ mode, content, filenames }) {
    if (mode === 'content' && content) return content
    return filenames.join('\n')
  },
  mapToolResultToToolResultBlockParam({ mode = 'files_with_matches', numFiles, filenames, content }, toolUseID): ToolResultBlockParam {
    if (mode === 'content') {
      return { tool_use_id: toolUseID, type: 'tool_result', content: content || 'No matches found' }
    }
    if (numFiles === 0) {
      return { tool_use_id: toolUseID, type: 'tool_result', content: 'No files found' }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Found ${numFiles} ${plural(numFiles, 'file')}\n${filenames.join('\n')}`,
    }
  },
  async call({ pattern, path, output_mode = 'files_with_matches' }, context, _canUseTool, _parentMessage, _onProgress): Promise<ToolResult<Output>> {
    const absolutePath = path ? expandPath(path) : getCwd()
    const args = ['--hidden']

    for (const dir of VCS_DIRECTORIES_TO_EXCLUDE) {
      args.push('--glob', `!${dir}`)
    }
    args.push('--max-columns', '500')

    if (output_mode === 'files_with_matches') {
      args.push('-l')
    } else if (output_mode === 'count') {
      args.push('-c')
    } else {
      args.push('-n')
    }

    if (pattern.startsWith('-')) {
      args.push('-e', pattern)
    } else {
      args.push(pattern)
    }

    const results = await ripGrep(args, absolutePath, context.abortController.signal)

    if (output_mode === 'files_with_matches') {
      const stats = await Promise.allSettled(results.map(_ => getFsImplementation().stat(_)))
      const sortedMatches = results
        .map((_, i) => [_, stats[i]!.status === 'fulfilled' ? (stats[i]!.value as { mtimeMs: number }).mtimeMs ?? 0 : 0] as const)
        .sort((a, b) => b[1] - a[1])
        .map(_ => _[0])
        .slice(0, DEFAULT_HEAD_LIMIT)

      const relativeMatches = sortedMatches.map(toRelativePath)
      return { data: { mode: 'files_with_matches', filenames: relativeMatches, numFiles: relativeMatches.length } }
    }

    if (output_mode === 'content') {
      const limitedResults = results.slice(0, DEFAULT_HEAD_LIMIT)
      const finalLines = limitedResults.map(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const filePath = line.substring(0, colonIndex)
          const rest = line.substring(colonIndex)
          return toRelativePath(filePath) + rest
        }
        return line
      })
      return { data: { mode: 'content', content: finalLines.join('\n'), filenames: [], numFiles: 0 } }
    }

    const limitedResults = results.slice(0, DEFAULT_HEAD_LIMIT)
    return { data: { mode: 'count', content: limitedResults.join('\n'), filenames: [], numFiles: limitedResults.length } }
  },
} satisfies ToolDef<InputSchema, Output>)
