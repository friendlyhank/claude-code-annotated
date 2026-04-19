/**
 * Command semantics - 命令退出码语义解释
 *
 * 设计原因：许多命令的退出码不是简单的 0/1 成功/失败，
 * 例如 grep 返回 1 表示"没有匹配"而非错误，需要按命令语义解释退出码
 */

export type CommandSemantic = (
  exitCode: number, // 命令退出码
  stdout: string, // 标准输出
  stderr: string, // 错误输出
) => {
  isError: boolean // 是否为错误退出码
  message?: string // 错误消息
}

/**
 * 默认语义：只有 0 是成功，其他都是错误
 */
const DEFAULT_SEMANTIC: CommandSemantic = (exitCode, _stdout, _stderr) => ({
  isError: exitCode !== 0,
  message:
    exitCode !== 0 ? `Command failed with exit code ${exitCode}` : undefined,
})

/**
 * 命令特定语义
 * 对齐上游：grep/rg 返回 1 表示"没有匹配"，不算错误；find 返回 1 表示部分不可达
 */
const COMMAND_SEMANTICS: Map<string, CommandSemantic> = new Map([
  // grep: 0=匹配到, 1=没匹配, 2+=错误
  [
    'grep',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message: exitCode === 1 ? 'No matches found' : undefined,
    }),
  ],

  // ripgrep 与 grep 语义相同
  [
    'rg',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message: exitCode === 1 ? 'No matches found' : undefined,
    }),
  ],

  // find: 0=成功, 1=部分成功(某些目录不可达), 2+=错误
  [
    'find',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message:
        exitCode === 1 ? 'Some directories were inaccessible' : undefined,
    }),
  ],

  // diff: 0=无差异, 1=有差异, 2+=错误
  [
    'diff',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message: exitCode === 1 ? 'Files differ' : undefined,
    }),
  ],

  // test/[: 0=条件为真, 1=条件为假, 2+=错误
  [
    'test',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message: exitCode === 1 ? 'Condition is false' : undefined,
    }),
  ],

  // [ 是 test 的别名
  [
    '[',
    (exitCode, _stdout, _stderr) => ({
      isError: exitCode >= 2,
      message: exitCode === 1 ? 'Condition is false' : undefined,
    }),
  ],
])

/**
 * 提取命令的基础命令名（第一个词）
 */
function extractBaseCommand(command: string): string {
  return command.trim().split(/\s+/)[0] || ''
}

/**
 * 从复合命令行中启发式提取主命令名
 * 对齐上游：取最后一段命令（管道链中最后一个命令决定退出码）
 * 注意：这是启发式的，不保证完全正确，不应用于安全判断
 */
function heuristicallyExtractBaseCommand(command: string): string {
  // 管道分割取最后一段
  const segments = command.split('|').map(s => s.trim()).filter(Boolean)
  const lastCommand = segments[segments.length - 1] || command
  return extractBaseCommand(lastCommand)
}

/**
 * 根据语义规则解释命令结果
 * 对齐上游：按命令类型判断退出码是否表示错误
 */
export function interpretCommandResult(
  command: string, // 原始命令行
  exitCode: number, // 命令退出码
  stdout: string, // 凇准输出
  stderr: string, // 错误输出
): {
  isError: boolean // 是否为错误退出码
  message?: string // 错误消息
} {
  // 提取基础命令名
  const baseCommand = heuristicallyExtractBaseCommand(command)
  // 查找或使用默认语义
  const semantic = COMMAND_SEMANTICS.get(baseCommand) ?? DEFAULT_SEMANTIC
  // 应用语义解释
  const result = semantic(exitCode, stdout, stderr)

  return {
    isError: result.isError,
    message: result.message,
  }
}
