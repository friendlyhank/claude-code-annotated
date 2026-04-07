/**
 * Core type definitions for Claude Code.
 * 
 * 对齐上游实现：按 claude-code/src/types/ 目录结构组织导出
 * 设计原因：
 * 1. 统一入口便于外部模块导入 `from 'src/types'`
 * 2. 分离到子文件避免单文件过大，同时保持类型定义的模块化
 * 3. re-export 而非 re-declare，保持类型来源可追溯
 */

// ============================================================================
// ID types (branded types for session/agent IDs)
// 对齐上游实现：SessionId/AgentId 防止编译时 ID 混用
export type { SessionId, AgentId } from './ids.js'
export { asSessionId, asAgentId, toAgentId } from './ids.js'

// ============================================================================
// Message types
// 对齐上游实现：按源码原样导出所有消息类型
// 设计原因：Message 类型体系是整个会话系统的核心，50+ 类型覆盖所有消息形态
export type {
  MessageType,
  ContentItem,
  MessageContent,
  TypedMessageContent,
  Message,
  AssistantMessage,
  AttachmentMessage,
  ProgressMessage,
  SystemLocalCommandMessage,
  SystemMessage,
  UserMessage,
  NormalizedUserMessage,
  RequestStartEvent,
  StreamEvent,
  SystemCompactBoundaryMessage,
  TombstoneMessage,
  ToolUseSummaryMessage,
  MessageOrigin,
  CompactMetadata,
  SystemAPIErrorMessage,
  SystemFileSnapshotMessage,
  NormalizedAssistantMessage,
  NormalizedMessage,
  PartialCompactDirection,
  StopHookInfo,
  SystemAgentsKilledMessage,
  SystemApiMetricsMessage,
  SystemAwaySummaryMessage,
  SystemBridgeStatusMessage,
  SystemInformationalMessage,
  SystemMemorySavedMessage,
  SystemMessageLevel,
  SystemMicrocompactBoundaryMessage,
  SystemPermissionRetryMessage,
  SystemScheduledTaskFireMessage,
  SystemStopHookSummaryMessage,
  SystemTurnDurationMessage,
  GroupedToolUseMessage,
  RenderableMessage,
  CollapsibleMessage,
  CollapsedReadSearchGroup,
  HookResultMessage,
  SystemThinkingMessage,
  BranchAction,
  CommitKind,
  PrAction,
} from './message.js'

// ============================================================================
// Tool progress types
// 对齐上游实现：工具进度类型目前为 stub，待工具系统实现后完善
export type {
  AgentToolProgress,
  BashProgress,
  MCPProgress,
  REPLToolProgress,
  SkillToolProgress,
  TaskOutputProgress,
  ToolProgressData,
  WebSearchProgress,
  ShellProgress,
  PowerShellProgress,
  SdkWorkflowProgress,
} from './tools.js'

// ============================================================================
// Utility types
// 对齐上游实现：通用工具类型
export type { DeepImmutable, Permutations } from './utils.js'
