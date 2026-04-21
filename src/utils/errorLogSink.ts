/**
 * 错误日志接收器实现
 *
 */

import axios from 'axios'
import { dirname, join } from 'path'
import { getSessionId } from '../bootstrap/state.js'
import { createBufferedWriter } from './bufferedWriter.js'
import { CACHE_PATHS } from './cachePaths.js'
import { registerCleanup } from './cleanupRegistry.js'
import { logForDebugging } from './debug.js'
import { getFsImplementation } from './fsOperations.js'
import { attachErrorLogSink, dateToFilename } from './log.js'
import { jsonStringify } from './slowOperations.js'
import { captureException } from './sentry.js'

// 错误日志文件名
const DATE = dateToFilename(new Date())

// 获取错误日志文件路径
export function getErrorsPath(): string {
  return join(CACHE_PATHS.errors(), DATE + '.jsonl')
}

// 获取MCP日志文件路径
export function getMCPLogsPath(serverName: string): string {
  return join(CACHE_PATHS.mcpLogs(serverName), DATE + '.jsonl')
}

// JSONL写入器
type JsonlWriter = {
  write: (obj: object) => void
  flush: () => void
  dispose: () => void
}

// 创建JSONL写入器
function createJsonlWriter(options: {
  writeFn: (content: string) => void
  flushIntervalMs?: number
  maxBufferSize?: number
}): JsonlWriter {
  const writer = createBufferedWriter(options)
  return {
    write(obj: object): void {
      writer.write(jsonStringify(obj) + '\n')
    },
    flush: writer.flush,
    dispose: writer.dispose,
  }
}

// 日志写入器缓存
const logWriters = new Map<string, JsonlWriter>()

// 刷新所有日志写入器
export function _flushLogWritersForTesting(): void {
  for (const writer of logWriters.values()) {
    writer.flush()
  }
}

// 清除所有日志写入器
export function _clearLogWritersForTesting(): void {
  for (const writer of logWriters.values()) {
    writer.dispose()
  }
  logWriters.clear()
}

// 获取日志写入器
function getLogWriter(path: string): JsonlWriter {
  let writer = logWriters.get(path)
  if (!writer) {
    const dir = dirname(path)
    writer = createJsonlWriter({
      writeFn: (content: string) => {
        try {
          getFsImplementation().appendFileSync(path, content)
        } catch {
          getFsImplementation().mkdirSync(dir)
          getFsImplementation().appendFileSync(path, content)
        }
      },
      flushIntervalMs: 1000,
      maxBufferSize: 50,
    })
    logWriters.set(path, writer)
    registerCleanup(async () => writer?.dispose())
  }
  return writer
}

// 追加日志消息
function appendToLog(path: string, message: object): void {
  if (process.env.USER_TYPE !== 'ant') {
    return
  }

  const messageWithTimestamp = {
    timestamp: new Date().toISOString(),
    ...message,
    cwd: getFsImplementation().cwd(),
    userType: process.env.USER_TYPE,
    sessionId: getSessionId(),
    version: MACRO.VERSION,
  }

  getLogWriter(path).write(messageWithTimestamp)
}

// 从响应数据中提取服务器消息
function extractServerMessage(data: unknown): string | undefined {
  if (typeof data === 'string') {
    return data
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.message === 'string') {
      return obj.message
    }
    if (
      typeof obj.error === 'object' &&
      obj.error &&
      'message' in obj.error &&
      typeof (obj.error as Record<string, unknown>).message === 'string'
    ) {
      return (obj.error as Record<string, unknown>).message as string
    }
  }
  return undefined
}

// 记录错误日志
function logErrorImpl(error: Error): void {
  const errorStr = error.stack || error.message

  let context = ''
  if (axios.isAxiosError(error) && error.config?.url) {
    const parts = [`url=${error.config.url}`]
    if (error.response?.status !== undefined) {
      parts.push(`status=${error.response.status}`)
    }
    const serverMessage = extractServerMessage(error.response?.data)
    if (serverMessage) {
      parts.push(`body=${serverMessage}`)
    }
    context = `[${parts.join(',')}] `
  }

  logForDebugging(`${error.name}: ${context}${errorStr}`, { level: 'error' })

  appendToLog(getErrorsPath(), {
    error: `${context}${errorStr}`,
  })

  captureException(error)
}

// 记录MCP错误日志
function logMCPErrorImpl(serverName: string, error: unknown): void {
  logForDebugging(`MCP server "${serverName}" ${error}`, { level: 'error' })

  const logFile = getMCPLogsPath(serverName)
  const errorStr =
    error instanceof Error ? error.stack || error.message : String(error)

  const errorInfo = {
    error: errorStr,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: getFsImplementation().cwd(),
  }

  getLogWriter(logFile).write(errorInfo)
}

// 记录MCP调试日志
function logMCPDebugImpl(serverName: string, message: string): void {
  logForDebugging(`MCP server "${serverName}": ${message}`)

  const logFile = getMCPLogsPath(serverName)

  const debugInfo = {
    debug: message,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: getFsImplementation().cwd(),
  }

  getLogWriter(logFile).write(debugInfo)
}

// 初始化错误日志接收器
export function initializeErrorLogSink(): void {
  attachErrorLogSink({
    logError: logErrorImpl,
    logMCPError: logMCPErrorImpl,
    logMCPDebug: logMCPDebugImpl,
    getErrorsPath,
    getMCPLogsPath,
  })

  logForDebugging('Error log sink initialized')
}
