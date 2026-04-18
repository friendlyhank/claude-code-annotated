/**
 * 文件工具函数
 *
 * 对齐上游实现：按 claude-code/src/utils/file.ts 原样复刻
 * 当前实现 FileReadTool 所需的函数
 * TODO: getDisplayPath、findSimilarFile、writeTextContent 等待后续补齐
 */

import { stat } from 'fs/promises'
import { getCwd } from './cwd.js'
import { getFsImplementation } from './fsOperations.js'

/**
 * 当前工作目录提示文本
 */
export const FILE_NOT_FOUND_CWD_NOTE = 'Current working directory:'

/**
 * 默认最大输出大小（0.25MB）
 * 对齐上游实现：按源码 MAX_OUTPUT_SIZE 原样复刻
 */
export const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024 // 0.25MB in bytes

/**
 * 为文件内容添加行号
 * 对齐上游实现：按源码 addLineNumbers 原样复刻
 * 设计原因：输出使用 cat -n 格式，行号从 1 开始
 */
export function addLineNumbers(file: {
  content: string
  startLine: number
}): string {
  const lines = file.content.split('\n')
  const maxLineNum = file.startLine + lines.length - 1
  const maxWidth = String(maxLineNum).length
  return lines
    .map((line, i) => {
      const lineNum = String(file.startLine + i).padStart(maxWidth, ' ')
      return `${lineNum}\t${line}`
    })
    .join('\n')
}

/**
 * 异步获取文件修改时间（毫秒，取整）
 * 设计原因：Math.floor 确保时间戳比较一致，避免亚毫秒精度变化导致误判
 */
export async function getFileModificationTimeAsync(
  filePath: string,
): Promise<number> {
  const s = await getFsImplementation().stat(filePath)
  return Math.floor(s.mtimeMs)
}

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

/**
 * 查找相似文件名
 * TODO: 当前返回 null，待完整实现后替换
 */
export function findSimilarFile(_filePath: string): string | null {
  return null
}
