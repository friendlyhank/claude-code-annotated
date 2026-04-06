#!/usr/bin/env bun
/**
 * Claude Code Annotated - CLI 入口
 * 
 * 源码复刻参考: claude-code/src/entrypoints/cli.tsx
 * 
 * 实现原理:
 * 1. 快速路径检测（--version）- 零模块加载
 * 2. 参数解析与路由
 * 3. 动态导入主模块
 * 
 * 设计模式:
 * - 快速路径在 import 之前完成，避免不必要的模块加载
 * - 使用动态 import() 延迟加载主模块
 * - MACRO.VERSION 在构建时由 Bun.build 内联
 */

// Bugfix for corepack auto-pinning, which adds yarnpkg to peoples' package.jsons
process.env.COREPACK_ENABLE_AUTO_PIN = '0'

/**
 * 全局宏定义
 * 
 * Bun.build 在构建时会通过 define 选项将 MACRO.VERSION 替换为实际值
 * 参考: build.ts define: { 'MACRO.VERSION': '"0.1.0"' }
 */
declare const MACRO: {
  VERSION: string
}

/**
 * CLI 主入口函数
 * 
 * 参考 claude-code/src/entrypoints/cli.tsx main()
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // ========================================
  // 快速路径: --version/-v - 零模块加载
  // 参考: 源码 cli.tsx 第 40-44 行
  // ========================================
  if (
    args.length === 1 &&
    (args[0] === '--version' || args[0] === '-v' || args[0] === '-V')
  ) {
    // MACRO.VERSION is inlined at build time
    console.log(`${MACRO.VERSION} (Claude Code)`)
    return
  }

  // ========================================
  // TODO: 其他快速路径（参考源码 cli.tsx）：
  // - --dump-system-prompt
  // - --claude-in-chrome-mcp
  // - --daemon-worker / daemon
  // - remote-control / bridge
  // - ps|logs|attach|kill (bg sessions)
  // - new|list|reply (templates)
  // ========================================

  // ========================================
  // 默认路径: 动态加载主模块
  // 参考: 源码 cli.tsx 第 295-307 行
  // ========================================
  // TODO: startCapturingEarlyInput() - 需要实现 earlyInput 模块
  // TODO: profileCheckpoint('cli_before_main_import') - 需要实现 startupProfiler 模块
  const { main: cliMain } = await import('../main')
  // TODO: profileCheckpoint('cli_after_main_import')
  await cliMain()
  // TODO: profileCheckpoint('cli_after_main_complete')
}

// 启动 CLI
void main()