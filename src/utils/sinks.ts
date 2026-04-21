/**
 * 日志接收器初始化
 *
 * 源码复刻: claude-code/src/utils/sinks.ts
 *
 * Attach error log and analytics sinks, draining any events queued before
 * attachment. Both inits are idempotent. Called from setup() for the default
 * command; other entrypoints (subcommands, daemon, bridge) call this directly
 * since they bypass setup().
 */

import { initializeErrorLogSink } from './errorLogSink.js'

export function initSinks(): void {
  initializeErrorLogSink()
  // TODO: initializeAnalyticsSink()
}
