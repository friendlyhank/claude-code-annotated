/**
 * Branded types for session and agent IDs.
 * 
 * 对齐上游实现：按 claude-code/src/types/ids.ts 原样复刻
 * 设计原因：使用品牌类型（Branded Type）在编译时防止 ID 混用，
 * 这是一个纯类型层面的设计，不引入运行时开销
 */

/**
 * A session ID uniquely identifies a Claude Code session.
 * Returned by getSessionId().
 */
export type SessionId = string & { readonly __brand: 'SessionId' }

/**
 * An agent ID uniquely identifies a subagent within a session.
 * Returned by createAgentId().
 * When present, indicates the context is a subagent (not the main session).
 */
export type AgentId = string & { readonly __brand: 'AgentId' }

/**
 * Cast a raw string to SessionId.
 * 对齐上游实现：按源码原样保留 asSessionId/asAgentId 强转函数
 * 设计原因：某些场景无法调用 getSessionId()（如解析持久化数据），
 * 提供受控的 escape hatch
 */
export function asSessionId(id: string): SessionId {
  return id as SessionId
}

/**
 * Cast a raw string to AgentId.
 * Use sparingly - prefer createAgentId() when possible.
 */
export function asAgentId(id: string): AgentId {
  return id as AgentId
}

/**
 * 对齐上游实现：正则模式与源码完全一致
 * 格式说明：`a` + optional `<label>-` + 16 hex chars
 * 边界处理：不匹配时返回 null（如 teammate names, team-addressing）
 */
const AGENT_ID_PATTERN = /^a(?:.+-)?[0-9a-f]{16}$/

/**
 * Validate and brand a string as AgentId.
 * Matches the format produced by createAgentId(): `a` + optional `<label>-` + 16 hex chars.
 * Returns null if the string doesn't match (e.g. teammate names, team-addressing).
 */
export function toAgentId(s: string): AgentId | null {
  return AGENT_ID_PATTERN.test(s) ? (s as AgentId) : null
}
