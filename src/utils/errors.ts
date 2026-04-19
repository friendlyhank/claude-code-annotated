/**
 * 错误类型与判断工具
 *
 * 对齐上游实现：按 claude-code/src/utils/errors.ts 原样复刻
 * 当前实现 FileReadTool 所需的 isENOENT、getErrnoCode
 * TODO: ClaudeError、AbortError、ShellError 等待后续阶段补齐
 */

/**
 * 从错误对象中提取 errno code（如 'ENOENT'、'EACCES'）
 * 对齐上游实现：按源码 getErrnoCode 原样复刻
 */
export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

/**
 * 判断错误是否为 ENOENT（文件/目录不存在）
 * 对齐上游实现：按源码 isENOENT 原样复刻
 */
export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/**
 * Shell 命令执行错误
 * 对齐上游实现：按 claude-code/src/utils/errors.ts ShellError 原样复刻
 * 设计原因：区分 Shell 执行错误与其他错误，携带退出码和中断状态
 */
export class ShellError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly code: number | null,
    public readonly interrupted: boolean,
  ) {
    super(message)
    this.name = 'ShellError'
  }
}

/**
 * 从未知错误中提取可读错误消息
 * 对齐上游：errorMessage() 工具函数
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message
  }
  return String(e)
}
