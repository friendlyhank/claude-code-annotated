import { randomUUID } from 'crypto'
import type { Message } from '../types/message.js'

// TODO: 已阅读源码，但不在今日最小闭环内
// import { queryModelWithStreaming } from '../services/api/claude.js'
// import { autoCompactIfNeeded } from '../services/compact/autoCompact.js'
// import { microcompactMessages } from '../services/compact/microCompact.js'

// ============================================================================
// QueryDeps type
// 对齐上游实现：按 claude-code/src/query/deps.ts 原样复刻

// I/O dependencies for query(). Passing a `deps` override into QueryParams
// lets tests inject fakes directly instead of spyOn-per-module — the most
// common mocks (callModel, autocompact) are each spied in 6-8 test files
// today with module-import-and-spy boilerplate.
//
// Using `typeof fn` keeps signatures in sync with the real implementations
// automatically. This file imports the real functions for both typing and
// the production factory — tests that import this file for typing are
// already importing query.ts (which imports everything), so there's no
// new module-graph cost.
//
// Scope is intentionally narrow (4 deps) to prove the pattern. Followup
// PRs can add runTools, handleStopHooks, logEvent, queue ops, etc.
export type QueryDeps = {
  // -- model
  // TODO: 已阅读源码，但不在今日最小闭环内
  // 待 services/api/claude.ts 实现后使用 typeof queryModelWithStreaming
  // callModel: typeof queryModelWithStreaming
  
  /**
   * 调用 LLM API 的函数
   * 
   * 对齐上游实现：使用 typeof queryModelWithStreaming
   * 当前为 stub 类型，待 services/api/claude.ts 完成后替换
   */
  callModel: (params: {
    messages: Message[]
    [key: string]: unknown
  }) => AsyncGenerator<unknown>

  // -- compaction
  // TODO: 已阅读源码，但不在今日最小闭环内
  // microcompact: typeof microcompactMessages
  // autocompact: typeof autoCompactIfNeeded

  // -- platform
  uuid: () => string
}

// ============================================================================
// productionDeps factory
// 对齐上游实现：按 claude-code/src/query/deps.ts 原样复刻
// 生产环境依赖工厂函数
export function productionDeps(): QueryDeps {
  return {
    // TODO: 已阅读源码，但不在今日最小闭环内，后续补齐真实实现
    // callModel: queryModelWithStreaming,
    // microcompact: microcompactMessages,
    // autocompact: autoCompactIfNeeded,
    
    // 对齐上游实现：当前使用 mock 实现，仅用于类型检查
    // 真实实现将在 services/api/claude.ts 完成后替换
    callModel: async function* mockCallModel(params): AsyncGenerator<unknown> {
      const lastUserMessage = [...params.messages]
        .reverse()
        .find(message => message.type === 'user')
      const userText =
        typeof lastUserMessage?.message?.content === 'string'
          ? lastUserMessage.message.content
          : 'Mock response - awaiting real implementation'

      // 当前仍是 API stub，但显式读取 messages，便于验证 REPL -> query() 已真正接通。
      yield {
        type: 'assistant',
        uuid: randomUUID(),
        timestamp: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `Mock response from query loop:\n${userText}`,
            },
          ],
        },
      }
    },
    uuid: randomUUID,
  }
}
