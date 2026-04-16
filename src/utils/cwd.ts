/**
 * 当前工作目录管理
 *
 * 对齐上游实现：按 claude-code/src/utils/cwd.ts 原样复刻
 * 设计原因：支持 AsyncLocalStorage 覆盖，允许多代理各自独立工作目录
 *
 * TODO: runWithCwdOverride 使用 AsyncLocalStorage，待多代理实现后补齐
 */

import { AsyncLocalStorage } from 'async_hooks'
import { getCwdState, getOriginalCwd } from '../bootstrap/state.js'

// 当前工作目录覆盖存储，解决每个异步调用链有自己独立的存储空间。(todo hank 分析)
const cwdOverrideStorage = new AsyncLocalStorage<string>()

/**
 * 在覆盖的工作目录下运行函数
 * 所有内部 getCwd() 调用将返回覆盖值而非全局值
 */
export function runWithCwdOverride<T>(cwd: string, fn: () => T): T {
  return cwdOverrideStorage.run(cwd, fn)
}

/**
 * 获取当前工作目录（可能被 AsyncLocalStorage 覆盖）
 */
export function pwd(): string {
  return cwdOverrideStorage.getStore() ?? getCwdState()
}

/**
 * 获取当前工作目录，兜底到原始工作目录
 */
export function getCwd(): string {
  try {
    return pwd()
  } catch {
    return getOriginalCwd()
  }
}
