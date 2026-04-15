/**
 * 文件系统操作抽象层
 *
 * 对齐上游实现：按 claude-code/src/utils/fsOperations.ts 原样复刻
 * 当前仅实现 GlobTool 所需的 getFsImplementation 函数
 * TODO: 完整 fsOperations 待后续阶段补齐
 */

import { stat } from 'fs/promises'

/**
 * 文件系统实现接口
 * 对齐上游实现：按源码 FsImplementation 原样复刻
 * 当前仅包含 GlobTool 所需的 stat 方法
 */
interface FsImplementation {
  stat(path: string): Promise<{ isDirectory(): boolean }>
  cwd(): string
}

/**
 * 获取文件系统实现
 * 对齐上游实现：按源码 getFsImplementation 原样复刻
 * 设计原因：抽象文件系统操作，便于测试和平台适配
 */
export function getFsImplementation(): FsImplementation {
  return {
    stat,
    cwd: () => process.cwd(),
  }
}
