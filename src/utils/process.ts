/**
 * 进程输出工具函数
 *
 * 设计原因：安全写入 stdout/stderr，处理 EPIPE 错误
 */

// EPIPE 错误处理函数
function handleEPIPE(
  stream: NodeJS.WriteStream,
): (err: NodeJS.ErrnoException) => void {
  return (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      stream.destroy()
    }
  }
}

// 注册进程输出错误处理函数
export function registerProcessOutputErrorHandlers(): void {
  process.stdout.on('error', handleEPIPE(process.stdout))
  process.stderr.on('error', handleEPIPE(process.stderr))
}

// 写入进程输出流
function writeOut(stream: NodeJS.WriteStream, data: string): void {
  if (stream.destroyed) {
    return
  }
  stream.write(data)
}

// 写入 stdout
export function writeToStdout(data: string): void {
  writeOut(process.stdout, data)
}

// 写入 stderr
export function writeToStderr(data: string): void {
  writeOut(process.stderr, data)
}

// 退出进程并打印错误消息
export function exitWithError(message: string): never {
  console.error(message)
  process.exit(1)
}

// 检查标准输入流是否有数据可读
export function peekForStdinData(
  stream: NodeJS.EventEmitter,
  ms: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const done = (timedOut: boolean) => {
      clearTimeout(peek)
      stream.off('end', onEnd)
      stream.off('data', onFirstData)
      void resolve(timedOut)
    }
    const onEnd = () => done(false)
    const onFirstData = () => clearTimeout(peek)
    const peek = setTimeout(done, ms, true)
    stream.once('end', onEnd)
    stream.once('data', onFirstData)
  })
}
