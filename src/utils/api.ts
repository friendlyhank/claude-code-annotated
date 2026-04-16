// ============================================================================
// api.ts
// ============================================================================
// API 相关工具函数
//
// 对齐上游实现：按 claude-code/src/utils/api.ts 原样复刻

import type { Tool } from '../Tool.js'

/**
 * 工具输入规范化
 * 对齐上游实现：按 claude-code/src/utils/api.ts:566-620 normalizeToolInput
 * 
 * 当前仅实现最小闭环，完整实现需要各工具的特定规范化逻辑：
 * - BashTool: 命令规范化、工作目录处理
 * - FileEditTool: 文件路径规范化
 * - ExitPlanModeV2Tool: 注入 plan 内容
 * 
 * @param tool - 工具对象
 * @param input - 工具输入参数
 * @returns 规范化后的输入参数
 */
export function normalizeToolInput<T extends Tool>(
  tool: T,
  input: { [key: string]: unknown },
): { [key: string]: unknown } {
  switch (tool.name) {
    // TODO: 对齐上游实现，按工具类型进行特定规范化
    // 上游实现对 BashTool、FileEditTool、ExitPlanModeV2Tool 等有特殊处理
    // 当前最小闭环：直接返回原始输入
    default:
      return input
  }
}
