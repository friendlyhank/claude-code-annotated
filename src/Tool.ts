/**
 * Tool module - Core tool system types.
 * 
 * 对齐上游实现：按 claude-code/src/Tool.ts 原样复刻
 * 设计原因：
 * 1. ToolUseContext 是工具执行的核心上下文类型
 * 2. 集中管理工具执行所需的所有依赖和状态
 * 3. 支持子代理继承和修改上下文
 */

import type { Message } from './types/message.js'
import type { AgentId } from './types/ids.js'
import type { ToolProgressData } from './types/tools.js'
import type { SystemPrompt } from './utils/systemPromptType.js'

// ============================================================================
// QueryChainTracking type
// 对齐上游实现：查询链追踪

/**
 * 查询链追踪 - 记录嵌套查询的深度和链 ID
 * 
 * 对齐上游实现：按 claude-code/src/Tool.ts QueryChainTracking 类型复刻
 * 设计原因：用于追踪嵌套代理调用的层级关系
 */
export type QueryChainTracking = {
  chainId: string
  depth: number
}

// ============================================================================
// ToolUseContext type
// 对齐上游实现：工具执行上下文

/**
 * 工具执行上下文 - 包含执行工具所需的全部状态和配置
 * 
 * 对齐上游实现：按 claude-code/src/Tool.ts:158-280 原样复刻
 * 设计原因：
 * 1. 集中管理工具执行所需的所有依赖
 * 2. 支持子代理继承和修改上下文
 * 3. 包含权限、状态、回调等完整信息
 * 
 * 字段说明：
 * - options: 配置选项（工具、命令、模型等）
 * - abortController: 中断控制器
 * - readFileState: 文件读取缓存
 * - getAppState/setAppState: 全局状态访问
 * - messages: 当前消息数组
 * - agentId: 子代理 ID（仅子代理设置）
 * - queryTracking: 查询链追踪
 * - 其他可选字段：权限、通知、压缩、文件历史等
 */
