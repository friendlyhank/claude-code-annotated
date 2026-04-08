// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered

/**
 * Query module - Core agent loop implementation.
 * 
 * 对齐上游实现：按 claude-code/src/query.ts 原样复刻
 * 设计原因：
 * 1. query() 是代理循环的入口生成器函数
 * 2. queryLoop() 实现主循环逻辑
 * 3. State 类型管理跨迭代可变状态
 */

import type {
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/index.mjs'
import type { CanUseToolFn } from './hooks/useCanUseTool.js'
// TODO: 已阅读源码，但不在今日最小闭环内
// import { FallbackTriggeredError } from './services/api/withRetry.js'
// import { calculateTokenWarningState, isAutoCompactEnabled, type AutoCompactTrackingState } from './services/compact/autoCompact.js'
// import { buildPostCompactMessages } from './services/compact/compact.js'
// import { logEvent } from './services/analytics/index.js'
// import { findToolByName, type ToolUseContext } from './Tool.js'
import type { ToolUseContext } from './Tool.js'
import { asSystemPrompt, type SystemPrompt } from './utils/systemPromptType.js'
import type {
  AssistantMessage,
  Message,
  RequestStartEvent,
  StreamEvent,
  ToolUseSummaryMessage,
  TombstoneMessage,
} from './types/message.js'
// TODO: 已阅读源码，但不在今日最小闭环内
// import { logError } from './utils/log.js'
// import { createUserMessage, normalizeMessagesForAPI, ... } from './utils/messages.js'
// import { prependUserContext, appendSystemContext } from './utils/api.js'
// import { notifyCommandLifecycle } from './utils/commandLifecycle.js'
// import { getRuntimeMainLoopModel, renderModelName } from './utils/model/model.js'
// import { doesMostRecentAssistantMessageExceed200k, ... } from './utils/tokens.js'
import type { QuerySource } from './constants/querySource.js'
// TODO: 已阅读源码，但不在今日最小闭环内
// import { StreamingToolExecutor } from './services/tools/StreamingToolExecutor.js'
// import { runTools } from './services/tools/toolOrchestration.js'
// import { handleStopHooks } from './query/stopHooks.js'
// import { buildQueryConfig } from './query/config.js'
import { productionDeps, type QueryDeps } from './query/deps.js'
import type { Terminal, Continue } from './query/transitions.js'
// TODO: 已阅读源码，但不在今日最小闭环内
// import { getCurrentTurnTokenBudget, getTurnOutputTokens, incrementBudgetContinuationCount } from './bootstrap/state.js'
// import { createBudgetTracker, checkTokenBudget } from './query/tokenBudget.js'

// Re-export for external use
export type { QueryDeps } from './query/deps.js'
export type { Terminal, Continue } from './query/transitions.js'

function* yieldMissingToolResultBlocks(
  assistantMessages: AssistantMessage[],
  errorMessage: string,
) {
  for (const assistantMessage of assistantMessages) {
    // Extract all tool use blocks from this assistant message
    const toolUseBlocks = (Array.isArray(assistantMessage.message?.content) ? assistantMessage.message.content : []).filter(
      (content: { type: string }) => content.type === 'tool_use',
    ) as ToolUseBlock[]

    // Emit an interruption message for each tool use
    for (const toolUse of toolUseBlocks) {
      // TODO: 已阅读源码，但不在今日最小闭环内
      // 需要 createUserMessage 函数
      // yield createUserMessage({
      //   content: [
      //     {
      //       type: 'tool_result',
      //       content: errorMessage,
      //       is_error: true,
      //       tool_use_id: toolUse.id,
      //     },
      //   ],
      //   toolUseResult: errorMessage,
      //   sourceToolAssistantUUID: assistantMessage.uuid,
      // })
    }
  }
}

/**
 * The rules of thinking are lengthy and fortuitous. They require plenty of thinking
 * of most long duration and deep meditation for a wizard to wrap one's noggin around.
 *
 * The rules follow:
 * 1. A message that contains a thinking or redacted_thinking block must be part of a query whose max_thinking_length > 0
 * 2. A thinking block may not be the last message in a block
 * 3. Thinking blocks must be preserved for the duration of an assistant trajectory (a single turn, or if that turn includes a tool_use block then also its subsequent tool_result and the following assistant message)
 *
 * Heed these rules well, young wizard. For they are the rules of thinking, and
 * the rules of thinking are the rules of the universe. If ye does not heed these
 * rules, ye will be punished with an entire day of debugging and hair pulling.
 */
const MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3

/**
 * Is this a max_output_tokens error message? If so, the streaming loop should
 * withhold it from SDK callers until we know whether the recovery loop can
 * continue. Yielding early leaks an intermediate error to SDK callers (e.g.
 * cowork/desktop) that terminate the session on any `error` field — the
 * recovery loop keeps running but nobody is listening.
 *
 * Mirrors reactiveCompact.isWithheldPromptTooLong.
 */
function isWithheldMaxOutputTokens(
  msg: Message | StreamEvent | undefined,
): msg is AssistantMessage {
  return msg?.type === 'assistant' && msg.apiError === 'max_output_tokens'
}

// ============================================================================
// QueryParams type
// 对齐上游实现：query() 函数的入参类型定义在文件内部

export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxOutputTokensOverride?: number
  maxTurns?: number
  skipCacheWrite?: boolean
  // API task_budget (output_config.task_budget, beta task-budgets-2026-03-13).
  // Distinct from the tokenBudget +500k auto-continue feature. `total` is the
  // budget for the whole agentic turn; `remaining` is computed per iteration
  // from cumulative API usage. See configureTaskBudgetParams in claude.ts.
  taskBudget?: { total: number }
  deps?: QueryDeps
}

