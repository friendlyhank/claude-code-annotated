/**
 * BashTool prompt - 工具描述与超时配置
 *
 * 当前实现：简单版 prompt，仅包含超时配置和基础提示
 * TODO: 完整版 getSimplePrompt() 包含工具偏好、git 操作说明、后台任务说明等待后续补齐
 */


const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000 // 2 分钟
const MAX_TIMEOUT_MS = 30 * 60 * 1000 // 30 分钟

// 获取默认超时时间（毫秒）
export function getDefaultTimeoutMs(): number {
  return DEFAULT_TIMEOUT_MS
}

// 获取最大超时时间（毫秒）
export function getMaxTimeoutMs(): number {
  return MAX_TIMEOUT_MS
}

/**
 * 简单版 prompt — 仅包含核心使用说明
 * 对齐上游：getSimplePrompt() 完整版包含工具偏好、git 说明、后台任务等
 * TODO: 完整版 prompt 待后续补齐
 */
export function getSimplePrompt(): string {
  return `Executes a given bash command in a persistent shell session with optional timeout.

IMPORTANT: You can call multiple tools in a single response. When multiple independent pieces of information are requested and all commands are likely to succeed, run multiple tool calls in parallel for optimal performance.

- If the commands are independent and can run in parallel, make multiple Bash tool calls in a single message.
- If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together.
- Use ';' only when you need to run commands sequentially but don't care if earlier commands fail.
- DO NOT use newlines to separate commands (newlines are ok in quoted strings).
- Always quote file paths that contain spaces with double quotes.
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`.`
}
