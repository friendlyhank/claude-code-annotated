/**
 * FileReadTool 读取限制配置
 *
 * 对齐上游实现：按 claude-code/src/tools/FileReadTool/limits.ts 原样复刻
 *
 * 两个上限：
 *   | limit         | default | checks                    | cost          | on overflow     |
 *   |---------------|---------|---------------------------|---------------|-----------------|
 *   | maxSizeBytes  | 256 KB  | TOTAL FILE SIZE (not out) | 1 stat        | throws pre-read |
 *   | maxTokens     | 25000   | actual output tokens      | API roundtrip | throws post-read|
 */

import { MAX_OUTPUT_SIZE } from '../../utils/file.js'

export const DEFAULT_MAX_OUTPUT_TOKENS = 25000

/**
 * 环境变量覆盖最大输出 token 数
 * 未设置或无效时返回 undefined，由调用方回退到下一优先级
 */
function getEnvMaxTokens(): number | undefined {
  const override = process.env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS
  if (override) {
    const parsed = parseInt(override, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return undefined
}

// 读取限制配置
export type FileReadingLimits = {
  maxTokens: number // 最大输出 token 数
  maxSizeBytes: number // 最大文件大小
  includeMaxSizeInPrompt?: boolean // 是否在提示词中包含最大文件大小
  targetedRangeNudge?: boolean // 是否使用目标范围提示
}

/**
 * 默认读取限制
 *
 * 对齐上游实现：按源码 getDefaultFileReadingLimits 原样复刻
 * maxTokens 优先级：环境变量 > DEFAULT_MAX_OUTPUT_TOKENS
 * TODO: GrowthBook 实验覆盖待 analytics 实现后补齐
 *
 * 防御性设计：每个字段单独校验，无效值回退到硬编码默认值
 */
// TODO: 待 analytics/growthbook 实现后，使用 memoize 包裹并读取特性标志
export function getDefaultFileReadingLimits(): FileReadingLimits {
  const maxSizeBytes = MAX_OUTPUT_SIZE

  const envMaxTokens = getEnvMaxTokens()
  const maxTokens = envMaxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS

  return {
    maxSizeBytes,
    maxTokens,
  }
}
