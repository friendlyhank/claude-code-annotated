/**
 * MCP 名称字符串工具函数 - 纯字符串解析，无重依赖
 *
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts 原样复刻
 * 设计原因：
 * 1. 权限检查需要解析 MCP 工具名（mcp__server__tool 格式）
 * 2. 独立文件保持轻量，避免循环依赖
 */

// ============================================================================
// MCP 名称规范化
// ============================================================================

/**
 * Claude.ai 服务器名称前缀
 * 对齐上游实现：按 claude-code/src/services/mcp/normalization.ts 原样复刻
 */
const CLAUDEAI_SERVER_PREFIX = 'claude.ai '

/**
 * 规范化 MCP 名称，兼容 API 模式 ^[a-zA-Z0-9_-]{1,64}$
 * 对齐上游实现：按 claude-code/src/services/mcp/normalization.ts normalizeNameForMCP 原样复刻
 *
 * 将无效字符（含点和空格）替换为下划线。
 * 对 claude.ai 服务器（名称以 "claude.ai " 开头），额外合并连续下划线
 * 并去除首尾下划线，防止干扰 MCP 工具名中的 __ 分隔符。
 */
export function normalizeNameForMCP(name: string): string {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (name.startsWith(CLAUDEAI_SERVER_PREFIX)) {
    normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
  }
  return normalized
}

// ============================================================================
// MCP 名称解析与构建
// ============================================================================

/**
 * 从工具名称字符串中提取 MCP 服务器信息
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts mcpInfoFromString 原样复刻
 *
 * 格式：mcp__serverName__toolName
 * 已知限制：如果 serverName 包含 "__"，解析会出错
 *
 * @param toolString 待解析字符串，如 "mcp__server__tool"
 * @returns 包含 serverName 和可选 toolName 的对象，或 null
 */
export function mcpInfoFromString(toolString: string): {
  serverName: string
  toolName: string | undefined
} | null {
  const parts = toolString.split('__')
  const [mcpPart, serverName, ...toolNameParts] = parts
  if (mcpPart !== 'mcp' || !serverName) {
    return null
  }
  // 合并 serverName 之后的所有部分，保留 toolName 中的双下划线
  const toolName =
    toolNameParts.length > 0 ? toolNameParts.join('__') : undefined
  return { serverName, toolName }
}

/**
 * 生成 MCP 工具名前缀
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts getMcpPrefix 原样复刻
 */
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`
}

/**
 * 从服务器名和工具名构建完整的 MCP 工具名
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts buildMcpToolName 原样复刻
 * mcpInfoFromString() 的逆操作
 */
export function buildMcpToolName(serverName: string, toolName: string): string {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`
}

/**
 * 返回用于权限规则匹配的名称
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts getToolNameForPermissionCheck 原样复刻
 *
 * 设计原因：MCP 工具使用完整的 mcp__server__tool 名称，
 * 使得针对内置工具（如 "Write"）的拒绝规则不会匹配到
 * 同名但无前缀的 MCP 替代工具。
 */
export function getToolNameForPermissionCheck(tool: {
  name: string
  mcpInfo?: { serverName: string; toolName: string }
}): string {
  return tool.mcpInfo
    ? buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName)
    : tool.name
}

/**
 * 从完整 MCP 工具名中提取显示名称
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts getMcpDisplayName 原样复刻
 */
export function getMcpDisplayName(
  fullName: string,
  serverName: string,
): string {
  const prefix = `mcp__${normalizeNameForMCP(serverName)}__`
  return fullName.replace(prefix, '')
}

/**
 * 从用户面向名称中提取 MCP 工具显示名称
 * 对齐上游实现：按 claude-code/src/services/mcp/mcpStringUtils.ts extractMcpToolDisplayName 原样复刻
 */
export function extractMcpToolDisplayName(userFacingName: string): string {
  // 移除 (MCP) 后缀
  let withoutSuffix = userFacingName.replace(/\s*\(MCP\)\s*$/, '')
  withoutSuffix = withoutSuffix.trim()

  // 移除服务器前缀（" - " 之前的所有内容）
  const dashIndex = withoutSuffix.indexOf(' - ')
  if (dashIndex !== -1) {
    const displayName = withoutSuffix.substring(dashIndex + 3).trim()
    return displayName
  }

  return withoutSuffix
}
