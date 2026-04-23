/**
 * Tool module - Core tool system types and buildTool factory.
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts 原样复刻
 * 设计原因：
 * 1. Tool 类型定义工具的完整接口
 * 2. ToolUseContext 是工具执行的核心上下文
 * 3. buildTool 统一工具创建流程，确保默认行为一致
 * 4. 集中管理工具执行所需的类型定义
 */

import type {
  ToolResultBlockParam, // 工具结果块参数
  ToolUseBlockParam, // 工具使用块参数
} from '@anthropic-ai/sdk/resources/index.mjs'
import type { z } from 'zod/v4'
import type { AgentId } from './types/ids.js'
import type {
  AdditionalWorkingDirectory,
  PermissionMode,
  PermissionResult,
  ToolPermissionContext,
  ToolPermissionRulesBySource,
} from './types/permissions.js'
import type {
  AssistantMessage,
  AttachmentMessage,
  Message,
  ProgressMessage,
  SystemMessage,
  UserMessage,
} from './types/message.js'
import type {
  AgentToolProgress, // 代理工具进度
  BashProgress, // Bash 进度
  MCPProgress, // MCP 进度
  REPLToolProgress, // REPL 进度
  SkillToolProgress, // 技能工具进度
  TaskOutputProgress, // 任务输出进度
  ToolProgressData, // 工具进度数据
  WebSearchProgress, // Web 搜索进度
} from './types/tools.js'
import type { SystemPrompt } from './utils/systemPromptType.js'

// Re-export progress types for backwards compatibility
export type {
  AgentToolProgress,
  BashProgress,
  MCPProgress,
  REPLToolProgress,
  SkillToolProgress,
  TaskOutputProgress,
  WebSearchProgress,
}

// ============================================================================
// QueryChainTracking type
// ============================================================================

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
// ValidationResult type
// ============================================================================

/**
 * 输入验证结果
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ValidationResult 原样复刻
 * 设计原因：
 * - result: true 表示验证通过
 * - result: false 表示验证失败，包含错误信息和错误码
 */
export type ValidationResult =
  | { result: true }
  | {
      result: false
      message: string
      errorCode: number
    }

// ============================================================================
// ToolResult type
// ============================================================================

/**
 * 工具执行结果
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolResult 原样复刻
 * 设计原因：
 * - data: 工具返回的数据
 * - newMessages: 可选的新消息（用户/助手/附件/系统消息）
 * - contextModifier: 可选的上下文修改器（仅非并发安全工具使用）
 * - mcpMeta: MCP 协议元数据透传
 */
export type ToolResult<T> = {
  data: T
  newMessages?: (
    | UserMessage
    | AssistantMessage
    | AttachmentMessage
    | SystemMessage
  )[]
  // contextModifier is only honored for tools that aren't concurrency safe.
  contextModifier?: (context: ToolUseContext) => ToolUseContext
  /** MCP protocol metadata (structuredContent, _meta) to pass through to SDK consumers */
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
}

// ============================================================================
// ToolProgress type
// ============================================================================

/**
 * 工具进度数据
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolProgress 原样复刻
 */
export type ToolProgress<P extends ToolProgressData = ToolProgressData> = {
  toolUseID: string
  data: P
}

/**
 * 工具进度回调类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolCallProgress 原样复刻
 */
export type ToolCallProgress<P extends ToolProgressData = ToolProgressData> = (
  progress: ToolProgress<P>,
) => void

/**
 * 过滤工具进度消息
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts filterToolProgressMessages 原样复刻
 * 设计原因：排除 hook_progress 类型的进度消息
 */
export function filterToolProgressMessages(
  progressMessagesForMessage: ProgressMessage[], // 进度消息列表
): ProgressMessage<ToolProgressData>[] {
  return progressMessagesForMessage.filter(
    (msg): msg is ProgressMessage<ToolProgressData> =>
      (msg.data as { type?: string })?.type !== 'hook_progress',
  )
}

// ============================================================================
// AnyObject type (Zod schema)
// ============================================================================

/**
 * 任意对象 Schema 类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts AnyObject 原样复刻
 * 设计原因：工具输入 schema 必须输出 string key 的对象
 */
