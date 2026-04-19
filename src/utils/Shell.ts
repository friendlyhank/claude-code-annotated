/**
 * Shell - 命令执行引擎
 *
 * 当前实现：exec 函数简化版 — 使用 child_process.spawn 执行 bash 命令
 * 设计原因：
 * 1. exec() 是所有 shell 命令执行的唯一入口
 * 2. 使用 ShellCommand 抽象命令生命周期
 * 3. 支持 abort signal 和超时控制
 *
 * TODO: findSuitableShell 完整版、ShellProvider/ShellConfig、PowerShell 支持、
 *       sandbox 集成、CWD 恢复追踪、subprocessEnv 环境变量注入待后续补齐
 */

import { spawn } from 'child_process'
import { realpath } from 'fs/promises'
import { getCwdState, getOriginalCwd, setCwdState } from '../bootstrap/state.js'
import { pwd } from './cwd.js'
import {
  createAbortedCommand,
  createFailedCommand,
  type ExecResult,
  type ShellCommand,
  wrapSpawn,
} from './ShellCommand.js'

export type { ExecResult } from './ShellCommand.js'

const DEFAULT_TIMEOUT = 30 * 60 * 1000 // 30 分钟

// ============================================================================
// Shell 类型与配置
// ============================================================================

export type ShellType = 'bash' | 'powershell'

export type ShellConfig = {
  provider: {
    type: ShellType // shell 类型
    shellPath: string // shell 路径
    detached: boolean // 是否分离进程
    getSpawnArgs: (commandString: string) => string[] // 构建 spawn 参数
  }
}

// ============================================================================
// findSuitableShell - 查找可用 shell
// ============================================================================

/**
 * 确定最佳可用 shell
 * 对齐上游：按 CLAUDE_CODE_SHELL > SHELL > which(zsh/bash) 优先级检测
 * 当前简化版：只检查环境变量和默认路径
 * TODO: 完整版需要 which() 函数做路径查找
 */
export async function findSuitableShell(): Promise<string> {
  // 1. 环境变量覆盖
  const shellOverride = process.env.CLAUDE_CODE_SHELL // 通过环境变量配置
  if (shellOverride) {
    return shellOverride
  }

  // 2. 用户默认 shell
  const envShell = process.env.SHELL
  if (envShell && (envShell.includes('bash') || envShell.includes('zsh'))) {
    return envShell
  }

  // 3. 平台默认
  return '/bin/bash'
}

// ============================================================================
// getShellConfig - 获取 shell 配置
// ============================================================================

let cachedShellConfig: ShellConfig | null = null

/**
 * 获取当前 shell 配置（带缓存）
 * 对齐上游：getShellConfig 使用 memoize
 * 当前简化版：只支持 bash
 * TODO: PowerShell 支持、完整 ShellProvider 接口
 */
export async function getShellConfig(): Promise<ShellConfig> {
  if (cachedShellConfig) {
    return cachedShellConfig
  }

  // 查找可用 shell
  const shellPath = await findSuitableShell()
  cachedShellConfig = {
    provider: {
      type: 'bash', // 假设默认是 bash
      shellPath, // shell 路径
      detached: true, // 是否分离进程
      getSpawnArgs: (commandString: string) => ['-c', '-l', commandString], // 构建 spawn 参数
    },
  }
  return cachedShellConfig
}

// ============================================================================
// ExecOptions - 命令执行选项
// ============================================================================

export type ExecOptions = {
  timeout?: number // 超时时间（毫秒）
  /** 进度回调 */
  onProgress?: (
    lastLines: string, // 最新输出行
    allLines: string, // 所有输出行
    totalLines: number, // 总行数
    totalBytes: number, // 总字节数
    isIncomplete: boolean, // 是否为不完整输出
  ) => void
  preventCwdChanges?: boolean // 是否防止 CWD 变化
  shouldUseSandbox?: boolean // 是否使用沙箱
  shouldAutoBackground?: boolean // 是否自动后台运行
  /** pipe 模式下的 stdout 回调 */
  onStdout?: (data: string) => void
}

// ============================================================================
// exec - 核心执行函数
// ============================================================================

/**
 * 使用环境快照执行 shell 命令
 * 对齐上游：Shell.ts exec() 函数
 * 当前简化版：spawn + ShellCommand 封装，不含 sandbox/CWD 追踪
 *
 * 设计原因：
 * - 每次执行创建新的 shell 进程（无状态复用，避免环境污染）
 * - 支持 abort signal（用户中断或超时）
 * - 通过 ShellCommand 接口统一生命周期管理
 */
export async function exec(
  command: string, // 要执行的命令
  abortSignal: AbortSignal, // 中断信号
  shellType: ShellType, // shell 类型
  options?: ExecOptions, // 执行选项
): Promise<ShellCommand> {
  const { timeout } = options ?? {}
  const commandTimeout = timeout || DEFAULT_TIMEOUT

  // 获取 shell 配置
  const config = await getShellConfig()
  const provider = config.provider

  // 构建 shell 命令
  const commandString = command
  // 构建 spawn 参数
  const shellArgs = provider.getSpawnArgs(commandString)

  // 获取当前工作目录
  let cwd = pwd()

  // 恢复 CWD：如果当前 CWD 不再存在于磁盘上
  try {
    await realpath(cwd)
  } catch {
    const fallback = getOriginalCwd()
    try {
      await realpath(fallback)
      setCwdState(fallback)
      cwd = fallback
    } catch {
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists. Please restart from an existing directory.`,
      )
    }
  }

  // 已中止则直接返回
  if (abortSignal.aborted) {
    return createAbortedCommand()
  }

  // 执行 shell 命令
  const binShell = provider.shellPath

  try {
    // spawn 子进程
    const childProcess = spawn(binShell, shellArgs, {
      env: {
        ...process.env,
        SHELL: shellType === 'bash' ? binShell : undefined,
        GIT_EDITOR: 'true', // 禁用 git 编辑器
        CLAUDECODE: '1', // 标记为 Claude Code 执行
      },
      cwd, // 工作目录
      stdio: ['pipe', 'pipe', 'pipe'], // 管道输出
      detached: provider.detached, // 是否分离进程
      windowsHide: true, // 隐藏窗口
    })

    // pipe 模式下附加 onStdout 回调
    if (childProcess.stdout && options?.onStdout) {
      // 监听 stdout 数据
      const onStdout = options.onStdout
      childProcess.stdout.on('data', (chunk: string | Buffer) => {
        onStdout(typeof chunk === 'string' ? chunk : chunk.toString())
      })
    }

    // 包装 spawn 进程
    const shellCommand = wrapSpawn(
      childProcess,
      abortSignal,
      commandTimeout,
    )

    return shellCommand
  } catch (error) {
    // spawn 失败
    return createAbortedCommand(undefined, {
      code: 126,
      stderr: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================================
// setCwd - 设置当前工作目录
// ============================================================================

/**
 * 设置当前工作目录
 * 对齐上游：Shell.ts setCwd()
 * 设计原因：shell 命令执行后可能 cd 到新目录，需要同步全局状态
 */
export function setCwd(path: string, _relativeTo?: string): void {
  setCwdState(path)
}
