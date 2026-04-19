/**
 * 文件系统操作抽象层
 *
 * 当前实现 FileReadTool/FileWriteTool 所需的核心函数
 * TODO: readFileBytes、getPathsForPermissionCheck 等待后续补齐
 */

import { stat, readFile as readFileAsync } from 'fs/promises'

/**
 * 文件系统实现接口
 * 对齐上游实现：包含工具所需的同步/异步操作
 */
interface FsImplementation {
  stat(path: string): Promise<{ isDirectory(): boolean; mtimeMs: number; size: number }>
  readFile(
    path: string,
    options: { encoding: string; signal?: AbortSignal },
  ): Promise<string>
  readFileSync(path: string, options: { encoding: string }): string
  /** 同步获取文件 stat */
  statSync(path: string): { isDirectory(): boolean; mtimeMs: number; size: number; isFIFO(): boolean; isSocket(): boolean; isCharacterDevice(): boolean; isBlockDevice(): boolean }
  /** 不跟踪符号链接的 stat */
  lstatSync(path: string): { isDirectory(): boolean; isSymbolicLink(): boolean; isFIFO(): boolean; isSocket(): boolean; isCharacterDevice(): boolean; isBlockDevice(): boolean }
  /** 解析符号链接的真实路径 */
  realpathSync(path: string): string
  /** 异步创建目录 */
  mkdir(path: string, options?: { mode?: number }): Promise<void>
  cwd(): string
}

/**
 * 获取文件系统实现
 * 对齐上游实现：抽象文件系统操作，便于测试和平台适配
 */
export function getFsImplementation(): FsImplementation {
  // eslint-disable-next-line custom-rules/no-sync-fs
  const nodeFs = require('fs')
  return {
    stat: stat as FsImplementation['stat'],
    readFile: readFileAsync as FsImplementation['readFile'],
    readFileSync: nodeFs.readFileSync,
    statSync: nodeFs.statSync,
    lstatSync: nodeFs.lstatSync,
    realpathSync: nodeFs.realpathSync,
    mkdir: (path, options) =>
      nodeFs.promises.mkdir(path, { recursive: true, ...options }),
    cwd: () => process.cwd(),
  }
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
  fs: FsImplementation,
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
