// ============================================================================
// json.ts
// ============================================================================
// JSON 解析工具函数
//
// 对齐上游实现：按 claude-code/src/utils/json.ts 原样复刻

/**
 * 安全解析 JSON
 * 对齐上游实现：按 claude-code/src/utils/json.ts:46-60 safeParseJSON
 * @param json - JSON 字符串
 * @returns 解析结果，失败返回 null
 */
export function safeParseJSON(json: string | null | undefined): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}
