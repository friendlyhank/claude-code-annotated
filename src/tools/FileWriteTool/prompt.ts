/**
 * FileWriteTool 常量与描述
 *
 * 设计原因：
 * 1. 工具名称 'Write' 是用户面向的名称
 * 2. 描述中包含先读后写的约束，确保模型不会盲目覆盖文件
 * 3. 独立文件避免循环依赖
 */

import { FILE_READ_TOOL_NAME } from '../FileReadTool/prompt.js'

export const FILE_WRITE_TOOL_NAME = 'Write'
export const DESCRIPTION = 'Write a file to the local filesystem.'

/**
 * 获取先读后写的提示指令
 *
 * 设计原因：现有文件必须先读取才能写入，防止模型覆盖未知内容
 */
function getPreReadInstruction(): string {
  return `\n- If this is an existing file, you MUST use the ${FILE_READ_TOOL_NAME} tool first to read the file's contents. This tool will fail if you did not read the file first.`
}

/**
 * 获取 Write 工具的完整描述
 *
 * 对齐上游实现：按 claude-code/src/tools/FileWriteTool/prompt.ts getWriteToolDescription 原样复刻
 * 设计原因：
 * 1. 明确覆盖行为：现有文件会被完整替换
 * 2. 先读后写约束：防止盲写导致数据丢失
 * 3. 优先使用 Edit：仅创建新文件或完全重写时使用 Write
 * 4. 不主动创建文档文件：防止文档膨胀
 * 5. 不主动使用 emoji：保持文件内容专业
 */
export function getWriteToolDescription(): string {
  return `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.${getPreReadInstruction()}
- Prefer the Edit tool for modifying existing files \u2014 it only sends the diff. Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`
}
