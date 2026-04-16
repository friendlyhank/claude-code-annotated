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
import { runTools } from './services/tools/toolOrchestration.js'
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

// yieldMissingToolResultBlocks - 生成缺失的工具结果块
// 设计原因：
// 1. 当工具调用失败时，需要生成中断消息以通知用户
// 2. 每个工具调用块都需要生成一个中断消息
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
// isWithheldMaxOutputTokens - 判断消息是否为 max_output_tokens 错误消息
// 设计原因：
// 1. 当 max_output_tokens 错误时，需要 withhold 消息， SDK 调用者无法直接访问
// 2. 恢复循环需要根据错误消息判断是否可以继续
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
    let { toolUseContext } = state
    const {
      messages,
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
    // 消息预处理（简化版）
    // 对齐上游实现：按 claude-code/src/query.ts:340-560 原样复刻
    // TODO: 完整实现包括 applyToolResultBudget, snipCompact, microcompact, autocompact

    // 对齐上游实现：构建完整系统提示
    // fullSystemPrompt = appendSystemContext(systemPrompt, systemContext)
    // 本次简化：直接使用 systemPrompt
    const fullSystemPrompt = asSystemPrompt(systemPrompt)

    // 对齐上游实现：准备消息用于查询
    // 本次简化：直接使用 messages，跳过压缩流程
    let messagesForQuery = [...messages]

    // 对齐上游实现：更新 toolUseContext.messages
    // 参考 claude-code/src/query.ts:580-582
    // 保留复用toolUseContext，只更新 messages
    toolUseContext = {
      ...toolUseContext,
      messages: messagesForQuery,
    }

    // ============================================================================
    // 初始化收集容器
    // 对齐上游实现：按 claude-code/src/query.ts:595-605 原样复刻

    // 收集 assistant messages（用于后续工具执行和状态更新）
    const assistantMessages: AssistantMessage[] = []
    // 收集工具结果（用于下一轮 API 调用）
    // TODO: 待 messages.ts 实现后使用 UserMessage | AttachmentMessage 类型
    const toolResults: Message[] = []
    // 收集 tool_use blocks（用于判断是否需要继续循环）
    // @see https://docs.claude.com/en/docs/build-with-claude/tool-use
    // Note: stop_reason === 'tool_use' is unreliable -- it's not always set correctly.
    // Set during streaming whenever a tool_use block arrives — the sole
    // loop-exit signal. If false after streaming, we're done (modulo stop-hook retry).
    const toolUseBlocks: ToolUseBlock[] = []
    // 是否需要继续循环（有工具调用时为 true）
    let needsFollowUp = false

    // ============================================================================
    // 获取当前模型
    // 对齐上游实现：按 claude-code/src/query.ts:615-625 原样复刻
    // TODO: 实现完整的模型选择逻辑（plan mode 检查 200k token 等）
    const currentModel = toolUseContext.options.mainLoopModel

    // ============================================================================
    // API 调用
    // 对齐上游实现：按 claude-code/src/query.ts:690-840 原样复刻

    try {
      // 对齐上游实现：构建 callModel 参数
      // 参考 claude-code/src/query.ts:690-770
      // 调用queryModelWithStreaming 获取流式响应
      for await (const message of deps.callModel({
        messages: messagesForQuery,
        systemPrompt: fullSystemPrompt,
        signal: toolUseContext.abortController.signal,
        // TODO: 已阅读源码，但不在今日最小闭环内
        // thinkingConfig: toolUseContext.options.thinkingConfig,
        tools: toolUseContext.options.tools, // 传递工具列表
        options: {
          model: currentModel,
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          // TODO: 已阅读源码，但不在今日最小闭环内
          // fallbackModel,
          // querySource,
          // getToolPermissionContext: async () => appState.toolPermissionContext,
        },
      })) {
        // ============================================================================
        // 流式响应处理
        // 对齐上游实现：按 claude-code/src/query.ts:770-840 原样复刻

        // TODO: 待 services/api/claude.ts 实现后，message 类型将自动正确
        // 当前需要类型断言，因为 callModel 返回 AsyncGenerator<unknown>
        const typedMessage = message as Message | StreamEvent

        // 对齐上游实现：yield message 给调用者
        yield typedMessage

        // 对齐上游实现：收集 assistant message
        // 参考 claude-code/src/query.ts:810-830
        if (typedMessage.type === 'assistant') {
          const assistantMessage = typedMessage as AssistantMessage
          assistantMessages.push(assistantMessage)

          // 对齐上游实现：提取 tool_use blocks
          const msgToolUseBlocks = (Array.isArray(assistantMessage.message?.content) 
            ? assistantMessage.message.content 
            : []
          ).filter(
            (content: { type: string }) => content.type === 'tool_use',
          ) as ToolUseBlock[]
          
          // 说明有工具调用，需要继续循环
          if (msgToolUseBlocks.length > 0) {
            toolUseBlocks.push(...msgToolUseBlocks)
            needsFollowUp = true
          }
        }
      }
    } catch (error) {
      // 对齐上游实现：错误处理
      // 参考 claude-code/src/query.ts:850-895
      // TODO: 实现完整的错误处理（ImageSizeError, ImageResizeError 等）
      // const errorMessage = error instanceof Error ? error.message : String(error)
      
      // 对齐上游实现：为未完成的 tool_use 生成错误结果
      // 参考 claude-code/src/query.ts:880-885
      yield* yieldMissingToolResultBlocks(
        assistantMessages,
        error instanceof Error ? error.message : 'Unknown error',
      )

      // TODO: 已阅读源码，但不在今日最小闭环内
      // yield createAssistantAPIErrorMessage({ content: errorMessage })
      
      return { reason: 'model_error', error } as Terminal
    }

    // ============================================================================
    // 循环判断
    // 对齐上游实现：按 claude-code/src/query.ts:900-1730 原样复刻

    // 对齐上游实现：检查中断信号
    // 参考 claude-code/src/query.ts:900-940
    if (toolUseContext.abortController.signal.aborted) {
      // 对齐上游实现：为未完成的工具生成中断结果
      yield* yieldMissingToolResultBlocks(
        assistantMessages,
        'Interrupted by user',
      )
      
      // TODO: 已阅读源码，但不在今日最小闭环内
      // yield createUserInterruptionMessage({ toolUse: true })
      
      return { reason: 'aborted_streaming' } as Terminal
    }

    // 对齐上游实现：检查是否需要继续循环
    // 参考 claude-code/src/query.ts:950-1730
    if (!needsFollowUp) {
      // 没有工具调用，循环结束
      // TODO: 已阅读源码，但不在今日最小闭环内
      // - 检查 max_output_tokens 错误
      // - 执行 stop hooks
      // - token budget 检查
      return { reason: 'completed' } as Terminal
    }

    // ============================================================================
    // 工具执行
    // 对齐上游实现：tool_use 出现后进入工具批次编排，再把结果拼回下一轮消息。
    // 当前闭环只覆盖 runTools 接入；单工具真实执行、summary、attachments 继续延后。
    let updatedToolUseContext = toolUseContext

    // 工具编排和执行调用
    for await (const update of runTools(
      toolUseBlocks,
      assistantMessages,
      canUseTool,
      toolUseContext,
    )) {
      if (update.message) {
        yield update.message
        toolResults.push(update.message)
      }
      updatedToolUseContext = update.newContext
    }

    // 检查工具调用是否被中断
    if (updatedToolUseContext.abortController.signal.aborted) {
      return { reason: 'aborted_tools' } as Terminal
    }

    const nextTurnCount = turnCount + 1
    if (maxTurns && nextTurnCount > maxTurns) {
      return { reason: 'max_turns', turnCount: nextTurnCount } as Terminal
    }

    state = {
      messages: [...messagesForQuery, ...assistantMessages, ...toolResults], // 拼回下一轮消息
      toolUseContext: updatedToolUseContext, // 更新工具上下文
      autoCompactTracking,  // 保持自动压缩跟踪
      maxOutputTokensRecoveryCount: 0, // 重置最大输出 tokens 恢复计数
      hasAttemptedReactiveCompact: false, // 重置响应压缩尝试
      maxOutputTokensOverride: undefined, // 重置最大输出 tokens 重写
      pendingToolUseSummary: undefined, // 重置待处理工具调用摘要
      stopHookActive, // 保持中断信号
      turnCount: nextTurnCount, // 更新轮次
      transition: { reason: 'next_turn' },
    }
    continue
  }
}
