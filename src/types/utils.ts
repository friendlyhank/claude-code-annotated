/**
 * Utility type definitions.
 * 
 * 对齐上游实现：按 claude-code/src/types/utils.ts 原样复刻
 * 设计原因：通用工具类型，可在整个项目中复用
 */

/**
 * Deep immutable type - marks all nested properties as readonly.
 * 
 * 对齐上游实现：当前为 stub（`type DeepImmutable<T> = T`），与源码一致
 * 使用场景（参考源码）：
 * - AppState 状态定义（src/state/AppStateStore.ts）
 * - ToolPermissionContext 权限上下文（src/Tool.ts）
 * - SDK 消息类型（src/utils/messages.ts）
 * 
 * 设计原因：
 * 1. 深度不可变类型，所有嵌套属性都是 readonly
 * 2. 当前 stub 实现满足类型检查，实际运行时不强制不可变
 * 3. 完整实现需要递归映射类型，但源码当前保持简单 stub
 */
export type DeepImmutable<T> = T;

/**
 * Permutations type - represents an array of all possible type permutations.
 * 
 * 对齐上游实现：当前为 stub（`type Permutations<T> = T[]`），与源码一致
 * 使用场景（参考源码）：
 * - messageQueueManager.ts 中的 PromptInputMode 排列验证
 * 
 * 设计原因：
 * 1. 用于类型层面的排列组合验证
 * 2. 当前 stub 实现为简单数组类型
 * 3. 完整实现可生成联合类型的所有排列组合
 */
export type Permutations<T> = T[];
