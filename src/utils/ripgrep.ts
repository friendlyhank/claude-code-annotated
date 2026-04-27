/**
 * ripgrep 工具封装
 * 设计原因：
 * 1. 高性能文件搜索（比 Node.js 原生方法快得多）
 * 2. 支持 system/builtin/embedded 三种模式
 * 3. 超时、重试、错误恢复机制
 */

import type { ChildProcess, ExecFileException } from 'child_process'
import { execFile, spawn } from 'child_process'
import memoize from 'lodash-es/memoize.js'
import { homedir } from 'os'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { isInBundledMode } from './bundledMode.js'
import { logForDebugging } from './debug.js'
import { isEnvDefinedFalsy } from './envUtils.js'
import { execFileNoThrow } from './execFileNoThrow.js'
import { findExecutable } from './findExecutable.js'
import { logError } from './log.js'
import { getPlatform } from './platform.js'
import { countCharInString } from './stringUtils.js'

// TODO: analytics 待实现
// import { logEvent } from 'src/services/analytics/index.js'

const __filename = fileURLToPath(import.meta.url)
// 使用 node:path.join 而非 node:url.resolve，因为前者不编码空格
const __dirname = path.join(
  __filename,
  process.env.NODE_ENV === 'test' ? '../../../' : '../',
)

type RipgrepConfig = {
  mode: 'system' | 'builtin' | 'embedded'
  command: string
  args: string[]
  argv0?: string
}

const getRipgrepConfig = memoize((): RipgrepConfig => {
  const userWantsSystemRipgrep = isEnvDefinedFalsy(
    process.env.USE_BUILTIN_RIPGREP,
  )

  // 如果用户想要系统 ripgrep，尝试使用
  if (userWantsSystemRipgrep) {
    const { cmd: systemPath } = findExecutable('rg', [])
    if (systemPath !== 'rg') {
      // 安全：使用命令名 'rg' 而非 systemPath 防止 PATH 劫持
      // 如果使用 systemPath，当前目录中的恶意 ./rg.exe 可能被执行
      // 使用 'rg' 让操作系统安全地解析，利用 NoDefaultCurrentDirectoryInExePath 保护
      return { mode: 'system', command: 'rg', args: [] }
    }
  }

  // 在 bundled（native）模式下，ripgrep 静态编译到 bun-internal
  // 并根据 argv[0] 分发。我们以 argv0='rg' 启动自己
  if (isInBundledMode()) {
    return {
      mode: 'embedded',
      command: process.execPath,
      args: ['--no-config'],
      argv0: 'rg',
    }
  }

  const rgRoot = path.resolve(__dirname, 'vendor', 'ripgrep')
  const command =
    process.platform === 'win32'
      ? path.resolve(rgRoot, `${process.arch}-win32`, 'rg.exe')
      : path.resolve(rgRoot, `${process.arch}-${process.platform}`, 'rg')

  return { mode: 'builtin', command, args: [] }
})

export function ripgrepCommand(): {
  rgPath: string
  rgArgs: string[]
  argv0?: string
} {
  const config = getRipgrepConfig()
  return {
    rgPath: config.command,
    rgArgs: config.args,
    argv0: config.argv0,
  }
}

const MAX_BUFFER_SIZE = 20_000_000 // 20MB；大型 monorepo 可能有 200k+ 文件

/**
 * 检查错误是否为 EAGAIN（资源暂时不可用）
 * 这在资源受限环境（Docker、CI）中发生，当 ripgrep 尝试启动过多线程时
 */
function isEagainError(stderr: string): boolean {
  return (
    stderr.includes('os error 11') ||
    stderr.includes('Resource temporarily unavailable')
  )
}

/**
 * ripgrep 超时的自定义错误类
 * 允许调用者区分"无匹配"和"超时"
 */
export class RipgrepTimeoutError extends Error {
  constructor(
    message: string,
    public readonly partialResults: string[],
  ) {
    super(message)
    this.name = 'RipgrepTimeoutError'
  }
}

