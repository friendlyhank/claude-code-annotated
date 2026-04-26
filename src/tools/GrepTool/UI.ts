/**
 * GrepTool UI 组件
 *
 * 对齐上游实现：按 claude-code/src/tools/GrepTool/UI.tsx 原样复刻
 * 当前为简化实现：仅导出必要的函数
 * TODO: 完整 React 组件待 UI 层实现后补齐
 */

import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { ProgressMessage } from '../../types/message.js'
import type { ToolProgress } from '../../Tool.js'

type Output = {
  mode?: 'content' | 'files_with_matches' | 'count'
  numFiles: number
  filenames: string[]
  content?: string
  numLines?: number
  numMatches?: number
}

export function renderToolUseMessage(
  { pattern, path }: Partial<{ pattern: string; path?: string }>,
  _options: { verbose: boolean },
): string | null {
  if (!pattern) {
    return null
  }
  const parts = [`pattern: "${pattern}"`]
  if (path) {
    parts.push(`path: "${path}"`)
  }
  return parts.join(', ')
}

export function renderToolUseErrorMessage(
  _result: ToolResultBlockParam['content'],
  _options: { verbose: boolean },
): null {
  return null
}

export function renderToolResultMessage(
  _output: Output,
  _progressMessagesForMessage: ProgressMessage<ToolProgress>[],
  _options: { verbose: boolean },
): null {
  return null
}
