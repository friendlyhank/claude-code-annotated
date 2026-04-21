/**
 * 错误日志系统
 *
 * 设计原因：错误日志记录到内存和文件
 */

import { logForDebugging } from './debug.js'

// 内存错误日志缓冲区
const MAX_IN_MEMORY_ERRORS = 100
// 内存错误日志缓冲区
let inMemoryErrorLog: Array<{ error: string; timestamp: string }> = []

// 添加错误日志到内存缓冲区
function addToInMemoryErrorLog(errorInfo: {
  error: string
  timestamp: string
}): void {
  if (inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    inMemoryErrorLog.shift()
  }
  inMemoryErrorLog.push(errorInfo)
}

// 错误日志接收器
export type ErrorLogSink = {
  logError: (error: Error) => void
  logMCPError: (serverName: string, error: unknown) => void
  logMCPDebug: (serverName: string, message: string) => void
  getErrorsPath: () => string
  getMCPLogsPath: (serverName: string) => string
}

// 错误日志队列
type QueuedErrorEvent =
  | { type: 'error'; error: Error }
  | { type: 'mcpError'; serverName: string; error: unknown }
  | { type: 'mcpDebug'; serverName: string; message: string }

const errorQueue: QueuedErrorEvent[] = []
let errorLogSink: ErrorLogSink | null = null

// 初始化错误日志接收器
export function attachErrorLogSink(newSink: ErrorLogSink): void {
  if (errorLogSink !== null) {
    return
  }
  errorLogSink = newSink

  if (errorQueue.length > 0) {
    const queuedEvents = [...errorQueue]
    errorQueue.length = 0

    for (const event of queuedEvents) {
      switch (event.type) {
        case 'error':
          errorLogSink.logError(event.error)
          break
        case 'mcpError':
          errorLogSink.logMCPError(event.serverName, event.error)
          break
        case 'mcpDebug':
          errorLogSink.logMCPDebug(event.serverName, event.message)
          break
      }
    }
  }
}

// 转换为Error对象
function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error))
}

// 记录错误日志
export function logError(error: unknown): void {
  const err = toError(error)
  try {
    if (process.env.DISABLE_ERROR_REPORTING) {
      return
    }

    const errorStr = err.stack || err.message

    const errorInfo = {
      error: errorStr,
      timestamp: new Date().toISOString(),
    }

    addToInMemoryErrorLog(errorInfo)

    if (errorLogSink === null) {
      errorQueue.push({ type: 'error', error: err })
      return
    }

    errorLogSink.logError(err)
  } catch {
    // pass
  }
}

// 获取内存缓冲区中的错误日志
export function getInMemoryErrors(): { error: string; timestamp: string }[] {
  return [...inMemoryErrorLog]
}

// 记录MCP错误日志
export function logMCPError(serverName: string, error: unknown): void {
  try {
    if (errorLogSink === null) {
      errorQueue.push({ type: 'mcpError', serverName, error })
      return
    }

    errorLogSink.logMCPError(serverName, error)
  } catch {
    // Silently fail
  }
}

// 记录MCP调试日志
export function logMCPDebug(serverName: string, message: string): void {
  try {
    if (errorLogSink === null) {
      errorQueue.push({ type: 'mcpDebug', serverName, message })
      return
    }

    errorLogSink.logMCPDebug(serverName, message)
  } catch {
    // Silently fail
  }
}

// 日期转换为文件名
export function dateToFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

// 重置错误日志系统
export function _resetErrorLogForTesting(): void {
  errorLogSink = null
  errorQueue.length = 0
  inMemoryErrorLog = []
}
