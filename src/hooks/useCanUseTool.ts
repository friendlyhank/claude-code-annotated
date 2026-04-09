// 对齐上游实现：权限检查函数类型先保留为最小签名，
// 具体入参与返回结构待权限系统复刻时再收窄。
export type CanUseToolFn = (...args: unknown[]) => boolean | Promise<boolean>
