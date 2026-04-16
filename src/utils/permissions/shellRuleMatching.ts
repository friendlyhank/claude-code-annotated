/**
 * Shell 规则通配符匹配
 *
 * 当前仅实现 GlobTool 所需的 matchWildcardPattern
 * TODO: 完整 shellRuleMatching 待后续补齐
 */

/**
 * 通配符模式匹配
 *
 * 设计原因：权限规则中的通配符匹配（如 "Bash(prefix:*" 中的 *）
 *
 * 当前为简化实现：仅支持 * 通配符
 * TODO: 完整实现需支持更多模式
 */
export function matchWildcardPattern(
  rulePattern: string,
  input: string,
): boolean {
  // 将通配符模式转为正则
  const regexStr = rulePattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${regexStr}$`).test(input)
}
