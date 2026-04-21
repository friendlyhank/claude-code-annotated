/**
 * API 请求日志记录
 *
 * 源码复刻: claude-code/src/services/api/logging.ts
 * 简化实现：专注于调试日志输出
 */

import type { BetaStopReason } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { logForDebugging } from '../../utils/debug.js'

export type NonNullableUsage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export const EMPTY_USAGE: NonNullableUsage = {
  input_tokens: 0,
  output_tokens: 0,
}

export type GlobalCacheStrategy = 'tool_based' | 'system_prompt' | 'none'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function classifyAPIError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('rate_limit')) return 'rate_limit'
    if (error.message.includes('authentication')) return 'authentication_error'
    if (error.message.includes('overloaded')) return 'overloaded'
    if (error.message.includes('timeout')) return 'timeout'
    if (error.message.includes('network')) return 'network_error'
    return 'api_error'
  }
  return 'unknown_error'
}

export function logAPIQuery({
  model,
  messagesLength,
  temperature,
  betas,
  querySource,
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

export function logAPIError({
  error,
  model,
  messageCount,
  durationMs,
  attempt,
  requestId,
  status,
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

export function logAPISuccessAndDuration({
  model,
  start,
  startIncludingRetries,
  ttftMs,
  usage,
  attempt,
  messageCount,
  requestId,
  stopReason,
  costUSD,
}: {
  model: string
  start: number
  startIncludingRetries: number // 记录开始时间，用于计算包含重试的持续时间
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
