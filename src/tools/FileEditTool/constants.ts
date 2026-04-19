/**
 * FileEditTool 常量定义
 *
 * 设计原因：独立文件避免循环依赖，工具名称和错误消息集中管理
 */

// 工具名称，对齐上游实现：Edit 是用户面向的名称
export const FILE_EDIT_TOOL_NAME = 'Edit'

// 权限模式：允许访问项目 .claude/ 文件夹
export const CLAUDE_FOLDER_PERMISSION_PATTERN = '/.claude/**'

// 权限模式：允许访问全局 ~/.claude/ 文件夹
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = '~/.claude/**'

// 文件意外修改错误：call() 中检测到文件在读后被修改时抛出
export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
