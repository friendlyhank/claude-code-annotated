/**
 * Global declarations for compile-time macros and internal-only identifiers
 * that are eliminated via Bun's MACRO/bundle feature system.
 * 
 * 对齐上游实现：按 claude-code/src/types/global.d.ts 原样复刻
 * 设计原因：
 * 1. MACRO 命名空间用于构建时常量注入，零运行时开销
 * 2. 内部标识符在开源版本中被 dead-code eliminated
 */

// ============================================================================
// MACRO — Bun compile-time constants injected via bunfig.toml [define] (dev)
// and Bun.build({ define }) (production). See bunfig.toml & build.ts.
// 对齐上游实现：MACRO 命名空间结构与源码一致
declare namespace MACRO {
  export const VERSION: string
  export const BUILD_TIME: string
  export const FEEDBACK_CHANNEL: string
  export const ISSUES_EXPLAINER: string
  export const NATIVE_PACKAGE_URL: string
  export const PACKAGE_URL: string
  export const VERSION_CHANGELOG: string
}

// ============================================================================
// Internal Anthropic-only identifiers (dead-code eliminated in open-source)
// These are referenced inside `MACRO(() => ...)` or `false && ...` blocks.
// 对齐上游实现：保留所有内部标识符声明，确保类型检查通过
// 设计原因：这些声明在开源构建中会被 tree-shaking 移除

// Model resolution (internal)
declare function resolveAntModel(model: string): import('../utils/model/antModels.js').AntModel | undefined
declare function getAntModels(): import('../utils/model/antModels.js').AntModel[]
declare function getAntModelOverrideConfig(): {
  defaultSystemPromptSuffix?: string
  [key: string]: unknown
} | null

// Companion/buddy observer (internal)
declare function fireCompanionObserver(
  messages: unknown[],
  callback: (reaction: unknown) => void,
): void

// Metrics (internal)
type ApiMetricEntry = { ttftMs: number; firstTokenTime: number; lastTokenTime: number; responseLengthBaseline: number; endResponseLength: number }
declare const apiMetricsRef: React.RefObject<ApiMetricEntry[]> | null
declare function computeTtftText(metrics: ApiMetricEntry[]): string

// Gate/feature system (internal)
declare const Gates: Record<string, boolean>
declare function GateOverridesWarning(): JSX.Element | null
declare function ExperimentEnrollmentNotice(): JSX.Element | null

// Hook timing threshold (re-exported from services/tools/toolExecution.ts)
declare const HOOK_TIMING_DISPLAY_THRESHOLD_MS: number

// Ultraplan (internal)
declare function UltraplanChoiceDialog(props: Record<string, unknown>): JSX.Element | null
declare function UltraplanLaunchDialog(props: Record<string, unknown>): JSX.Element | null
declare function launchUltraplan(...args: unknown[]): Promise<string>

// T — Generic type parameter leaked from React compiler output
// (react/compiler-runtime emits compiled JSX that loses generic type params)
declare type T = unknown

// Tungsten (internal)
declare function TungstenPill(props?: { key?: string; selected?: boolean }): JSX.Element | null

// ============================================================================
// Build-time constants BUILD_TARGET/BUILD_ENV/INTERFACE_TYPE — removed (zero runtime usage)

// ============================================================================
// Ink custom JSX intrinsic elements — see src/types/ink-jsx.d.ts
// TODO: 已阅读源码，但 ink-jsx.d.ts 不在今日最小闭环内

// ============================================================================
// Bun text/file loaders — allow importing non-TS assets as strings
// 对齐上游实现：支持 .md/.txt/.html/.css 作为字符串导入
// 设计原因：允许导入文档文件用于系统提示等场景
declare module '*.md' {
  const content: string
  export default content
}
declare module '*.txt' {
  const content: string
  export default content
}
declare module '*.html' {
  const content: string
  export default content
}
declare module '*.css' {
  const content: string
  export default content
}
