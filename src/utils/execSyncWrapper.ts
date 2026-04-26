/**
 * 同步执行包装器
 *
 * 对齐上游实现：按 claude-code/src/utils/execSyncWrapper.ts 原样复刻
 * 设计原因：包装 execSync 并添加慢操作日志
 */

import {
  type ExecSyncOptions,
  type ExecSyncOptionsWithBufferEncoding,
  type ExecSyncOptionsWithStringEncoding,
  execSync as nodeExecSync,
} from 'child_process'
import { slowLogging } from './slowOperations.js'

/**
 * @deprecated 尽可能使用异步替代方案。同步 exec 调用会阻塞事件循环
 *
 * 包装 execSync 并添加慢操作日志
 * 使用此函数替代直接使用 child_process execSync 以检测性能问题
 *
 * @example
 * import { execSync_DEPRECATED } from './execSyncWrapper.js'
 * const result = execSync_DEPRECATED('git status', { encoding: 'utf8' })
 */
export function execSync_DEPRECATED(command: string): Buffer
export function execSync_DEPRECATED(
  command: string,
  options: ExecSyncOptionsWithStringEncoding,
): string
export function execSync_DEPRECATED(
  command: string,
  options: ExecSyncOptionsWithBufferEncoding,
): Buffer
export function execSync_DEPRECATED(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string
export function execSync_DEPRECATED(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string {
  using _ = slowLogging`execSync: ${command.slice(0, 100)}`
  return nodeExecSync(command, options)
}
