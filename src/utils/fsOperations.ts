/**
 * 文件系统操作抽象层
 *
 * 当前实现 FileReadTool 所需的 getFsImplementation 函数
 * TODO: readFileBytes、safeResolvePath、getPathsForPermissionCheck 等待后续补齐
 */

import { stat, readFile as readFileAsync } from 'fs/promises'

/**
 * 文件系统实现接口
 * 包含 FileReadTool 所需的 stat、readFile、cwd 方法
 */
interface FsImplementation {
  stat(path: string): Promise<{ isDirectory(): boolean; mtimeMs: number }>
  readFile(
    path: string,
    options: { encoding: string; signal?: AbortSignal },
  ): Promise<string>
  readFileSync(path: string, options: { encoding: string }): string
  cwd(): string
}

/**
 * 获取文件系统实现
 * 设计原因：抽象文件系统操作，便于测试和平台适配
 */
export function getFsImplementation(): FsImplementation {
  return {
    stat,
    readFile: readFileAsync as FsImplementation['readFile'],
    readFileSync: (() => {
      // 同步读取的懒加载，避免顶层 import 同步 fs
      const { readFileSync } = require('fs')
      return readFileSync
    })(),
    cwd: () => process.cwd(),
  }
}
