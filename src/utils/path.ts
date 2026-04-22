/**
 * 路径工具函数
 *
 * 当前仅实现 GlobTool 所需的 expandPath 和 toRelativePath
 * TODO: 完整 path.ts 待后续阶段补齐
 */

import { homedir } from 'os'
import { isAbsolute,join, normalize, relative,resolve } from 'path'
import { getCwd } from './cwd.js'
import { getFsImplementation } from './fsOperations.js'

/**
 * ~ → 家目录
 * 相对路径转为绝对路径
 * 
 * TODO: Windows POSIX 路径转换待补齐
 * TODO: null byte 安全检查待补齐
 */
export function expandPath(path: string, baseDir?: string): string {
  // 判断空，然后设置对应的值
  const actualBaseDir = baseDir ?? getCwd() ?? getFsImplementation().cwd()

  // Input validation
  if (typeof path !== 'string') {
    throw new TypeError(`Path must be a string, received ${typeof path}`)
  }

  if (typeof actualBaseDir !== 'string') {
    throw new TypeError(
      `Base directory must be a string, received ${typeof actualBaseDir}`,
    )
  }

  const trimmedPath = path.trim()
  if (!trimmedPath) {
    return normalize(actualBaseDir).normalize('NFC')
  }

  // 处理家目录标记
  if (trimmedPath === '~') {
    return homedir().normalize('NFC') // 展开为家目录
  }
  if (trimmedPath.startsWith('~/')) {
    return join(homedir(), trimmedPath.slice(2)).normalize('NFC')// 展开为家目录下的路径
  }

   let processedPath = trimmedPath

  // 绝对路径直接规范化
  if (isAbsolute(trimmedPath)) {
    return normalize(processedPath).normalize('NFC') // 直对路径直接规范化
  }

  // 将相对路径转为绝对路径
  return resolve(actualBaseDir, processedPath).normalize('NFC')
}

/**
 * 将绝对路径转换为相对路径（基于 cwd）
 *
 * 对齐上游实现：按 claude-code/src/utils/path.ts toRelativePath 原样复刻
 * 设计原因：节省 token —— 相对路径比绝对路径短
 * 如果路径不在 cwd 下，返回原始绝对路径
 */
export function toRelativePath(absolutePath: string): string {
  const cwd = getCwd()
  const rel = relative(cwd, absolutePath)
  // 如果 relative 结果以 .. 开头，说明不在 cwd 下，返回绝对路径
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return absolutePath
  }
  return rel
}