function ripGrepRaw(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  callback: (
    error: ExecFileException | null,
    stdout: string,
    stderr: string,
  ) => void,
  singleThread = false,
): ChildProcess {
  // 注意：交互式运行时，ripgrep 不需要路径作为最后一个参数
  // 但非交互式运行时，除非提供路径或文件模式，否则会挂起

  const { rgPath, rgArgs, argv0 } = ripgrepCommand()

  // 仅在此调用的重试中明确请求时使用单线程模式
  const threadArgs = singleThread ? ['-j', '1'] : []
  const fullArgs = [...rgArgs, ...threadArgs, ...args, target]
  // 允许通过环境变量配置超时（秒），否则使用平台默认值
  // WSL 对文件读取有严重的性能惩罚（WSL2 上慢 3-5 倍）
  const defaultTimeout = getPlatform() === 'wsl' ? 60_000 : 20_000
  const parsedSeconds =
    parseInt(process.env.CLAUDE_CODE_GLOB_TIMEOUT_SECONDS || '', 10) || 0
  const timeout = parsedSeconds > 0 ? parsedSeconds * 1000 : defaultTimeout

  // 对于嵌入式 ripgrep，使用 spawn 配合 argv0（execFile 不能正确支持 argv0）
  if (argv0) {
    const child = spawn(rgPath, fullArgs, {
      argv0,
      signal: abortSignal,
      // 防止 Windows 上显示控制台窗口（其他平台无操作）
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let stdoutTruncated = false
    let stderrTruncated = false

    child.stdout?.on('data', (data: Buffer) => {
      if (!stdoutTruncated) {
        stdout += data.toString()
        if (stdout.length > MAX_BUFFER_SIZE) {
          stdout = stdout.slice(0, MAX_BUFFER_SIZE)
          stdoutTruncated = true
        }
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      if (!stderrTruncated) {
        stderr += data.toString()
        if (stderr.length > MAX_BUFFER_SIZE) {
          stderr = stderr.slice(0, MAX_BUFFER_SIZE)
          stderrTruncated = true
        }
      }
    })

    // 设置超时并升级到 SIGKILL
    // 如果 ripgrep 阻塞在不可中断的 I/O，单独 SIGTERM 可能无法杀死
    // 如果 SIGTERM 在 5 秒内无效，升级到 SIGKILL（不可被捕获或忽略）
    // 在 Windows 上，child.kill('SIGTERM') 会抛出；使用默认信号
    let killTimeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutId = setTimeout(() => {
      if (process.platform === 'win32') {
        child.kill()
      } else {
        child.kill('SIGTERM')
        killTimeoutId = setTimeout(c => c.kill('SIGKILL'), 5_000, child)
      }
    }, timeout)

    // 在 Windows 上，'close' 和 'error' 可能为同一个进程触发
    // （例如 AbortSignal 杀死子进程时）。防止双重回调
    let settled = false
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      clearTimeout(killTimeoutId)
      if (code === 0 || code === 1) {
        // 0 = 找到匹配，1 = 无匹配（都是成功）
        callback(null, stdout, stderr)
      } else {
        const error: ExecFileException = new Error(
          `ripgrep exited with code ${code}`,
        )
        error.code = code ?? undefined
        error.signal = signal ?? undefined
        callback(error, stdout, stderr)
      }
    })

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      clearTimeout(killTimeoutId)
      const error: ExecFileException = err
      callback(error, stdout, stderr)
    })

    return child
  }

  // 对于非嵌入式 ripgrep，使用 execFile
  // 使用 SIGKILL 作为 killSignal，因为当 ripgrep 阻塞在不可中断的文件系统 I/O 时
  // SIGTERM 可能无法终止它
  // 在 Windows 上，SIGKILL 会抛出；使用默认值（undefined）发送 SIGTERM
  return execFile(
    rgPath,
    fullArgs,
    {
      maxBuffer: MAX_BUFFER_SIZE,
      signal: abortSignal,
      timeout,
      killSignal: process.platform === 'win32' ? undefined : 'SIGKILL',
    },
    callback,
  )
}

/**
 * 从 `rg --files` 流式计数行，不缓冲 stdout
 *
 * 在大型仓库（如 247k 文件，16MB 路径）上，调用 `ripGrep()` 仅为了读取 `.length`
 * 会实例化完整的 stdout 字符串加上 247k 元素的数组。这里改为计数每个块的换行字节；
 * 峰值内存是一个流块（~64KB）
 *
 * 故意最小化：唯一的调用者是遥测（countFilesRoundedRg），它会吞掉所有错误
 * 无 EAGAIN 重试、无 stderr 捕获、无内部超时（调用者传递 AbortSignal.timeout；
 * spawn 的 signal 选项会杀死 rg）
 */
