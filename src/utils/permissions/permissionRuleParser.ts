/**
 * 权限规则字符串解析器
 *
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissionRuleParser.ts 原样复刻
 * 设计原因：
 * 1. 权限规则格式为 "ToolName" 或 "ToolName(content)"
 * 2. content 中的括号需要转义：\( 和 \)
 * 3. 旧工具名需映射到当前规范名
 */

import { AGENT_TOOL_NAME, TASK_OUTPUT_TOOL_NAME, TASK_STOP_TOOL_NAME } from '../../constants/tools.js'
import type { PermissionRuleValue } from '../../types/permissions.js'

// ============================================================================
// Legacy tool name aliases
// ============================================================================

/**
 * 旧工具名到当前规范名的映射
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissionRuleParser.ts LEGACY_TOOL_NAME_ALIASES 原样复刻
 *
 * 设计原因：工具重命名后，旧名称仍存在于用户持久化的权限规则中，
 * 必须能解析到当前规范名
 */
const LEGACY_TOOL_NAME_ALIASES: Record<string, string> = {
  Task: AGENT_TOOL_NAME,
  KillShell: TASK_STOP_TOOL_NAME,
  AgentOutputTool: TASK_OUTPUT_TOOL_NAME,
  BashOutputTool: TASK_OUTPUT_TOOL_NAME,
}

export function normalizeLegacyToolName(name: string): string {
  return LEGACY_TOOL_NAME_ALIASES[name] ?? name
}

export function getLegacyToolNames(canonicalName: string): string[] {
  const result: string[] = []
  for (const [legacy, canonical] of Object.entries(LEGACY_TOOL_NAME_ALIASES)) {
    if (canonical === canonicalName) result.push(legacy)
  }
  return result
}

// ============================================================================
// Rule content escaping
// ============================================================================

/**
 * 转义规则内容中的特殊字符
 * 对齐上游实现：按源码 escapeRuleContent 原样复刻
 *
 * 转义顺序：
 * 1. 先转义反斜杠 (\ → \\)
 * 2. 再转义括号 (( → \(, ) → \))
 */
export function escapeRuleContent(content: string): string {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * 反转义规则内容中的特殊字符
 * 对齐上游实现：按源码 unescapeRuleContent 原样复刻
 *
 * 反转义顺序（与转义相反）：
 * 1. 先反转义括号 (\( → (, \) → ))
 * 2. 再反转义反斜杠 (\\ → \)
 */
export function unescapeRuleContent(content: string): string {
  return content
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

// ============================================================================
// Rule string parsing
// ============================================================================

/**
 * 将权限规则字符串解析为 PermissionRuleValue
 * 对齐上游实现：按源码 permissionRuleValueFromString 原样复刻
 *
 * 格式："ToolName" 或 "ToolName(content)"
 * content 可包含转义括号：\( 和 \)
 *
 * @example
 * permissionRuleValueFromString('Bash') // => { toolName: 'Bash' }
 * permissionRuleValueFromString('Bash(npm install)') // => { toolName: 'Bash', ruleContent: 'npm install' }
 * permissionRuleValueFromString('Bash(python -c "print\\(1\\)")') // => { toolName: 'Bash', ruleContent: 'python -c "print(1)"' }
 */
export function permissionRuleValueFromString(
  ruleString: string,
): PermissionRuleValue {
  // 查找第一个未转义的左括号
  const openParenIndex = findFirstUnescapedChar(ruleString, '(')
  if (openParenIndex === -1) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  // 查找最后一个未转义的右括号
  const closeParenIndex = findLastUnescapedChar(ruleString, ')')
  if (closeParenIndex === -1 || closeParenIndex <= openParenIndex) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  // 右括号必须在末尾
  if (closeParenIndex !== ruleString.length - 1) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  const toolName = ruleString.substring(0, openParenIndex)
  const rawContent = ruleString.substring(openParenIndex + 1, closeParenIndex)

  // 缺少工具名（如 "(foo)"）视为格式错误
  if (!toolName) {
    return { toolName: normalizeLegacyToolName(ruleString) }
  }

  // 空内容（如 "Bash()"）或独立通配符（如 "Bash(*)"）视为工具级规则
  if (rawContent === '' || rawContent === '*') {
    return { toolName: normalizeLegacyToolName(toolName) }
  }

  // 反转义内容
  const ruleContent = unescapeRuleContent(rawContent)
  return { toolName: normalizeLegacyToolName(toolName), ruleContent }
}

/**
 * 将 PermissionRuleValue 转换回字符串表示
 * 对齐上游实现：按源码 permissionRuleValueToString 原样复刻
 */
export function permissionRuleValueToString(
  ruleValue: PermissionRuleValue,
): string {
  if (!ruleValue.ruleContent) {
    return ruleValue.toolName
  }
  const escapedContent = escapeRuleContent(ruleValue.ruleContent)
  return `${ruleValue.toolName}(${escapedContent})`
}

// ============================================================================
// Helper: unescaped character search
// ============================================================================

/**
 * 查找第一个未转义字符的位置
 * 对齐上游实现：按源码 findFirstUnescapedChar 原样复刻
 * 字符前有奇数个反斜杠时视为转义
 */
function findFirstUnescapedChar(str: string, char: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) {
        return i
      }
    }
  }
  return -1
}

/**
 * 查找最后一个未转义字符的位置
 * 对齐上游实现：按源码 findLastUnescapedChar 原样复刻
 */
function findLastUnescapedChar(str: string, char: string): number {
  for (let i = str.length - 1; i >= 0; i--) {
    if (str[i] === char) {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && str[j] === '\\') {
        backslashCount++
        j--
      }
      if (backslashCount % 2 === 0) {
        return i
      }
    }
  }
  return -1
}
