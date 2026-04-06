/**
 * Claude Code Annotated - 全局状态管理
 *
 * 源码复刻参考: claude-code/src/bootstrap/state.ts
 *
 * 设计原则:
 * - 全局状态集中管理，避免分散
 * - 简单的 getter/setter 模式
 * - 支持测试时重置状态
 */

// ========================================
// 状态类型定义
// ========================================

type State = {
  originalCwd: string
  cwd: string
  isInteractive: boolean
  clientType: string
  sessionSource: string | undefined
  startTime: number
}

// ========================================
// 初始状态
// ========================================

function getInitialState(): State {
  const resolvedCwd =
    typeof process !== 'undefined' && typeof process.cwd === 'function'
      ? process.cwd()
      : ''

  return {
    originalCwd: resolvedCwd,
    cwd: resolvedCwd,
    isInteractive: false,
    clientType: 'cli',
    sessionSource: undefined,
    startTime: Date.now(),
  }
}

// ========================================
// 全局状态实例
// ========================================

const STATE: State = getInitialState()

// ========================================
// 交互模式
// ========================================

export function getIsNonInteractiveSession(): boolean {
  return !STATE.isInteractive
}

export function getIsInteractive(): boolean {
  return STATE.isInteractive
}

export function setIsInteractive(value: boolean): void {
  STATE.isInteractive = value
}

// ========================================
// 客户端类型
// ========================================

export function getClientType(): string {
  return STATE.clientType
}

export function setClientType(type: string): void {
  STATE.clientType = type
}

// ========================================
// 工作目录
// ========================================

export function getOriginalCwd(): string {
  return STATE.originalCwd
}

export function setOriginalCwd(cwd: string): void {
  STATE.originalCwd = cwd.normalize('NFC')
}

export function getCwdState(): string {
  return STATE.cwd
}

export function setCwdState(cwd: string): void {
  STATE.cwd = cwd.normalize('NFC')
}

// ========================================
// 会话源
// ========================================

export function getSessionSource(): string | undefined {
  return STATE.sessionSource
}

export function setSessionSource(source: string | undefined): void {
  STATE.sessionSource = source
}

// ========================================
// 时间统计
// ========================================

export function getTotalDuration(): number {
  return Date.now() - STATE.startTime
}

// ========================================
// 测试支持
// ========================================

/**
 * 仅用于测试：重置状态到初始值
 */
export function resetStateForTests_ONLY(): void {
  const newState = getInitialState()
  Object.assign(STATE, newState)
}
