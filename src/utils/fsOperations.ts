/**
 * 文件系统操作抽象层
 *
 * 当前实现工具和调试模式所需的核心函数
 */

import * as fs from 'fs'
import {
  mkdir as mkdirPromise, // 递归创建目录
  readdir as readdirPromise, // 读取目录内容
  stat as statPromise, // 获取文件或目录的统计信息
} from 'fs/promises'

// 文件系统操作抽象层类型定义
export type FsOperations = {
  stat(path: string): Promise<{ isDirectory(): boolean; mtimeMs: number; size: number }>
  readdir(path: string): Promise<fs.Dirent[]>
  readFile(path: string, options: { encoding: string; signal?: AbortSignal }): Promise<string>
  readFileSync(path: string, options: { encoding: string }): string
  statSync(path: string): fs.Stats
  lstatSync(path: string): fs.Stats
  realpathSync(path: string): string
  mkdir(path: string, options?: { mode?: number }): Promise<void>
  mkdirSync(path: string, options?: { mode?: number }): void
  appendFileSync(path: string, data: string, options?: { mode?: number }): void
  cwd(): string
}

const NodeFsOperations: FsOperations = {
  stat: statPromise as FsOperations['stat'],
  readdir: (path) => readdirPromise(path, { withFileTypes: true }),
  readFile: (path, options) =>
    new Promise((resolve, reject) => {
      fs.readFile(path, { encoding: options.encoding as BufferEncoding }, (err, data) => {
        if (err) reject(err)
        else resolve(data as string)
      })
    }),
  readFileSync: (path, options) => fs.readFileSync(path, { encoding: options.encoding as BufferEncoding }),
  statSync: (path) => fs.statSync(path),
  lstatSync: (path) => fs.lstatSync(path),
  realpathSync: (path) => fs.realpathSync(path).normalize('NFC'),
  mkdir: (path, options) =>
    mkdirPromise(path, { recursive: true, ...options }).then(() => {}),
  mkdirSync: (path, options) => {
    try {
      fs.mkdirSync(path, { recursive: true, ...options })
    } catch (e) {
      if (getErrnoCode(e) !== 'EEXIST') throw e
    }
  },
  appendFileSync: (path, data, options) => {
    if (options?.mode !== undefined) {
      try {
        const fd = fs.openSync(path, 'ax', options.mode)
        try {
          fs.appendFileSync(fd, data)
        } finally {
          fs.closeSync(fd)
        }
        return
      } catch (e) {
        if (getErrnoCode(e) !== 'EEXIST') throw e
      }
    }
    fs.appendFileSync(path, data)
  },
  cwd: () => process.cwd(),
}

let activeFs: FsOperations = NodeFsOperations

export function getFsImplementation(): FsOperations {
  return activeFs
}

export function setFsImplementation(implementation: FsOperations): void {
  activeFs = implementation
}

export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

/**
 * 安全解析路径（处理符号链接、特殊文件类型、UNC 路径）
 *
 * 设计原因：
 * 1. 阻止 UNC 路径，防止 Windows 上的 DNS/SMB 网络请求
 * 2. 检查特殊文件类型（FIFO/套接字/设备），realpathSync 可能阻塞
 * 3. 解析符号链接的真实路径
 * 4. 文件不存在时返回原始路径，允许文件创建操作
 */
export function safeResolvePath(
  fs: FsOperations,
  filePath: string,
): { resolvedPath: string; isSymlink: boolean; isCanonical: boolean } {
  // 阻止 UNC 路径，防止 Windows 上触发网络请求
  if (filePath.startsWith('//') || filePath.startsWith('\\\\')) {
    return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
  }

  try {
    // 检查特殊文件类型，realpathSync 可能阻塞在 FIFO 上
    const stats = fs.lstatSync(filePath)
    if (
      stats.isFIFO() ||
      stats.isSocket() ||
      stats.isCharacterDevice() ||
      stats.isBlockDevice()
    ) {
      return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
    }

    const resolvedPath = fs.realpathSync(filePath)
    return {
      resolvedPath,
      isSymlink: resolvedPath !== filePath,
      isCanonical: true,
    }
  } catch {
    // 对齐上游实现：ENOENT、损坏符号链接等，返回原始路径允许创建操作
    return { resolvedPath: filePath, isSymlink: false, isCanonical: false }
  }
}