async function ripGrepFileCount(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
): Promise<number> {
  await codesignRipgrepIfNecessary()
  const { rgPath, rgArgs, argv0 } = ripgrepCommand()

  return new Promise<number>((resolve, reject) => {
    const child = spawn(rgPath, [...rgArgs, ...args, target], {
      argv0,
      signal: abortSignal,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let lines = 0
    child.stdout?.on('data', (chunk: Buffer) => {
      lines += countCharInString(chunk, '\n')
    })

    // 在 Windows 上，'close' 和 'error' 可能为同一个进程触发
    let settled = false
    child.on('close', code => {
      if (settled) return
      settled = true
      if (code === 0 || code === 1) resolve(lines)
      else reject(new Error(`rg --files exited ${code}`))
    })
    child.on('error', err => {
      if (settled) return
      settled = true
      reject(err)
    })
  })
}

/**
 * ripgrep 结果流式处理，每个 stdout 块调用 `onLines`
 *
 * 与缓冲整个 stdout 的 `ripGrep()` 不同，这里在每个块到达时刷新完整的行——
 * 首批结果在 rg 仍在遍历树时就会显示（fzf `change:reload` 模式）
 * 部分尾部行会跨块边界传递
 *
 * 想要提前停止的调用者（例如 N 次匹配后）应该中止信号——
 * spawn 的 signal 选项会杀死 rg。无 EAGAIN 重试、无内部超时、stderr 被忽略；
 * 交互式调用者自行处理恢复
 */
export async function ripGrepStream(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  onLines: (lines: string[]) => void,
): Promise<void> {
  await codesignRipgrepIfNecessary()
  const { rgPath, rgArgs, argv0 } = ripgrepCommand()

  return new Promise<void>((resolve, reject) => {
    const child = spawn(rgPath, [...rgArgs, ...args, target], {
      argv0,
      signal: abortSignal,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    const stripCR = (l: string) => (l.endsWith('\r') ? l.slice(0, -1) : l)
    let remainder = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      const data = remainder + chunk.toString()
      const lines = data.split('\n')
      remainder = lines.pop() ?? ''
      if (lines.length) onLines(lines.map(stripCR))
    })

    // 在 Windows 上，'close' 和 'error' 可能为同一个进程触发
    let settled = false
    child.on('close', code => {
      if (settled) return
      // Abort 与 close 竞争——不要刷新被杀死进程的撕裂尾部
      // Promise 仍然会解决：spawn 的 signal 选项触发带
      // AbortError 的 'error' -> 下面的 reject
      if (abortSignal.aborted) return
      settled = true
      if (code === 0 || code === 1) {
        if (remainder) onLines([stripCR(remainder)])
        resolve()
      } else {
        reject(new Error(`ripgrep exited with code ${code}`))
      }
    })
    child.on('error', err => {
      if (settled) return
      settled = true
      reject(err)
    })
  })
}

// 调用 ripgrep 工具
export async function ripGrep(
  args: string[], // ripgrep 命令行参数
  target: string, // 搜索目标路径
  abortSignal: AbortSignal,
): Promise<string[]> {
  await codesignRipgrepIfNecessary()

  // 首次使用时测试 ripgrep 并缓存结果（发射后不管）
  void testRipgrepOnFirstUse().catch(error => {
    logError(error)
  })

  return new Promise((resolve, reject) => {
    const handleResult = (
      error: ExecFileException | null,
      stdout: string,
      stderr: string,
      isRetry: boolean,
    ): void => {
      // 成功情况
      if (!error) {
        resolve(
          stdout
            .trim()
            .split('\n')
            .map(line => line.replace(/\r$/, ''))
            .filter(Boolean),
        )
        return
      }

      // 退出码 1 是正常的"无匹配"
      if (error.code === 1) {
        resolve([])
        return
      }

      // 关键错误表明 ripgrep 损坏，而非"无匹配"
      // 这些应该报告给用户，而不是静默返回空结果
      const CRITICAL_ERROR_CODES = ['ENOENT', 'EACCES', 'EPERM']
      if (CRITICAL_ERROR_CODES.includes(error.code as string)) {
        reject(error)
        return
      }

      // 如果遇到 EAGAIN 且尚未重试，使用单线程模式重试
      // 注意：我们仅为此特定重试使用 -j 1，而非后续调用
      // 全局持久化单线程模式导致大型仓库超时，
      // 因为 EAGAIN 只是瞬态启动错误
      if (!isRetry && isEagainError(stderr)) {
        logForDebugging(
          `rg EAGAIN error detected, retrying with single-threaded mode (-j 1)`,
        )
        // TODO: analytics 待实现
        // logEvent('tengu_ripgrep_eagain_retry', {})
        ripGrepRaw(
          args,
          target,
          abortSignal,
          (retryError, retryStdout, retryStderr) => {
            handleResult(retryError, retryStdout, retryStderr, true)
          },
          true, // 仅为此重试强制单线程模式
        )
        return
      }

      // 对于所有其他错误，尝试返回部分结果（如果有）
      const hasOutput = stdout && stdout.trim().length > 0
      const isTimeout =
        error.signal === 'SIGTERM' ||
        error.signal === 'SIGKILL' ||
        error.code === 'ABORT_ERR'
      const isBufferOverflow =
        error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'

      let lines: string[] = []
      if (hasOutput) {
        lines = stdout
          .trim()
          .split('\n')
          .map(line => line.replace(/\r$/, ''))
          .filter(Boolean)
        // 超时和缓冲区溢出时丢弃最后一行——可能不完整
        if (lines.length > 0 && (isTimeout || isBufferOverflow)) {
          lines = lines.slice(0, -1)
        }
      }

      logForDebugging(
        `rg error (signal=${error.signal}, code=${error.code}, stderr: ${stderr}), ${lines.length} results`,
      )

      // code 2 = ripgrep 用法错误（已处理）；ABORT_ERR = 调用者
      // 明确中止（不是错误，只是取消——交互式调用者
      // 可能在每次去抖动后的按键时中止）
      if (error.code !== 2 && error.code !== 'ABORT_ERR') {
        logError(error)
      }

      // 如果超时且无结果，抛出错误让 Claude 知道搜索
      // 未完成，而非认为无匹配
      if (isTimeout && lines.length === 0) {
        reject(
          new RipgrepTimeoutError(
            `Ripgrep search timed out after ${getPlatform() === 'wsl' ? 60 : 20} seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.`,
            lines,
          ),
        )
        return
      }

      resolve(lines)
    }

    ripGrepRaw(args, target, abortSignal, (error, stdout, stderr) => {
      handleResult(error, stdout, stderr, false)
    })
  })
}

/**
 * 使用 ripgrep 递归计算目录中的文件数并四舍五入到最近的 10 的幂以保护隐私
 *
 * 这比使用原生 Node.js 方法计算大型目录中的文件数高效得多
 * 因为它使用 ripgrep 高度优化的文件遍历
 *
 * @param path 要计算文件的目录路径
 * @param abortSignal 取消操作的 AbortSignal
 * @param ignorePatterns 可选的额外忽略模式（超出 .gitignore）
 * @returns 四舍五入到最近 10 的幂的大致文件数
 */
export const countFilesRoundedRg = memoize(
  async (
    dirPath: string,
    abortSignal: AbortSignal,
    ignorePatterns: string[] = [],
  ): Promise<number | undefined> => {
    // 跳过主目录中的文件计数，避免触发
    // macOS TCC 权限对话框（Desktop、Downloads、Documents 等）
    if (path.resolve(dirPath) === path.resolve(homedir())) {
      return undefined
    }

    try {
      // 构建 ripgrep 参数：
      // --files: 列出将被搜索的文件（而非搜索它们）
      // --count: 仅打印每个文件的匹配行计数
      // --no-ignore-parent: 不遵守父目录中的忽略文件
      // --hidden: 搜索隐藏文件和目录
      const args = ['--files', '--hidden']

      // 添加忽略模式（如果提供）
      ignorePatterns.forEach(pattern => {
        args.push('--glob', `!${pattern}`)
      })

      const count = await ripGrepFileCount(args, dirPath, abortSignal)

      // 四舍五入到最近的 10 的幂以保护隐私
      if (count === 0) return 0

      const magnitude = Math.floor(Math.log10(count))
      const power = Math.pow(10, magnitude)

      // 四舍五入到最近的 10 的幂
      // 例如，8 -> 10, 42 -> 100, 350 -> 100, 750 -> 1000
      return Math.round(count / power) * power
    } catch (error) {
      // AbortSignal.timeout 在大型/慢速仓库上触发是预期的，不是错误
      if ((error as Error)?.name !== 'AbortError') logError(error)
    }
  },
  // lodash memoize 的默认解析器只使用第一个参数
  // ignorePatterns 影响结果，所以将它们包含在缓存键中
  // abortSignal 故意排除——它不影响计数
  (dirPath, _abortSignal, ignorePatterns = []) =>
    `${dirPath}|${ignorePatterns.join(',')}`,
)

// 存储 ripgrep 可用性状态的单例
let ripgrepStatus: {
  working: boolean
  lastTested: number
  config: RipgrepConfig
} | null = null

/**
 * 获取 ripgrep 状态和配置信息
 * 立即返回当前配置，可用状态（如果已测试）
 */
export function getRipgrepStatus(): {
  mode: 'system' | 'builtin' | 'embedded'
  path: string
  working: boolean | null // null 表示尚未测试
} {
  const config = getRipgrepConfig()
  return {
    mode: config.mode,
    path: config.command,
    working: ripgrepStatus?.working ?? null,
  }
}

/**
 * 首次使用时测试 ripgrep 可用性并缓存结果
 */
const testRipgrepOnFirstUse = memoize(async (): Promise<void> => {
  // 已测试
  if (ripgrepStatus !== null) {
    return
  }

  const config = getRipgrepConfig()

  try {
    let test: { code: number; stdout: string }

    // 对于嵌入式 ripgrep，使用 Bun.spawn 配合 argv0
    if (config.argv0) {
      // 只有 Bun 嵌入 ripgrep
      // eslint-disable-next-line custom-rules/require-bun-typeof-guard
      const proc = Bun.spawn([config.command, '--version'], {
        argv0: config.argv0,
        stderr: 'ignore',
        stdout: 'pipe',
      })

      // Bun 的 ReadableStream 有 .text() 在运行时，但 TS 类型不反映它
      const [stdout, code] = await Promise.all([
        (proc.stdout as unknown as Blob).text(),
        proc.exited,
      ])
      test = {
        code,
        stdout,
      }
    } else {
      test = await execFileNoThrow(
        config.command,
        [...config.args, '--version'],
        {
          timeout: 5000,
        },
      )
    }

    const working =
      test.code === 0 && !!test.stdout && test.stdout.startsWith('ripgrep ')

    ripgrepStatus = {
      working,
      lastTested: Date.now(),
      config,
    }

    logForDebugging(
      `Ripgrep first use test: ${working ? 'PASSED' : 'FAILED'} (mode=${config.mode}, path=${config.command})`,
    )

    // TODO: analytics 待实现
    // logEvent('tengu_ripgrep_availability', {
    //   working: working ? 1 : 0,
    //   using_system: config.mode === 'system' ? 1 : 0,
    // })
  } catch (error) {
    ripgrepStatus = {
      working: false,
      lastTested: Date.now(),
      config,
    }
    logError(error)
  }
})

let alreadyDoneSignCheck = false
async function codesignRipgrepIfNecessary() {
  if (process.platform !== 'darwin' || alreadyDoneSignCheck) {
    return
  }

  alreadyDoneSignCheck = true

  // 只签名独立的 vendored rg 二进制文件（npm 构建）
  const config = getRipgrepConfig()
  if (config.mode !== 'builtin') {
    return
  }
  const builtinPath = config.command

  // 首先，检查 ripgrep 是否已经签名
  const lines = (
    await execFileNoThrow('codesign', ['-vv', '-d', builtinPath], {
      preserveOutputOnError: false,
    })
  ).stdout.split('\n')

  const needsSigned = lines.find(line => line.includes('linker-signed'))
  if (!needsSigned) {
    return
  }

  try {
    const signResult = await execFileNoThrow('codesign', [
      '--sign',
      '-',
      '--force',
      '--preserve-metadata=entitlements,requirements,flags,runtime',
      builtinPath,
    ])

    if (signResult.code !== 0) {
      logError(
        new Error(
          `Failed to sign ripgrep: ${signResult.stdout} ${signResult.stderr}`,
        ),
      )
    }

    const quarantineResult = await execFileNoThrow('xattr', [
      '-d',
      'com.apple.quarantine',
      builtinPath,
    ])

    if (quarantineResult.code !== 0) {
      logError(
        new Error(
          `Failed to remove quarantine: ${quarantineResult.stdout} ${quarantineResult.stderr}`,
        ),
      )
    }
  } catch (e) {
    logError(e)
  }
}
