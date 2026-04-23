/**
 * 工具注册与管理 - 工具池组装、过滤、预设
 *
 * 对齐上游实现：按 claude-code/src/tools.ts 原样复刻
 * 设计原因：
 * 1. getAllBaseTools() 是所有内置工具的唯一真相源
 * 2. getTools() 根据权限上下文过滤可用工具
 * 3. assembleToolPool() 合并内置工具和 MCP 工具
 * 4. filterToolsByDenyRules() 按拒绝规则过滤
 *
 * 注：当前具体工具实现为 TODO 占位，仅注册框架就绪
 */

import { toolMatchesName, type Tool, type Tools } from './Tool.js'
import { BashTool } from './tools/BashTool/BashTool.js'
import { FileReadTool } from './tools/FileReadTool/FileReadTool.js'
import { FileEditTool } from './tools/FileEditTool/FileEditTool.js'
import { FileWriteTool } from './tools/FileWriteTool/FileWriteTool.js'
import { GlobTool } from './tools/GlobTool/GlobTool.js'
import { getDenyRuleForTool } from './utils/permissions/permissions.js'
import { hasEmbeddedSearchTools } from './utils/embeddedTools.js'
import { isEnvTruthy } from './utils/envUtils.js'
import type { ToolPermissionContext } from './types/permissions.js'
import {
  ALL_AGENT_DISALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
  SYNTHETIC_OUTPUT_TOOL_NAME,
} from './constants/tools.js'

// Re-export 工具常量
export {
  ALL_AGENT_DISALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
} from './constants/tools.js'

// ============================================================================
// 占位工具定义
// ============================================================================

// 对齐上游实现：按 claude-code/src/tools.ts 原样复刻 import 结构
// 当前阶段：具体工具尚未实现，使用 buildTool 创建最小占位
// TODO: 逐一替换为各工具目录下的真实实现

import { buildTool } from './Tool.js'
import { z } from 'zod/v4'

/**
 * 占位工具创建辅助函数
 * 对齐上游实现：所有工具最终通过 buildTool 创建
 * 设计原因：确保占位工具的默认行为与真实工具一致
 */
function createPlaceholderTool(name: string, description: string) {
  return buildTool({
    name,
    inputSchema: z.object({}),
    maxResultSizeChars: 0,
    description: async () => description,
    call: async () => ({ data: `TODO: ${name} not implemented` }),
    prompt: async () => description,
    renderToolUseMessage: () => null,
    mapToolResultToToolResultBlockParam: (content, toolUseID) => ({
      type: 'tool_result' as const,
      tool_use_id: toolUseID,
      content: String(content),
    }),
  })
}

// ============================================================================
// 预设与解析
// ============================================================================

/**
 * 预定义的工具预设
 * 对齐上游实现：按 claude-code/src/tools.ts TOOL_PRESETS 原样复刻
 */
export const TOOL_PRESETS = ['default'] as const

export type ToolPreset = (typeof TOOL_PRESETS)[number]

/**
 * 解析工具预设名称
 * 对齐上游实现：按 claude-code/src/tools.ts parseToolPreset 原样复刻
 */
export function parseToolPreset(preset: string): ToolPreset | null {
  const presetString = preset.toLowerCase()
  if (!TOOL_PRESETS.includes(presetString as ToolPreset)) {
    return null
  }
  return presetString as ToolPreset
}

// ============================================================================
// getAllBaseTools - 所有内置工具列表
// ============================================================================

/**
 * 获取所有基础工具列表
 * 对齐上游实现：按 claude-code/src/tools.ts getAllBaseTools 原样复刻
 *
 * 这是所有内置工具的唯一真相源，尊重环境变量标志。
 * 设计原因：
 * 1. 条件引入：嵌入式搜索工具可用时，不需要独立 Glob/Grep 工具
 * 2. isEnabled() 检查：部分工具在特定环境下禁用
 * 3. 顺序保持一致：工具顺序影响 prompt cache 稳定性
 */