export type AnyObject = z.ZodType<{ [key: string]: unknown }>

// ============================================================================
// ToolInputJSONSchema type
// ============================================================================

/**
 * 工具输入 JSON Schema 类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolInputJSONSchema 原样复刻
 * 设计原因：MCP 工具可直接指定 JSON Schema，无需从 Zod 转换
 */
export type ToolInputJSONSchema = {
  [x: string]: unknown
  type: 'object'
  properties?: {
    [x: string]: unknown
  }
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * 检查工具名称是否匹配（主名称或别名）
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts toolMatchesName 原样复刻
 */
export function toolMatchesName(
  tool: { name: string; aliases?: string[] },
  name: string,
): boolean {
  return tool.name === name || (tool.aliases?.includes(name) ?? false)
}

/**
 * 按名称或别名查找工具
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts findToolByName 原样复刻
 */
export function findToolByName(tools: Tools, name: string): Tool | undefined {
  return tools.find(t => toolMatchesName(t, name))
}

// ============================================================================
// ToolPermissionContext helpers
// ============================================================================

/**
 * 空工具权限上下文
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts getEmptyToolPermissionContext 原样复刻
 * 设计原因：提供默认权限上下文，用于工具权限检查
 */
export const getEmptyToolPermissionContext: () => ToolPermissionContext =
  () => ({
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    isBypassPermissionsModeAvailable: false,
  })

// ============================================================================
// SetToolJSXFn type
// ============================================================================

/**
 * 设置工具 JSX 渲染的函数类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts SetToolJSXFn 原样复刻
 * 设计原因：工具可设置自定义 JSX 渲染内容
 */
export type SetToolJSXFn = (
  args: {
    jsx: React.ReactNode | null
    shouldHidePromptInput: boolean
    shouldContinueAnimation?: true
    showSpinner?: boolean
    isLocalJSXCommand?: boolean
    isImmediate?: boolean
    /** Set to true to clear a local JSX command (e.g., from its onDone callback) */
    clearLocalJSX?: boolean
  } | null,
) => void

// ============================================================================
// ToolUseContext type
// ============================================================================

/**
 * 工具执行上下文 - 包含执行工具所需的全部状态和配置
 * 设计原因：
 * 1. 集中管理工具执行所需的所有依赖
 * 2. 支持子代理继承和修改上下文
 * 3. 包含权限、状态、回调等完整信息
 */
export type ToolUseContext = {
  options: {
    // TODO: commands: Command[] 类型，待 commands.ts 实现后替换
    commands: unknown[]
    debug: boolean
    mainLoopModel: string // 主循环模型
    tools: Tools // 工具列表
    verbose: boolean // 是否开启详细日志
    // TODO: thinkingConfig: ThinkingConfig
    // TODO: mcpClients: MCPServerConnection[]
    // TODO: mcpResources: Record<string, ServerResource[]>
    /** 非交互式会话标记：true 表示 print/SDK/批处理模式 */
    isNonInteractiveSession: boolean
    // TODO: agentDefinitions: AgentDefinitionsResult
    maxBudgetUsd?: number // 最大预算（美元）
    /** Custom system prompt that replaces the default system prompt */
    customSystemPrompt?: string // 自定义系统提示
    /** Additional system prompt appended after the main system prompt */
    appendSystemPrompt?: string // 追加系统提示
    /** Override querySource for analytics tracking */
    // TODO: querySource?: QuerySource
    /** Optional callback to get the latest tools (e.g., after MCP servers connect mid-query) */
    refreshTools?: () => Tools // 刷新工具列表
    [key: string]: unknown
  }
  abortController: AbortController // 取消控制器
  // TODO: readFileState: FileStateCache
  readFileState?: unknown
  getAppState(): unknown // () => AppState
  setAppState(f: (prev: unknown) => unknown): void
  /**
   * Always-shared setAppState for session-scoped infrastructure.
   * 对齐上游实现：主线程上下文回退到 setAppState
   */
  setAppStateForTasks?: (f: (prev: unknown) => unknown) => void
  /**
   * Optional handler for URL elicitations.
   * 对齐上游实现：print/SDK 模式委托给 structuredIO，REPL 模式使用队列 UI
   */
  // TODO: handleElicitation?: (serverName, params, signal) => Promise<ElicitResult>
  setToolJSX?: SetToolJSXFn
  addNotification?: (notif: unknown) => void
  /** Append a UI-only system message to the REPL message list. */
  appendSystemMessage?: (
    msg: Exclude<SystemMessage, { type: 'local_command' }>,
  ) => void
  /** Send an OS-level notification (iTerm2, Kitty, Ghostty, bell, etc.) */
  sendOSNotification?: (opts: {
    message: string
    notificationType: string
  }) => void 
  nestedMemoryAttachmentTriggers?: Set<string> // 嵌套内存附件触发器
  loadedNestedMemoryPaths?: Set<string> // 已加载嵌套内存路径
  dynamicSkillDirTriggers?: Set<string> // 动态技能目录触发器
  discoveredSkillNames?: Set<string> // 已发现技能名称
  userModified?: boolean // 是否用户修改
  setInProgressToolUseIDs: (f: (prev: Set<string>) => Set<string>) => void // 设置当前进行中的工具使用 ID 列表
  /** Only wired in interactive (REPL) contexts; SDK/QueryEngine don't set this. */
  setHasInterruptibleToolInProgress?: (v: boolean) => void // 设置是否有可中断工具在进行中
  setResponseLength: (f: (prev: number) => number) => void // 设置响应长度
  /** Ant-only: push a new API metrics entry for OTPS tracking. */
  pushApiMetricsEntry?: (ttftMs: number) => void // 推送 API 指标条目
  // TODO: setStreamMode?: (mode: SpinnerMode) => void
  // TODO: onCompactProgress?: (event: CompactProgressEvent) => void
  // TODO: setSDKStatus?: (status: SDKStatus) => void
  openMessageSelector?: () => void // 打开消息选择器
  updateFileHistoryState: ( 
    updater: (prev: unknown) => unknown,
  ) => void // 更新文件历史记录状态
  updateAttributionState: (
    updater: (prev: unknown) => unknown,
  ) => void // 更新属性状态
  // TODO: setConversationId?: (id: UUID) => void
  agentId?: AgentId // 代理 ID
  agentType?: string // 代理类型
  requireCanUseTool?: boolean // 是否要求工具可使用
  messages: Message[] // 消息列表
  fileReadingLimits?: {
    maxTokens?: number // 最大令牌数
    maxSizeBytes?: number // 最大文件大小
  }
  globLimits?: {
    maxResults?: number // 最大结果数
  }
  toolDecisions?: Map<
    string,
    {
      source: string
      decision: 'accept' | 'reject'
      timestamp: number
    }
  >
  queryTracking?: QueryChainTracking // 查询链跟踪
  // TODO: requestPrompt?: (sourceName, toolInputSummary?) => (request) => Promise<PromptResponse>
  toolUseId?: string  // 工具使用 ID
  criticalSystemReminder_EXPERIMENTAL?: string // 严重系统提示实验性
  preserveToolUseResults?: boolean // 是否保留工具使用结果  
  // TODO: localDenialTracking?: DenialTrackingState
  // TODO: contentReplacementState?: ContentReplacementState
  renderedSystemPrompt?: SystemPrompt
}

// ============================================================================
// Progress type union
// ============================================================================

/**
 * 进度数据联合类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts Progress 原样复刻
 */
export type Progress = ToolProgressData // | HookProgress (TODO)

// ============================================================================
// Tool type (complete interface)
// ============================================================================

/**
 * 工具完整接口定义
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts Tool 原样复刻
 * 设计原因：
 * 1. 定义工具的所有方法和属性
 * 2. 支持类型安全的工具调用
 * 3. 包含权限检查、渲染、进度报告等完整能力
 */
export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  /**
   * Optional aliases for backwards compatibility when a tool is renamed.
   */
  aliases?: string[]  // 可选别名
  /**
   * One-line capability phrase used by ToolSearch for keyword matching.
   * 3–10 words, no trailing period.
   */
  searchHint?: string // 搜索提示语
  /**
   * 执行工具调用
   * 对齐上游实现：返回 Promise<ToolResult<Output>>
   */
  call(
    args: z.infer<Input>,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress?: ToolCallProgress<P>,
  ): Promise<ToolResult<Output>>
  /**
   * 生成工具描述
   * 对齐上游实现：返回 Promise<string>
   */
  description(
    input: z.infer<Input>,
    options: {
      isNonInteractiveSession: boolean
      toolPermissionContext: ToolPermissionContext
      tools: Tools
    },
  ): Promise<string>
  /** Zod input schema */
  readonly inputSchema: Input // 输入模式
   /** JSON Schema for MCP tools that specify their input schema directly */
  readonly inputJSONSchema?: ToolInputJSONSchema // 输入 JSON 模式实验性
  /** Optional output schema */
  outputSchema?: z.ZodType<unknown> // 输出模式
  /** Check if two inputs are equivalent */
  inputsEquivalent?(a: z.infer<Input>, b: z.infer<Input>): boolean // 检查两个输入是否相等
  /**
   * 是否并发安全
   * 对齐上游实现：默认 false（假设不安全）
   */
  isConcurrencySafe(input: z.infer<Input>): boolean
  /**
   * 是否启用
   * 对齐上游实现：默认 true
   */
  isEnabled(): boolean
  /**
   * 是否只读
   * 对齐上游实现：默认 false（假设写入）
   */
  isReadOnly(input: z.infer<Input>): boolean
  /**
   * 是否破坏性操作
   * 对齐上游实现：默认 false，仅对不可逆操作设置为 true
   */
  isDestructive?(input: z.infer<Input>): boolean
  /**
   * 中断行为：用户提交新消息时的处理方式
   * - 'cancel': 停止工具并丢弃结果
   * - 'block': 继续运行，新消息等待
   * 默认 'block'
   */
  interruptBehavior?(): 'cancel' | 'block'
  /**
   * 是否为搜索/读取命令
   * 对齐上游实现：用于 UI 折叠显示
   */
  isSearchOrReadCommand?(input: z.infer<Input>): {
    isSearch: boolean
    isRead: boolean
    isList?: boolean
  }
  /**
   * 是否开放世界操作
   * 对齐上游实现：用于权限检查
   */
  isOpenWorld?(input: z.infer<Input>): boolean
  /**
   * 是否需要用户交互
   */
  requiresUserInteraction?(): boolean
  /** 是否为 MCP 工具 */
  isMcp?: boolean
  /** 是否为 LSP 工具 */
  isLsp?: boolean
  /**
   * 是否延迟加载
   * 对齐上游实现：ToolSearch 启用时，工具以 defer_loading: true 发送
   */
  readonly shouldDefer?: boolean
  /**
   * 是否始终加载
   * 对齐上游实现：ToolSearch 启用时也完整发送 schema
   */
  readonly alwaysLoad?: boolean
  /**
   * MCP 工具信息
   */
  mcpInfo?: { serverName: string; toolName: string }
  /** 工具名称 */
  readonly name: string
  /**
   * 最大结果字符数
   * 对齐上游实现：超过此值时结果持久化到磁盘
   */
  maxResultSizeChars: number
  /** 是否启用严格模式 */
  readonly strict?: boolean
  /**
   * 回填可观察输入
   * 对齐上游实现：在观察者看到之前调用，可变修改输入
   */
  backfillObservableInput?(input: Record<string, unknown>): void
  /**
   * 验证输入
   * 对齐上游实现：在 checkPermissions 之前调用
   */
  validateInput?(
    input: z.infer<Input>,
    context: ToolUseContext,
  ): Promise<ValidationResult>
  /**
   * 检查权限
   * 对齐上游实现：在 validateInput 通过后调用
   */
  checkPermissions(
    input: z.infer<Input>,
    context: ToolUseContext,
  ): Promise<PermissionResult>
  /**
   * 获取工具操作的路径
   */
  getPath?(input: z.infer<Input>): string
  /**
   * 准备权限匹配器
   * 对齐上游实现：用于 hook if 条件匹配
   */
  preparePermissionMatcher?(
    input: z.infer<Input>,
  ): Promise<(pattern: string) => boolean>
  /**
   * 生成工具提示
   */
  prompt(options: {
    getToolPermissionContext: () => Promise<ToolPermissionContext>
    tools: Tools
    agents: unknown[] // AgentDefinition[]
    allowedAgentTypes?: string[]
  }): Promise<string>
  /**
   * 用户面向名称
   */
  userFacingName(input: Partial<z.infer<Input>> | undefined): string
  /**
   * 用户面向名称背景色
   */
  userFacingNameBackgroundColor?(
    input: Partial<z.infer<Input>> | undefined,
  ): string | undefined // keyof Theme
  /**
   * 是否透明包装器
   */
  isTransparentWrapper?(): boolean
  /**
   * 获取工具使用摘要
   */
  getToolUseSummary?(input: Partial<z.infer<Input>> | undefined): string | null
  /**
   * 获取活动描述
   * 对齐上游实现：用于 spinner 显示
   */
  getActivityDescription?(
    input: Partial<z.infer<Input>> | undefined,
  ): string | null
  /**
   * 转换为自动分类器输入
   */
  toAutoClassifierInput(input: z.infer<Input>): unknown
  /**
   * 映射工具结果到 API 块参数
   */
  mapToolResultToToolResultBlockParam(
    content: Output,
    toolUseID: string,
  ): ToolResultBlockParam
  /**
   * 渲染工具结果消息
   */
  renderToolResultMessage?(
    content: Output,
    progressMessagesForMessage: ProgressMessage<P>[],
    options: {
      style?: 'condensed'
      theme: string // ThemeName
      tools: Tools
      verbose: boolean
      isTranscriptMode?: boolean
      isBriefOnly?: boolean
      input?: unknown
    },
  ): React.ReactNode
  /**
   * 提取搜索文本
   */
  extractSearchText?(out: Output): string
  /**
   * 渲染工具使用消息
   */
  renderToolUseMessage(
    input: Partial<z.infer<Input>>,
    options: { theme: string; verbose: boolean; commands?: unknown[] },
  ): React.ReactNode
  /**
   * 结果是否被截断
   */
  isResultTruncated?(output: Output): boolean
  /**
   * 渲染工具使用标签
   */
  renderToolUseTag?(input: Partial<z.infer<Input>>): React.ReactNode
  /**
   * 渲染工具使用进度消息
   */
  renderToolUseProgressMessage?(
    progressMessagesForMessage: ProgressMessage<P>[],
    options: {
      tools: Tools
      verbose: boolean
      terminalSize?: { columns: number; rows: number }
      inProgressToolCallCount?: number
      isTranscriptMode?: boolean
    },
  ): React.ReactNode
  /**
   * 渲染工具使用排队消息
   */
  renderToolUseQueuedMessage?(): React.ReactNode
  /**
   * 渲染工具使用拒绝消息
   */
  renderToolUseRejectedMessage?(
    input: z.infer<Input>,
    options: {
      columns: number
      messages: Message[]
      style?: 'condensed'
      theme: string
      tools: Tools
      verbose: boolean
      progressMessagesForMessage: ProgressMessage<P>[]
      isTranscriptMode?: boolean
    },
  ): React.ReactNode
  /**
   * 渲染工具使用错误消息
   */
  renderToolUseErrorMessage?(
    result: ToolResultBlockParam['content'],
    options: {
      progressMessagesForMessage: ProgressMessage<P>[]
      tools: Tools
      verbose: boolean
      isTranscriptMode?: boolean
    },
  ): React.ReactNode
  /**
   * 渲染分组工具使用
   */
  renderGroupedToolUse?(
    toolUses: Array<{
      param: ToolUseBlockParam
      isResolved: boolean
      isError: boolean
      isInProgress: boolean
      progressMessages: ProgressMessage<P>[]
      result?: {
        param: ToolResultBlockParam
        output: unknown
      }
    }>,
    options: {
      shouldAnimate: boolean
      tools: Tools
    },
  ): React.ReactNode | null
}

