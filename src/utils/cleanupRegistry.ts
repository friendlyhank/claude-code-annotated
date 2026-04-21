/**
 * 全局清理函数注册表
 *
 * 设计原因：在进程退出时执行清理操作（如刷新日志缓冲）
 */

// 清理函数注册表
const cleanupFunctions = new Set<() => Promise<void>>()

// 注册清理函数
export function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn)
}

// 执行所有注册的清理函数
export async function runCleanupFunctions(): Promise<void> {
  await Promise.all(Array.from(cleanupFunctions).map(fn => fn()))
}