export function getAllBaseTools(): Tools {
  return [
    // TODO: AgentTool - 替换为 tools/AgentTool/AgentTool.ts 的真实实现
    createPlaceholderTool('Agent', 'Launch a sub-agent to handle complex tasks'),
    // TODO: TaskOutputTool - 替换为 tools/TaskOutputTool/TaskOutputTool.ts
    createPlaceholderTool('TaskOutput', 'Get output from a background task'),
    BashTool,
    // 对齐上游实现：嵌入式搜索工具可用时，不需要独立 Glob/Grep 工具
    ...(hasEmbeddedSearchTools()
      ? []
      : [
          GlobTool,
          // TODO: GrepTool - 替换为 tools/GrepTool/GrepTool.ts
          createPlaceholderTool('Grep', 'Search file contents with regex'),
        ]),
    // TODO: ExitPlanModeV2Tool - 替换为 tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts
    createPlaceholderTool('ExitPlanMode', 'Exit plan mode and start implementing'),
   FileReadTool,
    FileEditTool,
    FileWriteTool,
    // TODO: NotebookEditTool - 替换为 tools/NotebookEditTool/NotebookEditTool.ts
    createPlaceholderTool('NotebookEdit', 'Edit a Jupyter notebook cell'),
    // TODO: WebFetchTool - 替换为 tools/WebFetchTool/WebFetchTool.ts
    createPlaceholderTool('WebFetch', 'Fetch content from a URL'),
    // TODO: TodoWriteTool - 替换为 tools/TodoWriteTool/TodoWriteTool.ts
    createPlaceholderTool('TodoWrite', 'Update the todo list'),
    // TODO: WebSearchTool - 替换为 tools/WebSearchTool/WebSearchTool.ts
    createPlaceholderTool('WebSearch', 'Search the web'),
    // TODO: TaskStopTool - 替换为 tools/TaskStopTool/TaskStopTool.ts
    createPlaceholderTool('TaskStop', 'Stop a running background task'),
    // TODO: AskUserQuestionTool - 替换为 tools/AskUserQuestionTool/AskUserQuestionTool.ts
    createPlaceholderTool('AskUserQuestion', 'Ask the user a question'),
    // TODO: SkillTool - 替换为 tools/SkillTool/SkillTool.ts
    createPlaceholderTool('Skill', 'Execute a skill command'),
    // TODO: EnterPlanModeTool - 替换为 tools/EnterPlanModeTool/EnterPlanModeTool.ts
    createPlaceholderTool('EnterPlanMode', 'Enter plan mode before implementing'),
    // TODO: ListMcpResourcesTool - 替换为 tools/ListMcpResourcesTool/ListMcpResourcesTool.ts
    createPlaceholderTool('ListMcpResources', 'List available MCP resources'),
    // TODO: ReadMcpResourceTool - 替换为 tools/ReadMcpResourceTool/ReadMcpResourceTool.ts
    createPlaceholderTool('ReadMcpResource', 'Read an MCP resource'),
    // TODO: SendMessageTool - 替换为 tools/SendMessageTool/SendMessageTool.ts
    createPlaceholderTool('SendMessage', 'Send a message to a teammate'),
    // TODO: TaskCreateTool, TaskGetTool, TaskUpdateTool, TaskListTool
    createPlaceholderTool('TaskCreate', 'Create a new task'),
    createPlaceholderTool('TaskGet', 'Get task details'),
    createPlaceholderTool('TaskUpdate', 'Update a task'),
    createPlaceholderTool('TaskList', 'List all tasks'),
    // TODO: BriefTool - 替换为 tools/BriefTool/BriefTool.ts
    createPlaceholderTool('Brief', 'Brief summary tool'),
    // TODO: ToolSearchTool - 替换为 tools/ToolSearchTool/ToolSearchTool.ts
    createPlaceholderTool('ToolSearch', 'Search for available tools'),
    // TODO: ConfigTool - 替换为 tools/ConfigTool/ConfigTool.ts (仅 ant)
    // TODO: TungstenTool - 替换为 tools/TungstenTool/TungstenTool.ts (仅 ant)
    // TODO: LSPTool - 替换为 tools/LSPTool/LSPTool.ts (需要 ENABLE_LSP_TOOL)
    // TODO: EnterWorktreeTool/ExitWorktreeTool (需要 worktree mode)
    // TODO: CronCreate/CronDelete/CronList - 替换为 tools/ScheduleCronTool/
    createPlaceholderTool('CronCreate', 'Schedule a cron job'),
    createPlaceholderTool('CronDelete', 'Delete a cron job'),
    createPlaceholderTool('CronList', 'List all cron jobs'),
  ]
}

// ============================================================================
// getToolsForDefaultPreset
// ============================================================================

/**
 * 获取默认预设的工具名称列表
 * 对齐上游实现：按 claude-code/src/tools.ts getToolsForDefaultPreset 原样复刻
 * 过滤掉通过 isEnabled() 检查后禁用的工具
 */
export function getToolsForDefaultPreset(): string[] {
  const tools = getAllBaseTools()
  const isEnabled = tools.map(tool => tool.isEnabled())
  return tools.filter((_, i) => isEnabled[i]).map(tool => tool.name)
}

// ============================================================================
// filterToolsByDenyRules
// ============================================================================