export type ToolUseContext = {
  options: {
    commands: unknown[]  // Command[] 类型，待 commands.ts 实现后替换
    debug: boolean
    mainLoopModel: string
    tools: Tools
    verbose: boolean
    // TODO: 已阅读源码，但不在今日最小闭环内
    // thinkingConfig: ThinkingConfig
    // mcpClients: MCPServerConnection[]
    // mcpResources: Record<string, ServerResource[]>
    /** 非交互式会话标记：true 表示 print/SDK/批处理模式，不启用 REPL/Ink 交互，也不会进行实时用户提示。 */
    isNonInteractiveSession: boolean
    // agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number
    /** Custom system prompt that replaces the default system prompt */
    customSystemPrompt?: string
    /** Additional system prompt appended after the main system prompt */
    appendSystemPrompt?: string
    /** Override querySource for analytics tracking */
    // querySource?: QuerySource
    /** Optional callback to get the latest tools (e.g., after MCP servers connect mid-query) */
    refreshTools?: () => Tools
    [key: string]: unknown
  }
  abortController: AbortController
  // TODO: 已阅读源码，但不在今日最小闭环内
  // readFileState: FileStateCache
  getAppState(): unknown  // () => AppState
  setAppState(f: (prev: unknown) => unknown): void  // (f: (prev: AppState) => AppState) => void
  /**
   * Always-shared setAppState for session-scoped infrastructure (background
   * tasks, session hooks). Unlike setAppState, which is no-op for async agents
   * (see createSubagentContext), this always reaches the root store so agents
   * at any nesting depth can register/clean up infrastructure that outlives
   * a single turn. Only set by createSubagentContext; main-thread contexts
   * fall back to setAppState.
   */
  setAppStateForTasks?: (f: (prev: unknown) => unknown) => void
  /**
   * Optional handler for URL elicitations triggered by tool call errors (-32042).
   * In print/SDK mode, this delegates to structuredIO.handleElicitation.
   * In REPL mode, this is undefined and the queue-based UI path is used.
   */
  // TODO: handleElicitation?: ...
  // setToolJSX?: SetToolJSXFn
  addNotification?: (notif: unknown) => void
  /** Append a UI-only system message to the REPL message list. Stripped at the
   *  normalizeMessagesForAPI boundary — the Exclude<> makes that type-enforced. */
  appendSystemMessage?: (msg: unknown) => void
  /** Send an OS-level notification (iTerm2, Kitty, Ghostty, bell, etc.) */
  sendOSNotification?: (opts: {
    message: string
    notificationType: string
  }) => void
  nestedMemoryAttachmentTriggers?: Set<string>
  /**
   * CLAUDE.md paths already injected as nested_memory attachments this
   * session. Dedup for memoryFilesToAttachments — readFileState is an LRU
   * that evicts entries in busy sessions, so its .has() check alone can
   * re-inject the same CLAUDE.md dozens of times.
   */
  loadedNestedMemoryPaths?: Set<string>
  dynamicSkillDirTriggers?: Set<string>
  /** Skill names surfaced via skill_discovery this session. Telemetry only (feeds was_discovered). */
  discoveredSkillNames?: Set<string>
  userModified?: boolean
  // 设置工具in-progress正在进行状态
  setInProgressToolUseIDs: (f: (prev: Set<string>) => Set<string>) => void
  /** Only wired in interactive (REPL) contexts; SDK/QueryEngine don't set this. */
  setHasInterruptibleToolInProgress?: (v: boolean) => void
  setResponseLength: (f: (prev: number) => number) => void
  /** Ant-only: push a new API metrics entry for OTPS tracking.
   *  Called by subagent streaming when a new API request starts. */
  pushApiMetricsEntry?: (ttftMs: number) => void
  // setStreamMode?: (mode: SpinnerMode) => void
  // onCompactProgress?: (event: CompactProgressEvent) => void
  // setSDKStatus?: (status: SDKStatus) => void
  openMessageSelector?: () => void
  updateFileHistoryState: (
    updater: (prev: unknown) => unknown,
  ) => void
  updateAttributionState: (
    updater: (prev: unknown) => unknown,
  ) => void
  // setConversationId?: (id: UUID) => void
  agentId?: AgentId // Only set for subagents; use getSessionId() for session ID. Hooks use this to distinguish subagent calls.
  agentType?: string // Subagent type name. For the main thread's --agent type, hooks fall back to getMainThreadAgentType().
  /** When true, canUseTool must always be called even when hooks auto-approve.
   *  Used by speculation for overlay file path rewriting. */
  requireCanUseTool?: boolean
  messages: Message[]
  fileReadingLimits?: {
    maxTokens?: number
    maxSizeBytes?: number
  }
  globLimits?: {
    maxResults?: number
  }
  toolDecisions?: Map<
    string,
    {
      source: string
      decision: 'accept' | 'reject'
      timestamp: number
    }
  >
  queryTracking?: QueryChainTracking
  /** Callback factory for requesting interactive prompts from the user.
   * Returns a prompt callback bound to the given source name.
   * Only available in interactive (REPL) contexts. */
  // TODO: requestPrompt?: ...
  toolUseId?: string
  criticalSystemReminder_EXPERIMENTAL?: string
  /** When true, preserve toolUseResult on messages even for subagents.
   * Used by in-process teammates whose transcripts are viewable by the user. */
  preserveToolUseResults?: boolean
  /** Local denial tracking state for async subagents whose setAppState is a
   *  no-op. Without this, the denial counter never accumulates and the
   *  fallback-to-prompting threshold is never reached. Mutable — the
   *  permissions code updates it in place. */
  // localDenialTracking?: DenialTrackingState
  /**
   * Per-conversation-thread content replacement state for the tool result
   * budget. When present, query.ts applies the aggregate tool result budget.
   * Main thread: REPL provisions once (never resets — stale UUID keys
   * are inert). Subagents: createSubagentContext clones the parent's state
   * by default (cache-sharing forks need identical decisions), or
   * resumeAgentBackground threads one reconstructed from sidechain records.
   */
  // contentReplacementState?: ContentReplacementState
  /**
   * Parent's rendered system prompt bytes, frozen at turn start.
   * Used by fork subagents to share the parent's prompt cache — re-calling
   * getSystemPrompt() at fork-spawn time can diverge (GrowthBook cold→warm)
   * and bust the cache. See forkSubagent.ts.
   */
  renderedSystemPrompt?: SystemPrompt
}

// ============================================================================
// Tool base types
// 对齐上游实现：为工具编排层补齐最小类型与辅助函数

export type AnyObject = {
  safeParse(input: unknown): { success: boolean; data: Record<string, unknown> }
}

export type ToolProgress<P extends ToolProgressData = ToolProgressData> = {
  toolUseID: string
  data: P
}

export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  name: string
  aliases?: string[]
  description?: string
  inputSchema: Input
  isConcurrencySafe(input: Record<string, unknown>): boolean // true为可并发，false为串行
  isEnabled(): boolean
  isReadOnly(input: Record<string, unknown>): boolean
  call?(
    input: Record<string, unknown>,
    context: ToolUseContext,
  ): AsyncGenerator<ToolProgress<P> | Message, Output> | Promise<Output> | Output
}

export type Tools = readonly Tool[]

// ============================================================================
// Helper functions
// 对齐上游实现：辅助函数

/**
 * Find tool by name
 * 
 * 对齐上游实现：按 claude-code/src/Tool.ts findToolByName 复刻
 * TODO: 待 tools 系统实现后补齐
 */
export function toolMatchesName(
  tool: { name: string; aliases?: string[] },
  name: string,
): boolean {
  return tool.name === name || (tool.aliases?.includes(name) ?? false)
}

export function findToolByName(tools: Tools, name: string): Tool | undefined {
  return tools.find(tool => toolMatchesName(tool, name))
}

/**
 * Check if tool matches name
 * 
 * 对齐上游实现：按 claude-code/src/Tool.ts toolMatchesName 复刻
 * TODO: 待 tools 系统实现后补齐
 */
