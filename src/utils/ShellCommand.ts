/**
 * ShellCommand - Shell 命令执行抽象
 *
 * 对齐上游实现：按 claude-code/src/utils/ShellCommand.ts 原样复刻
 * 当前实现：ExecResult 类型 + ShellCommand 接口 + 简化版 ShellCommandImpl
 * 设计原因：
 * 1. ExecResult 统一命令执行结果格式（stdout/stderr/code/interrupted）
 * 2. ShellCommand 接口抽象命令生命周期（running/completed/killed）
 * 3. wrapSpawn 将 child_process.spawn 的结果封装为 ShellCommand
 *
 * TODO: StreamWrapper、TaskOutput 集成、后台任务支持、size watchdog 待后续补齐
 */

import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

// ============================================================================
// ExecResult - 命令执行结果
// ============================================================================

export type ExecResult = {
  stdout: string
  stderr: string
  code: number
  interrupted: boolean
  backgroundTaskId?: string
  backgroundedByUser?: boolean
  /** 助手模式自动后台化长时间运行的阻塞命令 */
  assistantAutoBackgrounded?: boolean
  /** stdout 过大时指向磁盘输出文件 */
  outputFilePath?: string
  /** 输出文件大小（字节） */
  outputFileSize?: number
  /** 输出文件的任务 ID */
  outputTaskId?: string
  /** 命令在 spawn 前就失败（如 CWD 被删除） */
  preSpawnError?: string
}

// ============================================================================
// ShellCommand - 命令生命周期接口
// ============================================================================

export type ShellCommand = {
  /** 将命令转为后台任务 */
  background: (backgroundTaskId: string) => boolean
  /** 命令执行结果 Promise */
  result: Promise<ExecResult>
  /** 强制终止命令 */
  kill: () => void
  /** 当前状态 */
  status: 'running' | 'backgrounded' | 'completed' | 'killed'
  /** 清理流资源（事件监听器） */
  cleanup: () => void
  /** 超时回调 */
  onTimeout?: (
    callback: (backgroundFn: (taskId: string) => boolean) => void,
  ) => void
}

// ============================================================================
// 工厂函数
// ============================================================================

const SIGTERM = 143

/**
 * 将 child_process 封装为 ShellCommand
 * 对齐上游：ShellCommandImpl 的简化版，支撑 BashTool 简单版
 * 设计原因：spawn 返回的 ChildProcess 需要统一的生命周期管理接口
 *
 * TODO: 完整版包含 TaskOutput、文件模式输出、size watchdog、auto-background
 */
export function wrapSpawn(
  childProcess: ChildProcess, // 子进程
  abortSignal: AbortSignal, // 中断信号
  timeout: number, // 超时时间
  // taskOutput 参数 — 完整版使用 TaskOutput 做进度追踪和文件输出
  // 简单版暂不使用
  _taskOutput?: unknown, // 任务输出
  // 是否自动后台化
   _shouldAutoBackground?: boolean,
): ShellCommand {
  let status: 'running' | 'backgrounded' | 'completed' | 'killed' =
    'running'

  let stdout = ''
  let stderr = ''

  // 收集 stdout
  if (childProcess.stdout) {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', (data: string) => {
      stdout += data
    })
  }

  // 收集 stderr
  if (childProcess.stderr) {
    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', (data: string) => {
      stderr += data
    })
  }

  // 超时处理
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let killedByTimeout = false

  // 中断处理
  let interrupted = false

  const resultPromise = new Promise<ExecResult>((resolve) => {
    // 超时自动终止
    timeoutId = setTimeout(() => {
      if (status === 'running') {
        killedByTimeout = true
        kill()
      }
    }, timeout)

    // abort signal 处理
    function onAbort(): void {
      //  用户提交了新消息导致当前命令被中断。此时不杀进程，而是让调用方将进程转为后台运行，转为软中断；表示用户只是想转向新对话，不想让正在跑的命令直接死掉；
      if (abortSignal.reason === 'interrupt') {
        // 用户提交新消息时中断，不直接 kill
        interrupted = true
        return
      }
      kill()
    }
    // 监听中断信号
    abortSignal.addEventListener('abort', onAbort, { once: true })

    // 退出处理
    childProcess.once('exit', (code, signal) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      // 移除中断信号监听器
      abortSignal.removeEventListener('abort', onAbort)

      if (status !== 'killed') {
        status = 'completed'
      }

      const exitCode =
        code !== null && code !== undefined
          ? code
          : signal
            ? 1
            : 0

      resolve({
        stdout: stdout.trimEnd(), // 去掉末尾的换行符
        stderr: stderr.trimEnd(), // 去掉末尾的换行符
        code: exitCode, // 退出码
        // 是否被中断 
        interrupted: interrupted || killedByTimeout,
      })
    })

    childProcess.once('error', (err) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      abortSignal.removeEventListener('abort', onAbort)
      status = 'completed'
      resolve({
        stdout: '',
        stderr: err.message,
        code: 1,
        interrupted: false,
      })
    })
  })

  function kill(): void {
    if (status === 'running' || status === 'backgrounded') {
      status = 'killed'
      interrupted = true
      try {
        // 尝试杀死整个进程树
        if (childProcess.pid) {
          process.kill(-childProcess.pid, 'SIGTERM')
        }
      } catch {
        // 进程可能已经退出
        try {
          childProcess.kill('SIGTERM')
        } catch {
          // 忽略
        }
      }
    }
  }

  return {
    // 后台化处理
    background(_backgroundTaskId: string): boolean {
      // TODO: 后台任务支持待后续补齐
      return false
    },
    result: resultPromise,
    kill,
    get status() {
      return status
    },
    cleanup(): void {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    },
  }
}

/**
 * 创建已中止的命令（spawn 前就发现 abort）
 * 对齐上游：createAbortedCommand
 */
export function createAbortedCommand(
  _options?: unknown,
  overrides?: Partial<ExecResult>,
): ShellCommand {
  // 创建已中止的命令
  const result: ExecResult = {
    stdout: '',
    stderr: '',
    code: 130, // SIGINT 标准退出码
    interrupted: true,
    ...overrides,
  }
  return {
    background: () => false,
    result: Promise.resolve(result),
    kill: () => {},
    status: 'killed',
    cleanup: () => {},
  }
}

/**
 * 创建失败的命令（spawn 前就失败，如 CWD 不存在）
 * 对齐上游：createFailedCommand
 */
export function createFailedCommand(errorMessage: string): ShellCommand {
  const result: ExecResult = {
    stdout: '',
    stderr: '',
    code: 126, // 标准执行错误退出码
    interrupted: false,
    preSpawnError: errorMessage,
  }
  return {
    background: () => false,
    result: Promise.resolve(result),
    kill: () => {},
    status: 'completed',
    cleanup: () => {},
  }
}
