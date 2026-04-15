/**
 * 权限工具函数 - 规则获取与工具匹配
 *
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts 原样复刻
 * 设计原因：
 * 1. getDenyRules/getAskRules/getAllowRules 从 ToolPermissionContext 提取规则
 * 2. toolMatchesRule 实现工具名与规则的匹配逻辑（含 MCP 支持）
 * 3. getDenyRuleForTool 供 tools.ts 的 filterToolsByDenyRules 使用
 * 4. PERMISSION_RULE_SOURCES 定义所有规则来源的遍历顺序
 */

import type {
  PermissionRule,
  PermissionRuleSource,
  ToolPermissionContext,
} from '../../types/permissions.js'
import type { Tool } from '../../Tool.js'
import {
  getToolNameForPermissionCheck,
  mcpInfoFromString,
} from '../../services/mcp/mcpStringUtils.js'
import { permissionRuleValueFromString } from './permissionRuleParser.js'

// ============================================================================
// PERMISSION_RULE_SOURCES
// ============================================================================

/**
 * 权限规则来源列表，顺序影响规则优先级
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts PERMISSION_RULE_SOURCES 原样复刻
 *
 * 顺序：SETTING_SOURCES + cliArg + command + session
 * 注：SETTING_SOURCES = ['userSettings', 'projectSettings', 'localSettings', 'flagSettings', 'policySettings']
 */
const SETTING_SOURCES: PermissionRuleSource[] = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
] as const

const PERMISSION_RULE_SOURCES = [
  ...SETTING_SOURCES,
  'cliArg',
  'command',
  'session',
] as const satisfies readonly PermissionRuleSource[]

// ============================================================================
// Rule extraction helpers
// ============================================================================

/**
 * 从权限上下文中提取所有允许规则
 * 对齐上游实现：按源码 getAllowRules 原样复刻
 */
export function getAllowRules(context: ToolPermissionContext): PermissionRule[] {
  return PERMISSION_RULE_SOURCES.flatMap(source =>
    (context.alwaysAllowRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'allow' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

/**
 * 从权限上下文中提取所有拒绝规则
 * 对齐上游实现：按源码 getDenyRules 原样复刻
 */
export function getDenyRules(context: ToolPermissionContext): PermissionRule[] {
  return PERMISSION_RULE_SOURCES.flatMap(source =>
    (context.alwaysDenyRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'deny' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

/**
 * 从权限上下文中提取所有询问规则
 * 对齐上游实现：按源码 getAskRules 原样复刻
 */
export function getAskRules(context: ToolPermissionContext): PermissionRule[] {
  return PERMISSION_RULE_SOURCES.flatMap(source =>
    (context.alwaysAskRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'ask' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

// ============================================================================
// toolMatchesRule
// ============================================================================

/**
 * 检查工具是否匹配规则（整个工具级别的匹配）
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts toolMatchesRule 原样复刻
 *
 * 匹配逻辑：
 * 1. 规则不能有 ruleContent（即只匹配 "Bash" 不匹配 "Bash(prefix:*)"）
 * 2. 使用 getToolNameForPermissionCheck 获取工具的权限匹配名
 *    （MCP 工具使用 mcp__server__tool 全限定名）
 * 3. 直接工具名匹配
 * 4. MCP 服务器级匹配：规则 "mcp__server1" 匹配 "mcp__server1__tool1"
 *    也支持通配符：规则 "mcp__server1__*" 匹配 server1 的所有工具
 */
function toolMatchesRule(
  tool: Pick<Tool, 'name' | 'mcpInfo'>,
  rule: PermissionRule,
): boolean {
  // 有 ruleContent 的规则不是整个工具级别的匹配
  if (rule.ruleValue.ruleContent !== undefined) {
    return false
  }

  // MCP 工具使用全限定名匹配，防止内置工具的拒绝规则误匹配同名 MCP 工具
  const nameForRuleMatch = getToolNameForPermissionCheck(tool)

  // 直接工具名匹配
  if (rule.ruleValue.toolName === nameForRuleMatch) {
    return true
  }

  // MCP 服务器级权限：规则 "mcp__server1" 匹配工具 "mcp__server1__tool1"
  // 也支持通配符：规则 "mcp__server1__*" 匹配 server1 的所有工具
  const ruleInfo = mcpInfoFromString(rule.ruleValue.toolName)
  const toolInfo = mcpInfoFromString(nameForRuleMatch)

  return (
    ruleInfo !== null &&
    toolInfo !== null &&
    (ruleInfo.toolName === undefined || ruleInfo.toolName === '*') &&
    ruleInfo.serverName === toolInfo.serverName
  )
}

// ============================================================================
// getDenyRuleForTool
// ============================================================================

/**
 * 检查工具是否有拒绝规则
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts getDenyRuleForTool 原样复刻
 *
 * @param context - 权限上下文
 * @param tool - 工具对象（Pick<Tool, 'name' | 'mcpInfo'>）
 * @returns 匹配的拒绝规则，或 null
 */
export function getDenyRuleForTool(
  context: ToolPermissionContext,
  tool: Pick<Tool, 'name' | 'mcpInfo'>,
): PermissionRule | null {
  return getDenyRules(context).find(rule => toolMatchesRule(tool, rule)) || null
}

/**
 * 检查工具是否有询问规则
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts getAskRuleForTool 原样复刻
 */
export function getAskRuleForTool(
  context: ToolPermissionContext,
  tool: Pick<Tool, 'name' | 'mcpInfo'>,
): PermissionRule | null {
  return getAskRules(context).find(rule => toolMatchesRule(tool, rule)) || null
}

/**
 * 检查特定代理类型是否被拒绝
 * 对齐上游实现：按 claude-code/src/utils/permissions/permissions.ts getDenyRuleForAgent 原样复刻
 *
 * 支持 Agent(agentType) 语法，例如 Agent(Explore) 拒绝 Explore 代理
 */
export function getDenyRuleForAgent(
  context: ToolPermissionContext,
  agentToolName: string,
  agentType: string,
): PermissionRule | null {
  return (
    getDenyRules(context).find(
      rule =>
        rule.ruleValue.toolName === agentToolName &&
        rule.ruleValue.ruleContent === agentType,
    ) || null
  )
}