// ============================================================================
// State type
// 对齐上游实现：query loop 的跨迭代可变状态定义在文件内部

// -- query loop state

// Mutable state carried between loop iterations
// 循环迭代间的可变状态
type State = {
  // 当前消息历史，随对话演进不断追加
  messages: Message[]
  // 工具执行上下文，包含工具注册表、权限等信息
  toolUseContext: ToolUseContext
  // 自动压缩追踪状态，记录压缩次数、失败计数等
  autoCompactTracking: AutoCompactTrackingState | undefined
  // 输出 token 超限恢复计数，用于限制恢复尝试次数
  maxOutputTokensRecoveryCount: number
  // 是否已尝试响应式压缩（超 token 时触发）
  hasAttemptedReactiveCompact: boolean
  // 覆盖 max_output_tokens 参数，恢复循环时使用
  maxOutputTokensOverride: number | undefined
  // 待处理的工具使用摘要 Promise，异步获取工具执行结果
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  // stop hook 是否激活中（用户中断处理）
  stopHookActive: boolean | undefined
  // 当前轮次计数，用于限制最大轮次
  turnCount: number
  // 上次迭代为何继续。首次迭代时为 undefined。
  // 用于测试断言恢复路径是否触发，无需检查消息内容。
  transition: Continue | undefined
}

// TODO: 已阅读源码，但不在今日最小闭环内
// AutoCompactTrackingState 应从 ./services/compact/autoCompact.js 导入
type AutoCompactTrackingState = {
  compacted: boolean
  turnId: string
  turnCounter: number
  consecutiveFailures: number
}

// ============================================================================
// query() generator function
// 对齐上游实现：代理循环入口函数

export async function* query(
  params: QueryParams,
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
> {
  const consumedCommandUuids: string[] = []
  const terminal = yield* queryLoop(params, consumedCommandUuids)
  // Only reached if queryLoop returned normally. Skipped on throw (error
  // propagates through yield*) and on .return() (Return completion closes
  // both generators). This gives the same asymmetric started-without-completed
  // signal as print.ts's drainCommandQueue when the turn fails.
  for (const uuid of consumedCommandUuids) {
    // TODO: 已阅读源码，但不在今日最小闭环内
    // notifyCommandLifecycle(uuid, 'completed')
    console.log(`[query] command completed: ${uuid}`)
  }
  return terminal
}

// ============================================================================
// queryLoop() - main loop implementation
// 对齐上游实现：主循环实现

async function* queryLoop(
  params: QueryParams,
  consumedCommandUuids: string[],
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
> {
  // Immutable params — never reassigned during the query loop.
  const {
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    fallbackModel,
    querySource,
    maxTurns,
    skipCacheWrite,
  } = params
  const deps = params.deps ?? productionDeps()

  // Mutable cross-iteration state. The loop body destructures this at the top
  // of each iteration so reads stay bare-name (`messages`, `toolUseContext`).
  // Continue sites write `state = { ... }` instead of 9 separate assignments.
  let state: State = {
    messages: params.messages,
    toolUseContext: params.toolUseContext,
    maxOutputTokensOverride: params.maxOutputTokensOverride,
    autoCompactTracking: undefined,
    stopHookActive: undefined,
    maxOutputTokensRecoveryCount: 0,
    hasAttemptedReactiveCompact: false,
    turnCount: 1,
    pendingToolUseSummary: undefined,
    transition: undefined,
  }
  // TODO: 已阅读源码，但不在今日最小闭环内
  // const budgetTracker = feature('TOKEN_BUDGET') ? createBudgetTracker() : null
  // let taskBudgetRemaining: number | undefined = undefined
  // const config = buildQueryConfig()

  // ============================================================================
  // Main loop
  // 对齐上游实现：while(true) 无限循环，直到 return Terminal
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 对齐上游实现：每次迭代开始解构 State
    const {
      messages,
      toolUseContext,
      autoCompactTracking,
      maxOutputTokensRecoveryCount,
      hasAttemptedReactiveCompact,
      maxOutputTokensOverride,
      pendingToolUseSummary,
      stopHookActive,
      turnCount,
      transition,
    } = state

    // 对齐上游实现：发送请求开始事件
    yield { type: 'stream_request_start' }

    // ============================================================================
    // TODO: 以下为已阅读但不在今日最小闭环内的源码逻辑
    // 后续迭代将逐步补齐：
    // 
    // 1. 消息预处理
    //    - applyToolResultBudget: 工具结果预算限制
    //    - snipCompact: 历史裁剪
    //    - microcompact: 微压缩
    //    - contextCollapse: 上下文折叠
    //    - autocompact: 自动压缩
    // 
    // 2. API 调用
    //    - 构建请求参数
    //    - 调用 deps.callModel
    //    - 流式处理响应
    // 
    // 3. 工具执行
    //    - 收集 tool_use blocks
    //    - 并行/串行执行工具
    //    - 处理工具结果
    // 
    // 4. 循环判断
    //    - needsFollowUp 决定是否继续
    //    - 更新 State
    //    - continue 或 return Terminal
    // ============================================================================

    // 对齐上游实现：当前为 stub 实现，直接返回终止状态
    // TODO: 实现完整的循环逻辑后移除此 stub
    return {
      reason: 'stub_implementation',
      message: 'Query loop stub - awaiting full implementation',
    } as Terminal
  }
}