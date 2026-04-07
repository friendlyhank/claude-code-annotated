/**
 * Message type definitions for Claude Code.
 * 
 * 对齐上游实现：按 claude-code/src/types/message.ts 原样复刻
 * 设计原因：使用判别联合（discriminated union）模式，
 * `type` 字段作为判别式，支持 TypeScript 类型守卫和自动收窄
 */

// Auto-generated stub — replace with real implementation
import type { UUID } from 'crypto'
import type {
  ContentBlockParam,
  ContentBlock,
} from '@anthropic-ai/sdk/resources/index.mjs'
import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

// TODO: 已阅读 gitOperationTracking.ts 源码，但不在今日最小闭环内，
// 当前直接定义类型，待实现 tools/shared/ 模块后再改为导入
export type BranchAction = 'merged' | 'rebased'
export type CommitKind = 'committed' | 'amended' | 'cherry-picked'
export type PrAction =
  | 'created'
  | 'edited'
  | 'merged'
  | 'commented'
  | 'closed'
  | 'ready'

/**
 * 消息类型判别式 - 用于区分不同消息子类型
 * 
 * 对齐上游实现：保持与源码相同的类型层级设计
 * 设计原因：
 * 1. `type` 作为判别式支持 switch/if 自动收窄
 * 2. `[key: string]: unknown` 允许灵活扩展，不强制所有字段显式声明
 * 3. `uuid` 是必填字段，用于消息唯一标识和历史追踪
 */
export type MessageType =
  | 'user'              // 用户消息 - 用户输入的文本或内容
  | 'assistant'         // 助手消息 - LLM 返回的响应
  | 'system'            // 系统消息 - 系统级通知、警告、错误等
  | 'attachment'        // 附件消息 - 文件、图片等附件内容
  | 'progress'          // 进度消息 - 任务执行进度更新
  | 'grouped_tool_use'  // 分组工具调用 - 多个工具调用合并为一个可折叠组
  | 'collapsed_read_search'  // 折叠的读/搜组 - 多个 read/search 工具调用折叠显示

/** A single content element inside message.content arrays. */
export type ContentItem = ContentBlockParam | ContentBlock

/**
 * 对齐上游实现：MessageContent 支持三种形态
 * 设计原因：兼容 Anthropic API 的多种消息格式
 * 1. string - 简单文本消息
 * 2. ContentBlockParam[] - 发送给 API 的格式
 * 3. ContentBlock[] - 从 API 返回的格式
 */
export type MessageContent = string | ContentBlockParam[] | ContentBlock[]

/**
 * Typed content array — used in narrowed message subtypes so that
 * `message.content[0]` resolves to `ContentItem` instead of
 * `string | ContentBlockParam | ContentBlock`.
 */
export type TypedMessageContent = ContentItem[]

/**
 * 对齐上游实现：按源码原样保留 Message 基类型结构
 * 边界处理：`[key: string]: unknown` 允许未知字段，保持与上游行为一致
 */