// ============================================================================
// CanUseToolFn type
// ============================================================================

/**
 * 检查工具是否可用的函数类型
 *
 * 对齐上游实现：按 claude-code/src/hooks/useCanUseTool.ts 原样复刻
 */
export type CanUseToolFn = (
  tool: Tool,
  input: Record<string, unknown>,
  context: ToolUseContext,
) => Promise<{ result: true } | { result: false; message: string }>

// ============================================================================
// Tools type
// ============================================================================

/**
 * 工具集合类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts Tools 原样复刻
 * 设计原因：使用 readonly 确保不可变，便于追踪工具集组装和过滤
 */
export type Tools = readonly Tool[] // 工具列表

// ============================================================================
// TOOL_DEFAULTS and buildTool
// ============================================================================

/**
 * buildTool 默认提供的方法
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts DefaultableToolKeys 原样复刻
 * ToolDef 可省略这些方法，生成的 Tool 总是包含它们
 */
type DefaultableToolKeys =
  | 'isEnabled'
  | 'isConcurrencySafe'
  | 'isReadOnly'
  | 'isDestructive'
  | 'checkPermissions'
  | 'toAutoClassifierInput'
  | 'userFacingName'

/**
 * Tool 定义类型（部分 Tool）
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolDef 原样复刻
 * 可省略默认方法，buildTool 会填充
 */
