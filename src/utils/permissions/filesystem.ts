/**
 * 文件系统权限检查
 *
 * 当前实现 FileReadTool 所需的 checkReadPermissionForTool 和 matchingRuleForInput
 * TODO: 完整权限检查逻辑待后续补齐
 */

import type { Tool } from '../../Tool.js'
import type {
  PermissionResult,
  ToolPermissionContext,
} from '../../types/permissions.js'

/**
 * 检查工具的文件读取权限
 *
 * 设计原因：只读工具（Glob、Grep、Read）统一使用此函数检查权限
 *
 * 当前为简化实现：默认允许
 * TODO: 完整实现需检查 allowedDirectories 和 deny rules
 */
export function checkReadPermissionForTool(
  _tool: Pick<Tool, 'name' | 'mcpInfo'>, // 工具实例
  input: Record<string, unknown>, // 输入参数
  _permissionContext: ToolPermissionContext,
): PermissionResult {
  return { behavior: 'allow', updatedInput: input }
}

/**
 * 检查输入是否匹配权限规则
 * 对齐上游实现：按源码 matchingRuleForInput 原样复刻
 *
 * 当前为简化实现：返回 null（无匹配的拒绝规则）
 * TODO: 完整实现需遍历权限规则做模式匹配
 */
export function matchingRuleForInput(
  _input: string,
  _permissionContext: ToolPermissionContext,
  _accessType: 'read' | 'write',
  _ruleType: 'allow' | 'deny',
): null {
  return null
}
