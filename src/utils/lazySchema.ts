/**
 * 延迟 Schema 工厂
 *
 * 设计原因：延迟 Zod schema 构建从模块初始化时间到首次访问 把"立即执行"变成"用的时候再执行，且只执行一次"
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
