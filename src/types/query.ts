/**
 * Query-related type definitions for Claude Code.
 * 
 * 对齐上游实现：按 claude-code/src/query.ts 类型定义原样复刻
 * 设计原因：QueryParams 和 State 是代理循环的核心类型，
 * 分别定义入参和跨迭代可变状态
 * 
 * 注意：QueryDeps, Terminal, Continue 从 src/query/ 目录导入
 * 保持与源码目录结构一致
 */

import type { Message, ToolUseSummaryMessage } from './message.js'
import type { AgentId } from './ids.js'
import type { QueryDeps } from '../query/deps.js'
import type { Terminal, Continue } from '../query/transitions.js'
import type { ToolUseContext, QueryChainTracking } from '../Tool.js'

// Re-export for convenience
export type { QueryDeps } from '../query/deps.js'
export type { Terminal, Continue } from '../query/transitions.js'
export type { ToolUseContext, QueryChainTracking } from '../Tool.js'

// ============================================================================
// SystemPrompt branded type
// 对齐上游实现：使用品牌类型确保系统提示不被意外替换

/**
 * 系统提示类型 - 品牌类型包装的只读字符串数组
 * 
 * 对齐上游实现：按 claude-code/src/utils/systemPromptType.ts 原样复刻
 * 设计原因：品牌类型防止普通字符串数组被误传为系统提示
 */
export type SystemPrompt = readonly string[] & {
  readonly __brand: 'SystemPrompt'
}

/**
 * 将字符串数组转换为 SystemPrompt 类型
 * 对齐上游实现：运行时无操作，仅用于类型断言
 */
export function asSystemPrompt(value: readonly string[]): SystemPrompt {
  return value as SystemPrompt
}

// ============================================================================
// QuerySource type
// 对齐上游实现：查询来源标识用于分析和追踪

/**
 * 查询来源类型 - 标识查询的发起源头
 * 
 * 对齐上游实现：按 claude-code/src/constants/querySource.ts 类型复刻
 * 设计原因：
 * 1. 用于分析统计，区分不同场景的查询行为
 * 2. 影响日志记录和遥测数据
 */
export type QuerySource =
  | 'repl_main_thread'      // REPL 主线程
  | 'agent:explore'         // 探索代理
  | 'agent:plan'            // 规划代理
  | 'agent:task'            // 任务代理
  | string                  // 其他代理类型

// ============================================================================
// AutoCompactTrackingState type
// 对齐上游实现：自动压缩追踪状态

/**
 * 自动压缩追踪状态 - 记录压缩历史和失败计数
 * 
 * 对齐上游实现：按 claude-code/src/services/compact/autoCompact.ts 类型复刻
 * 设计原因：
 * 1. compacted 标记是否已执行过压缩
 * 2. turnCounter 记录压缩后的轮次
 * 3. consecutiveFailures 用于熔断，防止无限重试
 */
export type AutoCompactTrackingState = {
  compacted: boolean
  turnId: string
  turnCounter: number
  consecutiveFailures: number
}

// ============================================================================
// CanUseToolFn type
// 对齐上游实现：工具使用权限检查函数类型

/**
 * 工具使用权限检查函数类型
 * 
 * 对齐上游实现：按 claude-code/src/hooks/useCanUseTool.ts 类型复刻
 * 设计原因：在工具执行前检查权限，支持自动批准和交互式确认
 */
export type CanUseToolFn = (toolName: string, input: unknown) => Promise<boolean>

// ============================================================================
// QueryParams type
// 对齐上游实现：query() 函数的入参类型

/**
 * 查询参数类型 - query() 函数的完整入参定义
 * 
 * 对齐上游实现：按 claude-code/src/query.ts:181-206 原样复刻
 * 设计原因：
 * 1. messages 是会话历史的消息数组
 * 2. systemPrompt 是注入的系统提示
 * 3. toolUseContext 包含工具执行所需的上下文
 * 4. deps 支持依赖注入，便于测试
 */
export type QueryParams = {
  /** 会话历史消息数组 */
  messages: Message[]
  /** 系统提示（品牌类型） */
  systemPrompt: SystemPrompt
  /** 用户上下文键值对 */
  userContext: { [k: string]: string }
  /** 系统上下文键值对 */
  systemContext: { [k: string]: string }
  /** 工具使用权限检查函数 */
  canUseTool: CanUseToolFn
  /** 工具执行上下文 */
  toolUseContext: ToolUseContext
  /** 备用模型名称 */
  fallbackModel?: string
  /** 查询来源标识 */
  querySource: QuerySource
  /** 输出 token 数上限覆盖 */
  maxOutputTokensOverride?: number
  /** 最大轮次限制 */
  maxTurns?: number
  /** 跳过缓存写入 */
  skipCacheWrite?: boolean
  /** API 任务预算（task_budget beta 功能） */
  taskBudget?: { total: number }
  /** 依赖注入接口 */
  deps?: QueryDeps
}

// ============================================================================
// State type
// 对齐上游实现：query loop 的跨迭代可变状态

/**
 * 查询循环状态 - 跨迭代携带的可变状态
 * 
 * 对齐上游实现：按 claude-code/src/query.ts:204-216 原样复刻
 * 设计原因：
 * 1. 每次循环迭代开始时解构读取
 * 2. continue 站点写入新的 state 对象（而非多个单独赋值）
 * 3. 集中管理所有可变状态，避免状态分散
 */
export type State = {
  /** 当前消息数组 */
  messages: Message[]
  /** 工具执行上下文 */
  toolUseContext: ToolUseContext
  /** 自动压缩追踪状态 */
  autoCompactTracking: AutoCompactTrackingState | undefined
  /** max_output_tokens 恢复计数 */
  maxOutputTokensRecoveryCount: number
  /** 是否已尝试过 reactive compact */
  hasAttemptedReactiveCompact: boolean
  /** 输出 token 上限覆盖 */
  maxOutputTokensOverride: number | undefined
  /** 待处理的工具使用摘要 Promise */
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  /** stop hook 是否激活 */
  stopHookActive: boolean | undefined
  /** 当前轮次计数 */
  turnCount: number
  /** 上一次迭代继续的原因，首次迭代为 undefined */
  transition: Continue | undefined
}
