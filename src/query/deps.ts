/**
 * Query dependencies - dependency injection interface for testing.
 * 
 * 对齐上游实现：按 claude-code/src/query/deps.ts 原样复刻
 * 设计原因：
 * 1. 依赖注入使 query 函数可测试，可替换实现
 * 2. productionDeps 提供生产环境实现
 * 3. 测试时可以注入 mock 实现，避免模块导入样板代码
 * 4. 使用 `typeof fn` 保持签名与实际实现自动同步
 */

import { randomUUID } from 'crypto'
import type { Terminal, Continue } from './transitions.js'

// Re-export transition types
export type { Terminal, Continue } from './transitions.js'

// ============================================================================
// QueryDeps type
// 对齐上游实现：依赖注入接口

/**
 * 查询依赖接口 - 用于依赖注入和测试隔离
 * 
 * 对齐上游实现：按 claude-code/src/query/deps.ts:19-30 原样复刻
 * 设计原因：
 * 1. 集中管理 query 函数的外部依赖
 * 2. 使用 `typeof fn` 保持签名与实际实现自动同步
 * 3. 范围有意保持狭窄（4 个依赖），后续 PR 可扩展
 * 
 * 依赖列表：
 * - callModel: 调用 LLM API
 * - microcompact: 微压缩消息
 * - autocompact: 自动压缩
 * - uuid: 生成唯一标识符
 */
export type QueryDeps = {
  // -- model
  // TODO: 已阅读源码，但不在今日最小闭环内
  // callModel: typeof queryModelWithStreaming

  // -- compaction
  // TODO: 已阅读源码，但不在今日最小闭环内
  // microcompact: typeof microcompactMessages
  // autocompact: typeof autoCompactIfNeeded

  // -- platform
  uuid: () => string
}

// ============================================================================
// productionDeps
// 对齐上游实现：生产环境依赖实现

/**
 * 生产环境依赖实现
 * 
 * 对齐上游实现：按 claude-code/src/query/deps.ts:33-40 原样复刻
 * 设计原因：提供默认依赖实现，测试时可注入 mock
 * 
 * 注意：此文件导入实际函数用于类型和生产实现
 * 测试文件导入此文件获取类型时，已隐式导入 query.ts 的全部依赖
 * 因此没有额外的模块图开销
 */
export function productionDeps(): QueryDeps {
  return {
    // TODO: 已阅读源码，但不在今日最小闭环内，后续补齐
    // callModel: queryModelWithStreaming,
    // microcompact: microcompactMessages,
    // autocompact: autoCompactIfNeeded,
    uuid: randomUUID,
  }
}