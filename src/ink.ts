/**
 * Claude Code Annotated - Ink 渲染封装
 *
 * 源码复刻参考: claude-code/src/ink.ts
 *
 * 功能:
 * - createRoot: 创建渲染实例，类似 react-dom 的 API
 * - render: 简单渲染 API
 * - 导出 Ink 组件和 hooks
 *
 * 设计说明:
 * 目标源码使用 ink/root.js 的 createRoot，并用 ThemeProvider 包装。
 * 当前实现直接使用 ink 库的 render API 封装 createRoot。
 */

import { type ReactNode } from 'react'
import { render as inkRender, Box, Text, Newline, Spacer, useApp, useInput, useStdin } from 'ink'

// ========================================
// 类型定义
// ========================================

export type RenderOptions = Parameters<typeof inkRender>[1]

export type Root = {
  render: (node: ReactNode) => void
  unmount: () => void
  waitUntilExit: () => Promise<void>
}

export type Instance = Awaited<ReturnType<typeof inkRender>>

// ========================================
// createRoot - 类似 react-dom 的 API
// ========================================

/**
 * 创建一个 Ink root，类似 react-dom 的 createRoot API
 * 分离实例创建和渲染，允许同一个 root 被多次使用
 */
export async function createRoot(options?: RenderOptions): Promise<Root> {
  // 保持微任务边界，与源码行为一致
  await Promise.resolve()

  let instance: Instance | null = null

  return {
    render: (node: ReactNode) => {
      if (!instance) {
        instance = inkRender(node, options)
      } else {
        instance.rerender(node)
      }
    },
    unmount: () => {
      instance?.unmount()
      instance = null
    },
    waitUntilExit: () => {
      return instance?.waitUntilExit() ?? Promise.resolve()
    },
  }
}

// ========================================
// render - 简单渲染 API
// ========================================

/**
 * 渲染 React 组件到终端
 */
export async function render(
  node: ReactNode,
  options?: RenderOptions,
): Promise<Instance> {
  // 保持微任务边界
  await Promise.resolve()
  return inkRender(node, options)
}

// ========================================
// 导出组件和 hooks
// ========================================

export { Box, Text, Newline, Spacer, useApp, useInput, useStdin }

// 类型导出
export type { BoxProps, TextProps } from 'ink'
