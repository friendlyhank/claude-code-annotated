/**
 * 日志接收器初始化
 *
 *
 * Attach error log and analytics sinks, draining any events queued before
 * attachment. Both inits are idempotent. Called from setup() for the default
 * command; other entrypoints (subcommands, daemon, bridge) call this directly
 * since they bypass setup().
 */

import { initializeErrorLogSink } from './errorLogSink.js'

// 初始化日志接收器
export function initSinks(): void {
  initializeErrorLogSink()
  // TODO: initializeAnalyticsSink()
}
