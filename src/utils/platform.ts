/**
 * 平台检测工具
 *
 * 对齐上游实现：按 claude-code/src/utils/platform.ts 原样复刻
 * 设计原因：跨平台兼容性处理，支持 macOS、Windows、WSL、Linux
 */

import memoize from 'lodash-es/memoize.js'
import { release as osRelease } from 'os'
import { getFsImplementation } from './fsOperations.js'
import { logError } from './log.js'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

export const SUPPORTED_PLATFORMS: Platform[] = ['macos', 'wsl']

export const getPlatform = memoize((): Platform => {
  try {
    if (process.platform === 'darwin') {
      return 'macos'
    }

    if (process.platform === 'win32') {
      return 'windows'
    }

    if (process.platform === 'linux') {
      // 检查是否在 WSL (Windows Subsystem for Linux) 中运行
      try {
        const procVersion = getFsImplementation().readFileSync(
          '/proc/version',
          { encoding: 'utf8' },
        )
        if (
          procVersion.toLowerCase().includes('microsoft') ||
          procVersion.toLowerCase().includes('wsl')
        ) {
          return 'wsl'
        }
      } catch (error) {
        // 读取 /proc/version 失败，假设为普通 Linux
        logError(error)
      }

      // 普通 Linux
      return 'linux'
    }

    // 未知平台
    return 'unknown'
  } catch (error) {
    logError(error)
    return 'unknown'
  }
})

export const getWslVersion = memoize((): string | undefined => {
  // 仅在 Linux 系统上检查 WSL
  if (process.platform !== 'linux') {
    return undefined
  }
  try {
    const procVersion = getFsImplementation().readFileSync('/proc/version', {
      encoding: 'utf8',
    })

    // 首先检查明确的 WSL 版本标记（如 "WSL2", "WSL3" 等）
    const wslVersionMatch = procVersion.match(/WSL(\d+)/i)
    if (wslVersionMatch && wslVersionMatch[1]) {
      return wslVersionMatch[1]
    }

    // 如果没有明确的 WSL 版本但包含 Microsoft，假设为 WSL1
    // 这处理原始的 WSL1 格式："4.4.0-19041-Microsoft"
    if (procVersion.toLowerCase().includes('microsoft')) {
      return '1'
    }

    // 不是 WSL 或无法确定版本
    return undefined
  } catch (error) {
    logError(error)
    return undefined
  }
})

export type LinuxDistroInfo = {
  linuxDistroId?: string
  linuxDistroVersion?: string
  linuxKernel?: string
}

export const getLinuxDistroInfo = memoize(
  async (): Promise<LinuxDistroInfo | undefined> => {
    if (process.platform !== 'linux') {
      return undefined
    }

    const result: LinuxDistroInfo = {
      linuxKernel: osRelease(),
    }

    try {
      const { readFile } = await import('fs/promises')
      const content = await readFile('/etc/os-release', 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^(ID|VERSION_ID)=(.*)$/)
        if (match && match[1] && match[2]) {
          const value = match[2].replace(/^"|"$/g, '')
          if (match[1] === 'ID') {
            result.linuxDistroId = value
          } else {
            result.linuxDistroVersion = value
          }
        }
      }
    } catch {
      // /etc/os-release 可能在某些 Linux 系统上不存在
    }

    return result
  },
)

const VCS_MARKERS: Array<[string, string]> = [
  ['.git', 'git'],
  ['.hg', 'mercurial'],
  ['.svn', 'svn'],
  ['.p4config', 'perforce'],
  ['$tf', 'tfs'],
  ['.tfvc', 'tfs'],
  ['.jj', 'jujutsu'],
  ['.sl', 'sapling'],
]

export async function detectVcs(dir?: string): Promise<string[]> {
  const detected = new Set<string>()

  // 通过环境变量检查 Perforce
  if (process.env.P4PORT) {
    detected.add('perforce')
  }

  try {
    const { readdir } = await import('fs/promises')
    const targetDir = dir ?? getFsImplementation().cwd()
    const entries = new Set(await readdir(targetDir))
    for (const [marker, vcs] of VCS_MARKERS) {
      if (entries.has(marker)) {
        detected.add(vcs)
      }
    }
  } catch {
    // 目录可能不可读
  }

  return [...detected]
}
