/**
 * 调试日志缓冲写入器
 *
 * 设计原因：
 * - 减少频繁 I/O，缓冲后批量写入
 * - 支持立即模式（调试时同步写入）和缓冲模式
 */

type WriteFn = (content: string) => void

// 缓冲写入器类型
export type BufferedWriter = {
  write: (content: string) => void // 写入内容到缓冲区
   flush: () => void // 手动刷新缓冲区内容
  dispose: () => void // 释放资源
}

// 创建缓冲写入器
export function createBufferedWriter({
  writeFn, // 写入函数，用于实际写入内容
  flushIntervalMs = 1000, // 刷新间隔，毫秒
  maxBufferSize = 100, // 最大缓冲区大小，消息数量
  maxBufferBytes = Infinity, // 最大缓冲区大小，字节数
  immediateMode = false, // 是否立即模式，调试时同步写入
}: {
  writeFn: WriteFn // 写入函数，用于实际写入内容
  flushIntervalMs?: number // 刷新间隔，毫秒
  maxBufferSize?: number // 最大缓冲区大小，消息数量
  maxBufferBytes?: number // 最大缓冲区大小，字节数
  immediateMode?: boolean // 是否立即模式，调试时同步写入
}): BufferedWriter {
  let buffer: string[] = []
  let bufferBytes = 0
  let flushTimer: NodeJS.Timeout | null = null
  let pendingOverflow: string[] | null = null

  // 清除刷新定时器
  function clearTimer(): void {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  // 刷新缓冲区内容
  function flush(): void {
    if (pendingOverflow) {
      writeFn(pendingOverflow.join(''))
      pendingOverflow = null
    }
    if (buffer.length === 0) return
    writeFn(buffer.join(''))
    buffer = []
    bufferBytes = 0
    clearTimer()
  }

  // 安排刷新定时器
  function scheduleFlush(): void {
    if (!flushTimer) {
      flushTimer = setTimeout(flush, flushIntervalMs)
    }
  }

  function flushDeferred(): void {
    if (pendingOverflow) {
      pendingOverflow.push(...buffer)
      buffer = []
      bufferBytes = 0
      clearTimer()
      return
    }
    const detached = buffer
    buffer = []
    bufferBytes = 0
    clearTimer()
    pendingOverflow = detached
    setImmediate(() => {
      const toWrite = pendingOverflow
      pendingOverflow = null
      if (toWrite) writeFn(toWrite.join(''))
    })
  }

  return {
    write(content: string): void {
      if (immediateMode) {
        writeFn(content)
        return
      }
      buffer.push(content)
      bufferBytes += content.length
      scheduleFlush()
      if (buffer.length >= maxBufferSize || bufferBytes >= maxBufferBytes) {
        flushDeferred()
      }
    },
    flush,
    dispose(): void {
      flush()
    },
  }
}
