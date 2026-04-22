/**
 * API 请求日志记录
 *
 * 简化实现：专注于调试日志输出
 */

import type { BetaStopReason } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { logForDebugging } from '../../utils/debug.js'
import type { NonNullableUsage } from '../../entrypoints/sdk/sdkUtilityTypes.js'
import { EMPTY_USAGE } from './emptyUsage.js'
import { classifyAPIError } from './errors.js'

export type { NonNullableUsage }
export { EMPTY_USAGE }

// 全局缓存策略 tool_based, system_prompt, none
export type GlobalCacheStrategy = 'tool_based' | 'system_prompt' | 'none'

// 获取错误信息
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function logAPIQuery({
  model, // 模型名称
  messagesLength, // 消息数量
  temperature, // 温度参数
  betas, // 超参数
  querySource, // 查询来源
}: {
  model: string
  messagesLength: number
  temperature: number
  betas?: string[]
  querySource?: string
}): void {
  logForDebugging(
    `API query: model=${model}, messages=${messagesLength}, temperature=${temperature}${betas?.length ? `, betas=${betas.join(',')}` : ''}${querySource ? `, source=${querySource}` : ''}`,
    { level: 'verbose' },
  )
}

// 记录 API 错误日志
export function logAPIError({
  error, // 错误对象
  model, // 模型名称
  messageCount, // 消息数量
  durationMs, // 错误持续时间
  attempt, // 尝试次数
  requestId, // 请求ID
  status, // 状态码
}: {
  error: unknown
  model: string
  messageCount: number
  durationMs: number
  attempt: number
  requestId?: string | null
  status?: string
}): void {
  const errStr = getErrorMessage(error)
  const errorType = classifyAPIError(error)

  logForDebugging(
    `API error: model=${model}, type=${errorType}, status=${status ?? 'N/A'}, messages=${messageCount}, duration=${durationMs}ms, attempt=${attempt}${requestId ? `, requestId=${requestId}` : ''}`,
    { level: 'error' },
  )
  logForDebugging(`API error message: ${errStr}`, { level: 'error' })
}

// 记录 API 成功日志
export function logAPISuccessAndDuration({
  model, // 模型名称
  start, // 记录开始时间，用于计算持续时间
  startIncludingRetries, // 记录开始时间，用于计算包含重试的持续时间
  ttftMs, // 总时间（TTFT）毫秒
  usage, // 消耗的令牌数量
  attempt, // 尝试次数
  messageCount, // 消息数量
  requestId, // 请求ID
  stopReason, // 停止原因
  costUSD, // 成本（美元）
 }: {
  model: string
  start: number
  startIncludingRetries: number 
  ttftMs: number | null
  usage: NonNullableUsage
  attempt: number
  messageCount: number
  requestId: string | null
  stopReason: BetaStopReason | null
  costUSD: number
}): void {
  const durationMs = Date.now() - start
  const durationMsIncludingRetries = Date.now() - startIncludingRetries

  logForDebugging(
    `API success: model=${model}, messages=${messageCount}, duration=${durationMs}ms (${durationMsIncludingRetries}ms w/ retries)`,
    { level: 'verbose' },
  )
  logForDebugging(
    `API tokens: input=${usage.input_tokens}, output=${usage.output_tokens}, cache_read=${usage.cache_read_input_tokens ?? 0}, cache_creation=${usage.cache_creation_input_tokens ?? 0}`,
    { level: 'verbose' },
  )
  logForDebugging(
    `API details: ttft=${ttftMs ?? 'N/A'}ms, attempt=${attempt}, stop_reason=${stopReason ?? 'N/A'}, cost=$${costUSD.toFixed(4)}${requestId ? `, requestId=${requestId}` : ''}`,
    { level: 'verbose' },
  )
}

// 为了方便调试，这里没按目标源码复刻
export function logAPIRequest({
  requestId,
  model,
  messages,
  systemPrompt,
  tools,
}: {
  requestId?: string | null
  model: string
  messages: unknown
  systemPrompt?: string
  tools?: unknown
}): void {
  logForDebugging(
    `API request${requestId ? ` [${requestId}]` : ''}: model=${model}`,
    { level: 'debug' },
  )
  if (systemPrompt) {
    logForDebugging(
      `API request${requestId ? ` [${requestId}]` : ''} system prompt:\n${systemPrompt}`,
      { level: 'debug' },
    )
  }
  logForDebugging(
    `API request${requestId ? ` [${requestId}]` : ''} messages:\n${JSON.stringify(messages, null, 2)}`,
    { level: 'debug' },
  )
  if (tools) {
    logForDebugging(
      `API request${requestId ? ` [${requestId}]` : ''} tools:\n${JSON.stringify(tools, null, 2)}`,
      { level: 'debug' },
    )
  }
}

// 为了方便调试，这里没按目标源码复刻
export function logAPIResponse({
  requestId,
  content,
  usage,
  stopReason,
}: {
  requestId?: string | null
  content: unknown
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  stopReason?: string | null
}): void {
  logForDebugging(
    `API response${requestId ? ` [${requestId}]` : ''}: stop_reason=${stopReason ?? 'N/A'}`,
    { level: 'debug' },
  )
  if (usage) {
    logForDebugging(
      `API response${requestId ? ` [${requestId}]` : ''} usage: input=${usage.input_tokens}, output=${usage.output_tokens}, cache_read=${usage.cache_read_input_tokens ?? 0}, cache_creation=${usage.cache_creation_input_tokens ?? 0}`,
      { level: 'debug' },
    )
  }
  logForDebugging(
    `API response${requestId ? ` [${requestId}]` : ''} content:\n${JSON.stringify(content, null, 2)}`,
    { level: 'debug' },
  )
}
