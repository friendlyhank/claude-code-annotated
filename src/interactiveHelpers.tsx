/**
 * Claude Code Annotated - 交互式辅助函数
 *
 * 源码复刻参考: claude-code/src/interactiveHelpers.tsx
 *
 * 功能:
 * - renderAndRun: 渲染主 UI 并等待退出
 * - exitWithError: 错误退出
 * - exitWithMessage: 消息退出
 * - showDialog: 显示对话框
 */

import React, { type ReactNode } from 'react'
import { createRoot, type Root, Text, type TextProps } from './ink.js'

// ========================================
// renderAndRun
// ========================================

/**
 * 渲染主 UI 并等待退出
 *
 * 这是交互模式的主要入口点：
 * 1. 渲染 React 组件树
 * 2. 等待用户退出（Ctrl+C 或程序退出）
 * 3. 执行优雅关闭
 */
export async function renderAndRun(
  root: Root,
  element: ReactNode,
): Promise<void> {
  root.render(element)
  await root.waitUntilExit()
  await gracefulShutdown(0)
}

// ========================================
// gracefulShutdown
// ========================================

/**
 * 优雅关闭
 *
 * 执行清理操作后退出进程
 */
export async function gracefulShutdown(exitCode: number): Promise<never> {
  // TODO: 实现清理逻辑
  // - 保存会话
  // - 关闭 MCP 连接
  // - 清理临时文件
  process.exit(exitCode)
}

/**
 * 同步优雅关闭
 */
export function gracefulShutdownSync(exitCode: number): never {
  process.exit(exitCode)
}

// ========================================
// exitWithError / exitWithMessage
// ========================================

/**
 * 显示错误消息后退出
 *
 * 用于 Ink root 创建后的致命错误处理
 * console.error 会被 Ink 的 patchConsole 捕获，
 * 所以需要通过 React 树渲染错误消息
 */
export async function exitWithError(
  root: Root,
  message: string,
  beforeExit?: () => Promise<void>,
): Promise<never> {
  return exitWithMessage(root, message, { color: 'red', beforeExit })
}

/**
 * 显示消息后退出
 */
export async function exitWithMessage(
  root: Root,
  message: string,
  options?: {
    color?: TextProps['color']
    exitCode?: number
    beforeExit?: () => Promise<void>
  },
): Promise<never> {
  const color = options?.color
  const exitCode = options?.exitCode ?? 1

  root.render(
    color ? <Text color={color}>{message}</Text> : <Text>{message}</Text>,
  )
  root.unmount()

  await options?.beforeExit?.()
  process.exit(exitCode)
}

// ========================================
// showDialog
// ========================================

/**
 * 显示对话框并等待结果
 *
 * 通用的对话框渲染函数，用于各种确认/选择场景
 *
 * @param root - Ink root 实例
 * @param renderer - 渲染函数，接收 done 回调
 * @returns 用户选择的结果
 */
export function showDialog<T = void>(
  root: Root,
  renderer: (done: (result: T) => void) => ReactNode,
): Promise<T> {
  return new Promise<T>(resolve => {
    const done = (result: T): void => {
      resolve(result)
    }
    root.render(renderer(done))
  })
}

// ========================================
// getRenderContext
// ========================================

/**
 * 获取渲染上下文
 *
 * 包含：
 * - renderOptions: Ink 渲染选项
 * - stats: 统计存储（TODO）
 * - fps 相关（TODO）
 */
export function getRenderContext(exitOnCtrlC: boolean): {
  renderOptions: {
    exitOnCtrlC: boolean
    patchConsole: boolean
  }
} {
  return {
    renderOptions: {
      exitOnCtrlC,
      patchConsole: true,
    },
  }
}
