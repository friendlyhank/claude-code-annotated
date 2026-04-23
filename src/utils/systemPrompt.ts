/**
 * System prompt builder
 *
 *
 * 功能:
 * - buildEffectiveSystemPrompt: 构建有效系统提示词
 */

import { asSystemPrompt, type SystemPrompt } from './systemPromptType.js'

export { asSystemPrompt, type SystemPrompt } from './systemPromptType.js'

/**
 * Builds the effective system prompt array based on priority:
 * 1. Agent system prompt (if mainThreadAgentDefinition is set)
 * 2. Custom system prompt (if specified via --system-prompt)
 * 3. Default system prompt (the standard Claude Code prompt)
 *
 * Plus appendSystemPrompt is always added at the end if specified.
 */
// 构建有效系统提示词
export function buildEffectiveSystemPrompt({
  mainThreadAgentDefinition, // 主线程智能定义
  toolUseContext, // 工具使用上下文
  customSystemPrompt, // 自定义系统提示词
  defaultSystemPrompt, // 默认系统提示词
  appendSystemPrompt, // 追加系统提示词
  overrideSystemPrompt, // 重写系统提示词
}: {
  mainThreadAgentDefinition: undefined
  toolUseContext: { options: { tools: unknown; debug: boolean; mainLoopModel: string; verbose: boolean; isNonInteractiveSession: boolean; commands: unknown[] } }
  customSystemPrompt: string | undefined
  defaultSystemPrompt: string[]
  appendSystemPrompt: string | undefined
  overrideSystemPrompt?: string | null
}): SystemPrompt {
  if (overrideSystemPrompt) {
    // 重写系统提示词
    return asSystemPrompt([overrideSystemPrompt])
  }

  // 主线程智能定义
  const agentSystemPrompt = mainThreadAgentDefinition
    ? undefined
    : undefined

  return asSystemPrompt([
    ...(agentSystemPrompt
      ? [agentSystemPrompt]
      : customSystemPrompt
        ? [customSystemPrompt]
        : defaultSystemPrompt),
    ...(appendSystemPrompt ? [appendSystemPrompt] : []),
  ])
}
