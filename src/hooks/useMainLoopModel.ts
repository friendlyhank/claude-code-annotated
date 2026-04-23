/**
 * Hook for getting the main loop model
 *
 * 功能:
 * - 获取当前使用的主循环模型名称
 */

import { useAppState } from '../state/AppState.js'

export type ModelName = string

/**
 * Hook that returns the current main loop model name.
 * 对齐上游实现：从 AppState 读取模型配置，使用 parseUserSpecifiedModel 解析
 * 简化实现：省略 parseUserSpecifiedModel，直接返回模型名
 */
export function useMainLoopModel(): ModelName {
  // 从 AppState 读取模型配置
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  // 从 AppState 读取会话级模型配置
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)

  // 对齐上游实现：mainLoopModelForSession ?? mainLoopModel ?? getDefaultMainLoopModelSetting()
  // 简化实现：直接使用环境变量或默认值
  return (
    mainLoopModelForSession ??
    mainLoopModel ??
    process.env.ANTHROPIC_MODEL ??
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ??
    'claude-sonnet-4-6'
  )
}