export type ToolDef<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = Omit<Tool<Input, Output, P>, DefaultableToolKeys> &
  Partial<Pick<Tool<Input, Output, P>, DefaultableToolKeys>>

/**
 * 类型级 spread：{ ...TOOL_DEFAULTS, ...def }
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts BuiltTool 原样复刻
 * 对于每个可默认键：如果 D 提供（required），D 的类型优先；
 * 如果 D 省略或可选（继承自 Partial<>），则使用默认值
 */
type BuiltTool<D> = Omit<D, DefaultableToolKeys> & {
  [K in DefaultableToolKeys]-?: K extends keyof D
    ? undefined extends D[K]
      ? ToolDefaults[K]
      : D[K]
    : ToolDefaults[K]
}

/**
 * 工具默认实现
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts TOOL_DEFAULTS 原样复刻
 * 设计原因：所有工具导出应通过 buildTool，确保默认行为一致
 *
 * 默认值（fail-closed 原则）：
 * - isEnabled → true
 * - isConcurrencySafe → false（假设不安全）
 * - isReadOnly → false（假设写入）
 * - isDestructive → false
 * - checkPermissions → { behavior: 'allow', updatedInput }（委托给通用权限系统）
 * - toAutoClassifierInput → ''（跳过分类器——安全相关工具必须覆盖）
 * - userFacingName → name
 */
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input?: unknown) => false,
  isReadOnly: (_input?: unknown) => false,
  isDestructive: (_input?: unknown) => false,
  checkPermissions: (
    input: { [key: string]: unknown },
    _ctx?: ToolUseContext,
  ): Promise<PermissionResult> =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input?: unknown) => '',
  userFacingName: (_input?: unknown) => '',
}

/**
 * TOOL_DEFAULTS 的类型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts ToolDefaults 原样复刻
 * 注：defaults 类型是 TOOL_DEFAULTS 的实际形状（可选参数以支持 0 参数和完整参数调用）
 */
type ToolDefaults = typeof TOOL_DEFAULTS

/**
 * AnyToolDef 用于约束 buildTool 泛型
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts AnyToolDef 原样复刻
 * D 从调用点推断具体对象字面量类型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDef = ToolDef<any, any, any>

/**
 * 从部分定义构建完整 Tool
 *
 * 对齐上游实现：按 claude-code/src/Tool.ts buildTool 原样复刻
 * 设计原因：
 * 1. 填充安全默认值
 * 2. 调用者无需 ?.() ?? default
 * 3. 默认值集中在一处
 *
 * @param def 部分工具定义
 * @returns 完整工具对象
 */
export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  // 运行时 spread 直截了当；as 桥接结构 any 约束和精确 BuiltTool<D> 返回类型
  // 类型语义通过所有 60+ 工具的 0 错误类型检查证明
  return {
    ...TOOL_DEFAULTS,
    userFacingName: () => def.name,
    ...def,
  } as BuiltTool<D>
}