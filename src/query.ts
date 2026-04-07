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
  QueryParams,
  State,
  Terminal,
} from './types/query.js'
import type {
  StreamEvent,
  RequestStartEvent,
  Message,
  TombstoneMessage,
  ToolUseSummaryMessage,
} from './types/message.js'
import { productionDeps } from './query/deps.js'

// Re-export for external use
export type { QueryParams, State } from './types/query.js'
export type { QueryDeps, Terminal, Continue } from './query/deps.js'

// ============================================================================
// query() generator function
// 对齐上游实现：代理循环入口函数

/**
 * 查询生成器函数 - 代理循环的核心入口
 * 
 * 对齐上游实现：按 claude-code/src/query.ts:219-233 原样复刻
 * 设计原因：
 * 1. 使用 AsyncGenerator 支持流式输出
 * 2. yield 发送 StreamEvent/Message 给调用方
 * 3. return Terminal 标识循环终止
 * 
 * 数据流：
 * - 输入：QueryParams（消息、系统提示、工具上下文等）
 * - 输出：AsyncGenerator<StreamEvent | Message, Terminal>
 * - 状态：通过 State 对象在迭代间传递
 */
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
  // 对齐上游实现：consumedCommandUuids 用于追踪已消费的命令
  const consumedCommandUuids: string[] = []
  
  // 对齐上游实现：调用 queryLoop 执行主循环
  const terminal = yield* queryLoop(params, consumedCommandUuids)
  
  // 对齐上游实现：正常退出时通知命令生命周期
  // 只有 queryLoop 正常返回才会执行到这里
  // 如果 throw 或 .return() 则跳过此逻辑
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

/**
 * 查询循环 - 代理的主循环逻辑
 * 
 * 对齐上游实现：按 claude-code/src/query.ts:235-1300 结构复刻
 * 设计原因：
 * 1. 分离 query 和 queryLoop 便于生命周期管理
 * 2. while(true) 循环直到返回 Terminal
 * 3. State 对象集中管理跨迭代状态
 * 
 * 循环结构：
 * 1. 解构 State 获取当前状态
 * 2. 预处理消息（compact、snip 等）
 * 3. 调用 LLM API
 * 4. 收集工具调用
 * 5. 执行工具
 * 6. 判断是否需要继续
 * 7. 更新 State 并 continue 或 return Terminal
 */
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
  // 对齐上游实现：解构不可变参数
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
  
  // 对齐上游实现：使用 deps 或默认 productionDeps
  const deps = params.deps ?? productionDeps()

  // ============================================================================
  // State initialization
  // 对齐上游实现：初始化跨迭代可变状态
  
  // 对齐上游实现：每次迭代开始时解构读取，continue 站点写入新对象
  // 设计原因：避免多个单独赋值，集中管理状态变更
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

// ============================================================================
// Helper functions
// 对齐上游实现：辅助函数

/**
 * 生成缺失工具结果的块
 * 
 * 对齐上游实现：按 claude-code/src/query.ts:167-192 原样复刻
 * 设计原因：为没有匹配结果的 tool_use 生成错误消息
 * 
 * TODO: 实现此函数需要先实现 createUserMessage
 */
// function* yieldMissingToolResultBlocks(
//   assistantMessages: AssistantMessage[],
//   errorMessage: string,
// ) {
//   // TODO: 已阅读源码，但不在今日最小闭环内
// }
