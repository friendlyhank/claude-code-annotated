/**
 * 延迟 Schema 工厂
 *
 * 对齐上游实现：按 claude-code/src/utils/lazySchema.ts 原样复刻
 * 设计原因：延迟 Zod schema 构建从模块初始化时间到首次访问
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
