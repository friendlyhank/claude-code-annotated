/**
 * 语义数字预处理
 *
 * 对齐上游实现：按 claude-code/src/utils/semanticNumber.ts 原样复刻
 * 设计原因：工具输入中模型可能将数字写成字符串（如 "30"），
 * z.number() 会拒绝，z.coerce.number() 会把空字符串也转成 0。
 * 此函数只接受合法十进制数字字符串的隐式转换，其余保持原值交由内部 schema 校验。
 */

import { z } from 'zod/v4'

export function semanticNumber<T extends z.ZodType>(
  inner: T = z.number() as unknown as T,
) {
  return z.preprocess((v: unknown) => {
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
    return v
  }, inner)
}
