// ============================================================================
// deps.ts
// ============================================================================
// 查询依赖类型定义

import { randomUUID } from 'crypto'
import { queryModelWithStreaming } from '../services/api/claude.js'

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
  callModel: typeof queryModelWithStreaming

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
    callModel: queryModelWithStreaming,
    // microcompact: microcompactMessages,
    // autocompact: autoCompactIfNeeded,
    uuid: randomUUID,
  }
}
