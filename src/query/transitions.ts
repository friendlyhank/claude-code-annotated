/**
 * Transition types for query loop.
 * 
 * 对齐上游实现：按 claude-code/src/query/transitions.ts 原样复刻
 * 设计原因：
 * 1. Continue 标识循环继续的原因，用于测试断言
 * 2. Terminal 标识循环终止的结果
 */

// TODO: 当前为 stub 实现，待完善循环逻辑后补充完整类型定义
// 对齐上游实现：源码中当前也是 any 类型存根
export type Terminal = any
export type Continue = any
