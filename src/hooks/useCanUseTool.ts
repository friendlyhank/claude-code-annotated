/**
 * 检查工具是否可用的函数类型
 *
 * 对齐上游实现：按 claude-code/src/hooks/useCanUseTool.ts 原样复刻
 */
export type CanUseToolFn = (
  tool: { name: string; mcpInfo?: { serverName: string; toolName: string } },
  input: Record<string, unknown>,
  context: unknown,
) => Promise<{ result: true } | { result: false; message: string }>
