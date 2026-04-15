/**
 * 环境变量工具函数
 *
 * 对齐上游实现：按 claude-code/src/utils/envUtils.ts 原样复刻
 * 设计原因：集中管理环境变量读取和判断逻辑
 */

/**
 * 判断环境变量值是否为真
 * 对齐上游实现：按源码 isEnvTruthy 原样复刻
 * 真值：'1', 'true', 'yes', 'on'（不区分大小写）
 */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

/**
 * 判断环境变量是否定义为假值
 * 对齐上游实现：按源码 isEnvDefinedFalsy 原样复刻
 */
export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalizedValue = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalizedValue)
}

/**
 * 判断是否有嵌入式搜索工具
 * 对齐上游实现：按 utils/embeddedTools.ts hasEmbeddedSearchTools 原样复刻
 * 设计原因：ant-native 构建中 bfs/ugrep 嵌入 bun 二进制时，不需要独立的 Glob/Grep 工具
 */
export function hasEmbeddedSearchTools(): boolean {
  if (!isEnvTruthy(process.env.EMBEDDED_SEARCH_TOOLS)) return false
  const e = process.env.CLAUDE_CODE_ENTRYPOINT
  return (
    e !== 'sdk-ts' && e !== 'sdk-py' && e !== 'sdk-cli' && e !== 'local-agent'
  )
}
