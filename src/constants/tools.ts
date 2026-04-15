/**
 * 工具常量定义 - 工具名称、禁用列表、异步代理允许列表
 *
 * 对齐上游实现：按 claude-code/src/constants/tools.ts 原样复刻
 * 设计原因：
 * 1. 集中管理工具名称常量，避免硬编码
 * 2. 定义代理工具禁用/允许规则
 * 3. 协调器模式允许的工具集合
 */

// ============================================================================
// 工具名称常量
// ============================================================================

// 对齐上游实现：按各工具目录下的 constants.ts / prompt.ts 原样复刻
// 设计原因：工具名称必须与 Anthropic API tool_use 块的 name 精确匹配

export const AGENT_TOOL_NAME = 'Agent'
export const ASK_USER_QUESTION_TOOL_NAME = 'AskUserQuestion'
export const BASH_TOOL_NAME = 'Bash'
export const FILE_READ_TOOL_NAME = 'Read'
export const FILE_EDIT_TOOL_NAME = 'Edit'
export const FILE_WRITE_TOOL_NAME = 'Write'
export const GLOB_TOOL_NAME = 'Glob'
export const GREP_TOOL_NAME = 'Grep'
export const WEB_FETCH_TOOL_NAME = 'WebFetch'
export const WEB_SEARCH_TOOL_NAME = 'WebSearch'
export const TODO_WRITE_TOOL_NAME = 'TodoWrite'
export const NOTEBOOK_EDIT_TOOL_NAME = 'NotebookEdit'
export const TASK_OUTPUT_TOOL_NAME = 'TaskOutput'
export const TASK_STOP_TOOL_NAME = 'TaskStop'
export const SKILL_TOOL_NAME = 'Skill'
export const SEND_MESSAGE_TOOL_NAME = 'SendMessage'
export const TOOL_SEARCH_TOOL_NAME = 'ToolSearch'
export const SYNTHETIC_OUTPUT_TOOL_NAME = 'StructuredOutput'
export const EXIT_PLAN_MODE_V2_TOOL_NAME = 'ExitPlanMode'
export const ENTER_PLAN_MODE_TOOL_NAME = 'EnterPlanMode'
export const ENTER_WORKTREE_TOOL_NAME = 'EnterWorktree'
export const EXIT_WORKTREE_TOOL_NAME = 'ExitWorktree'
export const WORKFLOW_TOOL_NAME = 'Workflow'
export const CRON_CREATE_TOOL_NAME = 'CronCreate'
export const CRON_DELETE_TOOL_NAME = 'CronDelete'
export const CRON_LIST_TOOL_NAME = 'CronList'
export const TASK_CREATE_TOOL_NAME = 'TaskCreate'
export const TASK_GET_TOOL_NAME = 'TaskGet'
export const TASK_LIST_TOOL_NAME = 'TaskList'
export const TASK_UPDATE_TOOL_NAME = 'TaskUpdate'
export const REPL_TOOL_NAME = 'REPL'
export const POWERSHELL_TOOL_NAME = 'PowerShell'

/**
 * Shell 工具名称列表
 * 对齐上游实现：按 utils/shell/shellToolUtils.ts 原样复刻
 */
export const SHELL_TOOL_NAMES = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]

// ============================================================================
// 代理工具禁用列表
// ============================================================================

/**
 * 所有代理类型禁止使用的工具
 * 对齐上游实现：按 claude-code/src/constants/tools.ts ALL_AGENT_DISALLOWED_TOOLS 原样复刻
 *
 * 设计原因：
 * - TaskOutput: 防止递归
 * - ExitPlanMode/EnterPlanMode: 计划模式是主线程抽象
 * - Agent: 防止递归（ant 用户除外）
 * - AskUserQuestion: 子代理不应询问用户
 * - TaskStop: 需要主线程任务状态
 */
export const ALL_AGENT_DISALLOWED_TOOLS = new Set([
  TASK_OUTPUT_TOOL_NAME,
  EXIT_PLAN_MODE_V2_TOOL_NAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  AGENT_TOOL_NAME,
  ASK_USER_QUESTION_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  WORKFLOW_TOOL_NAME,
])

/**
 * 自定义代理额外禁用的工具
 * 对齐上游实现：当前与 ALL_AGENT_DISALLOWED_TOOLS 相同
 */
export const CUSTOM_AGENT_DISALLOWED_TOOLS = new Set([
  ...ALL_AGENT_DISALLOWED_TOOLS,
])

/**
 * 异步代理允许使用的工具
 * 对齐上游实现：按 claude-code/src/constants/tools.ts ASYNC_AGENT_ALLOWED_TOOLS 原样复刻
 */
export const ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  TODO_WRITE_TOOL_NAME,
  GREP_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  GLOB_TOOL_NAME,
  ...SHELL_TOOL_NAMES,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  SKILL_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
  TOOL_SEARCH_TOOL_NAME,
  ENTER_WORKTREE_TOOL_NAME,
  EXIT_WORKTREE_TOOL_NAME,
])

/**
 * 进程内队友允许使用的工具
 * 对齐上游实现：按 claude-code/src/constants/tools.ts IN_PROCESS_TEAMMATE_ALLOWED_TOOLS 原样复刻
 */
export const IN_PROCESS_TEAMMATE_ALLOWED_TOOLS = new Set([
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  CRON_LIST_TOOL_NAME,
])

/**
 * 协调器模式允许的工具
 * 对齐上游实现：按 claude-code/src/constants/tools.ts COORDINATOR_MODE_ALLOWED_TOOLS 原样复刻
 */
export const COORDINATOR_MODE_ALLOWED_TOOLS = new Set([
  AGENT_TOOL_NAME,
  TASK_STOP_TOOL_NAME,
  SEND_MESSAGE_TOOL_NAME,
  SYNTHETIC_OUTPUT_TOOL_NAME,
])
