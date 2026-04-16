/**
 * 文件系统权限检查
 *
 * 当前仅实现 GlobTool 所需的 checkReadPermissionForTool
 * TODO: getFileReadIgnorePatterns、normalizePatternsToPath 等待后续补齐
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
  // 权限上下文，包含当前工作目录等信息
  _permissionContext: ToolPermissionContext,
): PermissionResult {
  return { behavior: 'allow', updatedInput: input }
}
