/**
 * 文件工具函数
 *
 * 当前仅实现 GlobTool 所需的常量和函数
 * TODO: 完整 file.ts 待后续阶段补齐（getDisplayPath 等）
 */

/**
 * 当前工作目录提示文本
 * 对齐上游实现：按源码 FILE_NOT_FOUND_CWD_NOTE 原样复刻
 */
export const FILE_NOT_FOUND_CWD_NOTE = 'Current working directory:'

/**
 * 根据路径在当前工作目录下查找建议路径
 * 设计原因：当路径不存在时，提供可能的正确路径建议
 *
 * TODO: 当前返回 null，待完整实现后替换
 * 完整实现需要读取目录内容做模糊匹配
 */
export async function suggestPathUnderCwd(
  _absolutePath: string,
): Promise<string | null> {
  return null
}