export type Message = {
  type: MessageType
  uuid: UUID
  isMeta?: boolean
  isCompactSummary?: boolean
  toolUseResult?: unknown
  isVisibleInTranscriptOnly?: boolean
  attachment?: { type: string; toolUseID?: string; [key: string]: unknown }
  message?: {
    role?: string
    id?: string
    content?: MessageContent
    usage?: BetaUsage | Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * 对齐上游实现：所有消息子类型按源码原样定义
 * 设计原因：通过 `& { type: 'xxx' }` 收窄类型，配合判别联合实现类型安全
 */
export type AssistantMessage = Message & { type: 'assistant' }
export type AttachmentMessage<T = unknown> = Message & { type: 'attachment'; attachment: { type: string; [key: string]: unknown } }
export type ProgressMessage<T = unknown> = Message & { type: 'progress'; data: T }
export type SystemLocalCommandMessage = Message & { type: 'system' }
export type SystemMessage = Message & { type: 'system' }
export type UserMessage = Message & { type: 'user' }

/**
 * 对齐上游实现：Normalized* 类型别名与源码保持一致
 * 设计原因：保留类型别名而非直接使用，便于未来扩展或区分语义
 */
export type NormalizedUserMessage = UserMessage
export type RequestStartEvent = { type: string; [key: string]: unknown }
export type StreamEvent = { type: string; [key: string]: unknown }

/**
 * 对齐上游实现：SystemCompactBoundaryMessage 结构与源码一致
 * 设计原因：compactMetadata 用于会话压缩时的边界标记
 */
export type SystemCompactBoundaryMessage = Message & {
  type: 'system'
  compactMetadata: {
    preservedSegment?: {
      headUuid: UUID
      tailUuid: UUID
      anchorUuid: UUID
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}
export type TombstoneMessage = Message
export type ToolUseSummaryMessage = Message
export type MessageOrigin = string
export type CompactMetadata = Record<string, unknown>
export type SystemAPIErrorMessage = Message & { type: 'system' }
export type SystemFileSnapshotMessage = Message & { type: 'system' }
export type NormalizedAssistantMessage<T = unknown> = AssistantMessage
export type NormalizedMessage = Message
export type PartialCompactDirection = string

/**
 * 对齐上游实现：StopHookInfo 用于 Hook 执行结果追踪
 */
export type StopHookInfo = {
  command?: string
  durationMs?: number
  [key: string]: unknown
}

/**
 * 对齐上游实现：所有 System*Message 类型按源码原样保留
 * 设计原因：通过命名区分不同系统消息的语义，便于代码阅读和类型收窄
 */
export type SystemAgentsKilledMessage = Message & { type: 'system' }        // 后台代理终止通知
export type SystemApiMetricsMessage = Message & { type: 'system' }          // API 调用指标统计
export type SystemAwaySummaryMessage = Message & { type: 'system' }         // 离线期间摘要
export type SystemBridgeStatusMessage = Message & { type: 'system' }        // 远程桥接状态
export type SystemInformationalMessage = Message & { type: 'system' }       // 信息性通知
export type SystemMemorySavedMessage = Message & { type: 'system' }         // 记忆保存通知
export type SystemMessageLevel = string                                     // 系统消息级别
export type SystemMicrocompactBoundaryMessage = Message & { type: 'system' } // 微压缩边界标记
export type SystemPermissionRetryMessage = Message & { type: 'system' }     // 权限重试提示
export type SystemScheduledTaskFireMessage = Message & { type: 'system' }   // 定时任务触发通知

/**
 * 对齐上游实现：SystemStopHookSummaryMessage 字段与源码一致
 * 设计原因：hookInfos 数组记录每个 hook 的执行详情
 */
export type SystemStopHookSummaryMessage = Message & {
  type: 'system'
  subtype: string
  hookLabel: string
  hookCount: number
  totalDurationMs?: number
  hookInfos: StopHookInfo[]
}

export type SystemTurnDurationMessage = Message & { type: 'system' }

/**
 * 对齐上游实现：GroupedToolUseMessage 用于批量工具调用展示
 * 设计原因：将多个工具调用合并为一个可折叠组，改善 UI 可读性
 */
export type GroupedToolUseMessage = Message & {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage | NormalizedUserMessage
}

/**
 * 对齐上游实现：RenderableMessage 联合类型与源码一致
 * 设计原因：明确哪些消息类型需要在 UI 中渲染
 */
export type RenderableMessage =
  | AssistantMessage
  | UserMessage
  | (Message & { type: 'system' })
  | (Message & { type: 'attachment'; attachment: { type: string; memories?: { path: string; content: string; mtimeMs: number }[]; [key: string]: unknown } })
  | (Message & { type: 'progress' })
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

/**
 * 对齐上游实现：CollapsibleMessage 用于可折叠消息组
 */
export type CollapsibleMessage =
  | AssistantMessage
  | UserMessage
  | GroupedToolUseMessage

/**
 * 对齐上游实现：CollapsedReadSearchGroup 结构与源码完全一致
 * 设计原因：将多个 read/search 工具调用合并为单个折叠组，
 * 避免长对话历史中大量工具调用占据屏幕空间
 */
export type CollapsedReadSearchGroup = {
  type: 'collapsed_read_search'
  uuid: UUID
  timestamp?: unknown
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  readFilePaths: string[]
  searchArgs: string[]
  latestDisplayHint?: string
  messages: CollapsibleMessage[]
  displayMessage: CollapsibleMessage
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  commits?: { sha: string; kind: CommitKind }[]
  pushes?: { branch: string }[]
  branches?: { ref: string; action: BranchAction }[]
  prs?: { number: number; url?: string; action: PrAction }[]
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: { path: string; content: string; mtimeMs: number }[]
  teamMemorySearchCount?: number
  teamMemoryReadCount?: number
  teamMemoryWriteCount?: number
  [key: string]: unknown
}

export type HookResultMessage = Message
export type SystemThinkingMessage = Message & { type: 'system' }
