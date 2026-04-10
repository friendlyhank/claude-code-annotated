/**
 * Claude Code Annotated - REPL 启动器
 *
 * 源码复刻参考: claude-code/src/replLauncher.tsx
 *
 * 功能:
 * - launchRepl: 启动 REPL 交互界面
 */

import type { ReactNode } from 'react'
import type { Root } from './ink.js'
import type { Props as REPLProps } from './screens/REPL.js'

// ========================================
// 类型定义
// ========================================

// TODO: 导入 FpsMetrics from './utils/fpsTracker.js'
// TODO: 导入 StatsStore from './context/stats.js'
// TODO: 导入 AppState from './state/AppStateStore.js'

export type AppWrapperProps = {
  getFpsMetrics: () => unknown // TODO: FpsMetrics | undefined
  stats?: unknown // TODO: StatsStore
  initialState: unknown // TODO: AppState
}

// ========================================
// launchRepl
// ========================================

/**
 * 启动 REPL 交互界面
 *
 * 对齐源码: claude-code/src/replLauncher.tsx
 */
export async function launchRepl(
  root: Root,
  appProps: AppWrapperProps,
  replProps: REPLProps,
  renderAndRun: (root: Root, element: ReactNode) => Promise<void>,
): Promise<void> {
  const { App } = await import('./components/App.js')
  const { REPL } = await import('./screens/REPL.js')

  await renderAndRun(
    root,
    <App {...appProps}>
      <REPL {...replProps} />
    </App>,
  )
}
