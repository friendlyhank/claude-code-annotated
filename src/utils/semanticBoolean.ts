/**
 * semanticBoolean - 语义化布尔值预处理
 *
 * 设计原因：
 * - LLM 输出的布尔值可能是字符串 "true"/"false" 而非原生布尔
 * - 通过 z.preprocess 在解析前统一类型，确保 schema 输入端宽松、输出端严格
 * - 与 lazySchema 配合使用，解决 z.preprocess 不支持 z.lazy 的问题
 */

import { z } from 'zod/v4'

/**
 * 将可能为字符串的布尔值预处理为真正的布尔值
 * 对齐上游实现：接受 true/false/"true"/"false" 等多种输入形式
 */
export function semanticBoolean<T extends z.ZodType<boolean>>(
  schema: T,
): z.ZodType<z.output<T>, z.input<typeof schema>> {
  return z.preprocess(val => {
    // 已经是布尔值，直接返回
    if (typeof val === 'boolean') {
      return val
    }
    // 字符串 "true"/"false" 转换为布尔值
    if (typeof val === 'string') {
      const lower = val.toLowerCase()
      if (lower === 'true') return true
      if (lower === 'false') return false
    }
    // 其他情况返回原值，让后续 schema 验证处理
    return val
  }, schema) as z.ZodType<z.output<T>, z.input<typeof schema>>
}
