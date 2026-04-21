/**
 * 调试模式测试脚本
 *
 * 使用方法:
 * USER_TYPE=ant DEBUG=1 CLAUDE_CODE_DEBUG_LOG_LEVEL=verbose npx tsx src/utils/__tests__/debug-test.ts
 */

import { logForDebugging, isDebugMode, getDebugLogPath, getMinDebugLogLevel, enableDebugLogging, flushDebugLogs } from '../debug.js'

async function main() {
  console.log('=== 调试模式测试 ===')
  console.log('USER_TYPE:', process.env.USER_TYPE)
  console.log('DEBUG:', process.env.DEBUG)
  console.log('CLAUDE_CODE_DEBUG_LOG_LEVEL:', process.env.CLAUDE_CODE_DEBUG_LOG_LEVEL)
  console.log('isDebugMode():', isDebugMode())
  console.log('getMinDebugLogLevel():', getMinDebugLogLevel())
  console.log('getDebugLogPath():', getDebugLogPath())
  console.log()

  // 测试不同日志级别
  logForDebugging('这是一条 verbose 级别日志', { level: 'verbose' })
  logForDebugging('这是一条 debug 级别日志', { level: 'debug' })
  logForDebugging('这是一条 info 级别日志', { level: 'info' })
  logForDebugging('这是一条 warn 级别日志', { level: 'warn' })
  logForDebugging('这是一条 error 级别日志', { level: 'error' })

  // 测试动态启用调试
  console.log('动态启用调试模式...')
  const wasActive = enableDebugLogging()
  console.log('之前是否已激活:', wasActive)
  console.log('现在 isDebugMode():', isDebugMode())

  logForDebugging('动态启用后的日志', { level: 'debug' })

  // 测试类别过滤
  logForDebugging('api: API 请求日志', { level: 'debug' })
  logForDebugging('[MCP] MCP 服务器日志', { level: 'debug' })
  logForDebugging('MCP server "test-server": 连接成功', { level: 'debug' })
  logForDebugging('[ANT-ONLY] 1P event: tengu_timer', { level: 'debug' })

  // 刷新日志
  await flushDebugLogs()

  console.log()
  console.log('=== 测试完成 ===')
  console.log('日志文件路径:', getDebugLogPath())
}

main().catch(console.error)
