/**
 * 可执行文件查找工具
 *
 * 对齐上游实现：按 claude-code/src/utils/findExecutable.ts 原样复刻
 * 设计原因：替代 spawn-rx 的 findActualExecutable，避免引入 rxjs（~313 KB）
 */

import { whichSync } from './which.js'

/**
 * 通过搜索 PATH 查找可执行文件，类似于 `which`
 * 替代 spawn-rx 的 findActualExecutable 以避免引入 rxjs（~313 KB）
 *
 * 返回 { cmd, args } 以匹配 spawn-rx API 形状
 * `cmd` 是找到的解析路径，如果未找到则为原始名称
 * `args` 始终是输入参数的透传
 */
export function findExecutable(
  exe: string,
  args: string[],
): { cmd: string; args: string[] } {
  const resolved = whichSync(exe)
  return { cmd: resolved ?? exe, args }
}
