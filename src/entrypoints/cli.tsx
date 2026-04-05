#!/usr/bin/env bun
/**
 * Claude Code Annotated - CLI 入口
 * 
 * 源码复刻项目入口点，参考 claude-code-best 项目结构
 */

const VERSION = '0.1.0'

/**
 * CLI 主入口函数
 * 
 * 实现原理（参考源码 src/entrypoints/cli.tsx）：
 * 1. 快速路径检测（--version）- 零模块加载
 * 2. 参数解析与路由
 * 3. 加载主模块
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // 快速路径: --version/-v - 零模块加载
  if (
    args.length === 1 &&
    (args[0] === '--version' || args[0] === '-v' || args[0] === '-V')
  ) {
    console.log(`${VERSION} (Claude Code Annotated)`)
    return
  }

  // TODO: 其他快速路径（参考源码）：
  // - --dump-system-prompt
  // - --claude-in-chrome-mcp
  // - --daemon-worker / daemon
  // - remote-control / bridge
  // - ps|logs|attach|kill (bg sessions)
  // - new|list|reply (templates)

  // 默认: 加载主模块
  // TODO: 实现 import('../main.tsx')
  console.log('Claude Code Annotated v' + VERSION)
  console.log('源码复刻项目 - 阶段 1：最小闭环')
  console.log('(主模块待实现)')
}

// 启动 CLI
void main()
