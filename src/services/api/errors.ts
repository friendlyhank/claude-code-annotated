import { APIError, APIConnectionTimeoutError, APIConnectionError } from '@anthropic-ai/sdk'

const REPEATED_529_ERROR_MESSAGE = 'Repeated 529 Overloaded errors'
const CUSTOM_OFF_SWITCH_MESSAGE =
  'Opus is experiencing high load, please use /model to switch to Sonnet'
const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt is too long'
const CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = 'Credit balance is too low'

/**
 * Classifies an API error into a specific error type for analytics tracking.
 */
// 分类 API 错误类型
export function classifyAPIError(error: unknown): string {
  // Aborted requests
  if (error instanceof Error && error.message === 'Request was aborted.') {
    return 'aborted'
  }

  // Timeout errors
  if (
    error instanceof APIConnectionTimeoutError ||
    (error instanceof APIConnectionError &&
      error.message.toLowerCase().includes('timeout'))
  ) {
    return 'api_timeout'
  }

  // Check for repeated 529 errors (重复 529 错误)
  if (
    error instanceof Error &&
    error.message.includes(REPEATED_529_ERROR_MESSAGE)
  ) {
    return 'repeated_529'
  }

  // Check for emergency capacity off switch (紧急容量切换)
  if (
    error instanceof Error &&
    error.message.includes(CUSTOM_OFF_SWITCH_MESSAGE)
  ) {
    return 'capacity_off_switch'
  }

  // Rate limiting 频率限制 (429)
  if (error instanceof APIError && error.status === 429) {
    return 'rate_limit'
  }

  // Server overload (529)
  if (
    error instanceof APIError &&
    (error.status === 529 ||
      error.message?.includes('"type":"overloaded_error"'))
  ) {
    return 'server_overload' // 服务器过载
  }

  // Prompt/content size errors
  if (
    error instanceof Error &&
    error.message
      .toLowerCase()
      .includes(PROMPT_TOO_LONG_ERROR_MESSAGE.toLowerCase())
  ) {
    return 'prompt_too_long' // 提示过长
  }

  // PDF errors
  if (
    error instanceof Error &&
    /maximum of \d+ PDF pages/.test(error.message)
  ) {
    return 'pdf_too_large' // PDF 过大
  }

  if (
    error instanceof Error &&
    error.message.includes('The PDF specified is password protected')
  ) {
    return 'pdf_password_protected' // PDF 密码保护
  }

  // Image size errors
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes('image exceeds') &&
    error.message.includes('maximum')
  ) {
    return 'image_too_large' // 图片过大
  }

  // Many-image dimension errors
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes('image dimensions exceed') &&
    error.message.includes('many-image')
  ) {
    return 'image_too_large' // 图片过大
  }

  // Tool use errors (400)
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes(
      '`tool_use` ids were found without `tool_result` blocks immediately after',
    )
  ) {
    return 'tool_use_mismatch' // 工具调用与工具结果不匹配
  }

  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes('unexpected `tool_use_id` found in `tool_result`')
  ) {
    return 'unexpected_tool_result' // 未预期的工具结果
  }

  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes('`tool_use` ids must be unique')
  ) {
    return 'duplicate_tool_use_id' // 重复的工具调用ID
  }

  // Invalid model errors (400)
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.toLowerCase().includes('invalid model name')
  ) {
    return 'invalid_model' // 无效的模型名称
  }

  // Credit/billing errors
  if (
    error instanceof Error &&
    error.message
      .toLowerCase()
      .includes(CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE.toLowerCase())
  ) {
    return 'credit_balance_low' // 信用余额过低
  }

  // Authentication errors
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes('x-api-key')
  ) {
    return 'invalid_api_key' // 无效的 API 密钥
  }

  if (
    error instanceof APIError &&
    error.status === 403 &&
    error.message.includes('OAuth token has been revoked')
  ) {
    return 'token_revoked' // OAuth 令牌已被撤销
  }

  if (
    error instanceof APIError &&
    (error.status === 401 || error.status === 403) &&
    error.message.includes(
      'OAuth authentication is currently not allowed for this organization',
    )
  ) {
    return 'oauth_org_not_allowed' // 当前组织不支持 OAuth 认证
  }

  // Generic auth errors
  if (
    error instanceof APIError &&
    (error.status === 401 || error.status === 403)
  ) {
    return 'auth_error' // 认证错误
  }

  // Bedrock-specific errors
  if (
    process.env.CLAUDE_CODE_USE_BEDROCK &&
    error instanceof Error &&
    error.message.toLowerCase().includes('model id')
  ) {
    return 'bedrock_model_access' // Bedrock 模型访问错误
  }

  // Status code based fallbacks
  if (error instanceof APIError) {
    const status = error.status
    if (status >= 500) return 'server_error'
    if (status >= 400) return 'client_error'
  }

  // Connection errors - check for SSL/TLS issues first
  if (error instanceof APIConnectionError) {
    // TODO: extractConnectionErrorDetails
    // const connectionDetails = extractConnectionErrorDetails(error)
    // if (connectionDetails?.isSSLError) {
    //   return 'ssl_cert_error'
    // }
    return 'connection_error'
  }

  return 'unknown'
}
