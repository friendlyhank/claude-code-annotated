/**
 * 错误类型与判断工具
 *
 * 对齐上游实现：按 claude-code/src/utils/errors.ts 原样复刻
 * 当前仅实现 GlobTool 所需的 isENOENT 函数
 * TODO: 其余错误类型（ClaudeError, AbortError 等）待后续阶段补齐
 */

/**
 * 判断错误是否为 ENOENT（文件/目录不存在）
 * 对齐上游实现：按源码 isENOENT 原样复刻
 */
export function isENOENT(e: unknown): boolean {
  if (e && typeof e === 'object' && 'code' in e) {
    return (e as { code: string }).code === 'ENOENT'
  }
  return false
}
