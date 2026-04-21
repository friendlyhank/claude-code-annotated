/**
 * 全局清理函数注册表
 *
 * 源码复刻: claude-code/src/utils/cleanupRegistry.ts
 * 设计原因：在进程退出时执行清理操作（如刷新日志缓冲）
 */

const cleanupFunctions = new Set<() => Promise<void>>()

export function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn)
}

export async function runCleanupFunctions(): Promise<void> {
  await Promise.all(Array.from(cleanupFunctions).map(fn => fn()))
}
