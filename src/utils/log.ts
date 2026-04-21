/**
 * 错误日志系统
 *
 * 源码复刻: claude-code/src/utils/log.ts
 * 设计原因：错误日志记录到内存和文件
 */

import { logForDebugging } from './debug.js'

const MAX_IN_MEMORY_ERRORS = 100
let inMemoryErrorLog: Array<{ error: string; timestamp: string }> = []

function addToInMemoryErrorLog(errorInfo: {
  error: string
  timestamp: string
}): void {
  if (inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    inMemoryErrorLog.shift()
  }
  inMemoryErrorLog.push(errorInfo)
}

export type ErrorLogSink = {
  logError: (error: Error) => void
  logMCPError: (serverName: string, error: unknown) => void
  logMCPDebug: (serverName: string, message: string) => void
  getErrorsPath: () => string
  getMCPLogsPath: (serverName: string) => string
}

type QueuedErrorEvent =
  | { type: 'error'; error: Error }
  | { type: 'mcpError'; serverName: string; error: unknown }
  | { type: 'mcpDebug'; serverName: string; message: string }

const errorQueue: QueuedErrorEvent[] = []
let errorLogSink: ErrorLogSink | null = null

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

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error))
}

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

export function getInMemoryErrors(): { error: string; timestamp: string }[] {
  return [...inMemoryErrorLog]
}

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

export function dateToFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

export function _resetErrorLogForTesting(): void {
  errorLogSink = null
  errorQueue.length = 0
  inMemoryErrorLog = []
}
