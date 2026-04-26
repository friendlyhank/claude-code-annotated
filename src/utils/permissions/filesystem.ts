/**
 * 文件系统权限检查
 *
 * 当前实现 FileReadTool/FileWriteTool 所需的权限检查函数
 * TODO: 完整权限检查逻辑（allowedDirectories、deny rules 遍历）待后续补齐
 */

import type { Tool } from '../../Tool.js'
import type {
  PermissionDecision,
  ToolPermissionContext,
} from '../../types/permissions.js'

/**
 * 检查工具的文件读取权限
 *
 * 当前为简化实现：默认允许
 * TODO: 完整实现需检查 allowedDirectories 和 deny rules
 */
export function checkReadPermissionForTool(
  _tool: Pick<Tool, 'name' | 'mcpInfo'>,
  input: Record<string, unknown>,
  _permissionContext: ToolPermissionContext,
): PermissionDecision {
  return { behavior: 'allow', updatedInput: input }
}

/**
 * 检查工具的文件写入权限
 *
 * 对齐上游实现：按 claude-code/src/utils/permissions/filesystem.ts checkWritePermissionForTool 原样复刻
 * 设计原因：
 * 1. 先检查 deny 规则，拒绝则返回 deny
 * 2. 检查内部可编辑路径（plan 文件、scratchpad）
 * 3. 检查安全路径（.claude 目录等）
 * 4. 无匹配规则时返回 ask
 *
 * 当前为简化实现：检查 deny 规则后默认允许
 * TODO: 完整实现需包含 checkEditableInternalPath、isDangerousFilePathToAutoEdit 等子流程
 */
export function checkWritePermissionForTool(
  tool: Pick<Tool, 'name' | 'mcpInfo'> & { getPath?(input: unknown): string },
  input: Record<string, unknown>,
  _permissionContext: ToolPermissionContext,
): PermissionDecision {
  if (typeof tool.getPath !== 'function') {
    return {
      behavior: 'ask',
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    }
  }

  // TODO: 遍历 deny 规则做路径匹配，当前 matchingRuleForInput 返回 null
  // const path = tool.getPath(input)
  // const denyRule = matchingRuleForInput(path, _permissionContext, 'edit', 'deny')
  // if (denyRule) {
  //   return { behavior: 'deny', message: `Permission to edit ${path} has been denied.`, decisionReason: { type: 'rule', rule: denyRule } }
  // }

  // TODO: checkEditableInternalPath 待内部路径检查实现后补齐
  // TODO: isDangerousFilePathToAutoEdit 待安全路径检查实现后补齐

  return { behavior: 'allow' }
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
  _accessType: 'read' | 'write' | 'edit',
  _ruleType: 'allow' | 'deny',
): null {
  return null
}

/**
 * 规范化模式到指定路径
 * 对齐上游实现：按 claude-code/src/utils/permissions/filesystem.ts 原样复刻
 *
 * 当前为简化实现：返回空数组
 * TODO: 完整实现需包含模式根路径匹配逻辑
 */
export function normalizePatternsToPath(
  _patternsByRoot: Map<string | null, string[]>,
  _root: string,
): string[] {
  // 简化实现：返回空数组
  // 完整实现需要遍历 patternsByRoot 并规范化每个模式
  return []
}

/**
 * 获取文件读取忽略模式
 * 对齐上游实现：按 claude-code/src/utils/permissions/filesystem.ts 原样复刻
 *
 * 当前为简化实现：返回空 Map
 * TODO: 完整实现需从权限上下文收集 deny 规则
 */
export function getFileReadIgnorePatterns(
  _toolPermissionContext: ToolPermissionContext,
): Map<string | null, string[]> {
  // 简化实现：返回空 Map
  // 完整实现需要从权限上下文中提取 read deny 规则
  return new Map()
}
