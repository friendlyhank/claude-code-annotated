/**
 * Claude Code Annotated - App 包装组件
 *
 * 源码复刻参考: claude-code/src/components/App.tsx
 *
 * 功能:
 * - 提供顶层上下文包装
 * - FPS 指标、统计、状态管理（TODO）
 */

import React, { type ReactNode } from 'react'

// ========================================
// 类型定义
// ========================================

export type Props = {
  // TODO: 添加 fps 指标
  // getFpsMetrics?: () => FpsMetrics | undefined
  // TODO: 添加统计存储
  // stats?: StatsStore
  // TODO: 添加初始状态
  // initialState?: AppState
  children: ReactNode
}

// ========================================
// App 组件
// ========================================

/**
 * 顶层包装组件
 *
 * 为交互式会话提供上下文：
 * - FPS 指标
 * - 统计存储
 * - 应用状态
 */
export function App({ children }: Props): ReactNode {
  // TODO: 添加上下文提供者
  // - FpsMetricsProvider
  // - StatsProvider
  // - AppStateProvider

  return <>{children}</>
}
