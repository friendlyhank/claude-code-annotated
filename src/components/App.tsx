/**
 * Claude Code Annotated - App 包装组件
 *
 *
 * 功能:
 * - 提供顶层上下文包装
 * - FPS 指标、统计、状态管理
 */

import React, { type ReactNode } from 'react'
import { type AppState, AppStateProvider } from '../state/AppState.js'

// ========================================
// 类型定义
// ========================================

export type Props = {
  // TODO: 添加 fps 指标
  getFpsMetrics?: () => unknown
  // TODO: 添加统计存储
  stats?: unknown
  // 初始状态
  initialState?: AppState
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
export function App({
  getFpsMetrics,
  stats,
  initialState,
  children,
}: Props): ReactNode {
  return (
    <AppStateProvider initialState={initialState}>
      {children}
    </AppStateProvider>
  )
}
