/**
 * GrepTool 提示词
 */

// TODO: AgentTool 待实现
// import { AGENT_TOOL_NAME } from '../AgentTool/constants.js'
import { BASH_TOOL_NAME } from '../BashTool/toolName.js'

export const GREP_TOOL_NAME = 'Grep'

// TODO: AGENT_TOOL_NAME 待 AgentTool 实现后替换
const AGENT_TOOL_NAME = 'Task'


/**
 * 获取 GrepTool 的功能描述
 *
 * 描述内容说明：
 * - 强调使用 GrepTool 而非 Bash 调用 grep/rg，确保权限正确
 * - 支持完整正则语法，支持 glob 和 type 参数过滤文件
 * - 输出模式包括 content（显示匹配行）、files_with_matches（仅文件路径）、count（匹配计数）
 * - 开放式搜索建议使用 Task 工具
 * - 使用 ripgrep 语法，字面大括号需要转义
 * - 默认单行匹配，跨行匹配需设置 multiline: true
 *
 * @returns GrepTool 的功能描述字符串
 */
export function getDescription(): string {
  return `A powerful search tool built on ripgrep

  Usage:
  - ALWAYS use ${GREP_TOOL_NAME} for search tasks. NEVER invoke \`grep\` or \`rg\` as a ${BASH_TOOL_NAME} command. The ${GREP_TOOL_NAME} tool has been optimized for correct permissions and access.
  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
  - Use ${AGENT_TOOL_NAME} tool for open-ended searches requiring multiple rounds
  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`
`
}