/**
 * 按拒绝规则过滤工具
 * 对齐上游实现：按 claude-code/src/tools.ts filterToolsByDenyRules 原样复刻
 *
 * 泛型约束与源码一致：T extends { name, mcpInfo? }
 * getDenyRuleForTool 接收 Pick<Tool, 'name' | 'mcpInfo'>
 *
 * 设计原因：
 * - 与运行时权限检查（step 1a）使用相同的匹配器
 * - MCP server-prefix 规则如 `mcp__server` 会在模型看到之前
 *   过滤掉该服务器的所有工具，而非仅在实际调用时
 */
export function filterToolsByDenyRules<
  T extends {
    name: string
    mcpInfo?: { serverName: string; toolName: string }
  },
>(tools: readonly T[], permissionContext: ToolPermissionContext): T[] {
  return tools.filter(
    tool => !getDenyRuleForTool(permissionContext, tool),
  )
}

// ============================================================================
// getTools
// ============================================================================

/**
 * 获取当前权限上下文下的可用工具列表
 *
 * 处理流程：
 * 1. CLAUDE_CODE_SIMPLE 模式：仅返回 Bash/Read/Edit
 * 2. 正常模式：获取全部基础工具，过滤特殊工具和拒绝规则
 * 3. REPL 模式：隐藏 REPL_ONLY_TOOLS 中的原语工具
 * 4. 最后过滤 isEnabled() 为 false 的工具
 */
export const getTools = (permissionContext: ToolPermissionContext): Tools => {
  // Simple 模式：仅 Bash, Read, Edit
  if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
    const simpleTools: Tool[] = [
      createPlaceholderTool('Bash', 'Execute a bash command'),
      createPlaceholderTool('Read', 'Read a file'),
      createPlaceholderTool('Edit', 'Edit a file'),
    ]
    return filterToolsByDenyRules(simpleTools, permissionContext)
  }

  // 获取所有基础工具，过滤特殊工具
  // 对齐上游实现：ListMcpResources、ReadMcpResource、StructuredOutput
  // 是特殊工具，不在常规工具列表中展示
  const specialTools = new Set([
    'ListMcpResources',
    'ReadMcpResource',
    SYNTHETIC_OUTPUT_TOOL_NAME,
  ])

  const tools = getAllBaseTools().filter(tool => !specialTools.has(tool.name))

  // 按拒绝规则过滤
  let allowedTools = filterToolsByDenyRules(tools, permissionContext)

  // TODO: REPL 模式处理 - REPL 启用时隐藏原语工具
  // 需要 REPLTool 和 REPL_ONLY_TOOLS 常量

  const isEnabled = allowedTools.map(_ => _.isEnabled())
  return allowedTools.filter((_, i) => isEnabled[i])
}

// ============================================================================
// assembleToolPool
// ============================================================================

/**
 * 组装完整工具池（内置工具 + MCP 工具）
 * 对齐上游实现：按 claude-code/src/tools.ts assembleToolPool 原样复刻
 *
 * 设计原因：
 * 1. REPL.tsx（via useMergedTools）和 runAgent.ts 使用此函数
 *    确保一致的工具池组装
 * 2. 内置工具按名称排序，MCP 工具按名称排序
 *    保持内置工具为连续前缀，确保 prompt cache 稳定性
 * 3. uniqBy 按 name 去重，内置工具优先
 *
 * 注：当前使用简单去重替代 lodash/uniqBy，避免引入新依赖
 */
export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtInTools = getTools(permissionContext)

  // 过滤 MCP 工具中的拒绝列表
  const allowedMcpTools = filterToolsByDenyRules(mcpTools, permissionContext)

  // 排序：内置工具和 MCP 工具各自按名称排序
  // 对齐上游实现：保持内置工具为连续前缀，确保 prompt cache 稳定性
  const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)
  const sortedBuiltIn = [...builtInTools].sort(byName)
  const sortedMcp = allowedMcpTools.sort(byName)

  // 去重：内置工具优先，保留插入顺序
  const seen = new Set<string>()
  const result: Tool[] = []
  for (const tool of sortedBuiltIn.concat(sortedMcp)) {
    if (!seen.has(tool.name)) {
      seen.add(tool.name)
      result.push(tool)
    }
  }
  return result
}

// ============================================================================
// getMergedTools
// ============================================================================

/**
 * 获取所有工具（内置 + MCP），不做排序和去重
 * 对齐上游实现：按 claude-code/src/tools.ts getMergedTools 原样复刻
 *
 * 设计原因：
 * - 用于 ToolSearch 阈值计算、包含 MCP 工具的 token 计数
 * - 不需要排序稳定性
 * - 仅需内置工具时使用 getTools()
 */
export function getMergedTools(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtInTools = getTools(permissionContext)
  return [...builtInTools, ...mcpTools]
}
