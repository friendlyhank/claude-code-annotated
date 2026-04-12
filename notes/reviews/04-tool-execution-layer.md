# 04. 工具编排与执行存根

## 概述

这一层负责接住模型返回的 `tool_use`，并把它们转换成下一轮可消费的 `tool_result`。当前实现已经具备完整的编排骨架，但单工具真实执行仍是存根。

它的核心价值不是“已经会执行很多工具”，而是“已经把工具系统的边界搭清楚了”。

## 关键源码

- `src/Tool.ts`
- `src/services/tools/toolOrchestration.ts`
- `src/services/tools/toolExecution.ts`
- `src/utils/generators.ts`

## 设计原理

### 1. 类型边界先行

`src/Tool.ts` 先定义了：

- `Tool`
- `Tools`
- `ToolUseContext`
- `findToolByName()`

也就是说，工具系统当前优先稳定的是“工具长什么样、上下文如何共享”，而不是先急着堆实现。

### 2. 编排层与执行层分离

- `toolOrchestration.ts` 负责切批、串并行调度、上下文合并
- `toolExecution.ts` 负责单个 `tool_use` 的校验和结果生成

这让后续真实工具执行可以直接往 `runToolUse()` 深挖，而不需要重写批次调度逻辑。

### 3. 并发安全优先于吞吐

是否并发执行，不由调用方拍脑袋决定，而由工具自己的 `isConcurrencySafe()` 决定。若工具缺失、schema 校验失败或判断抛错，统一保守降级为串行。

## 主流程

```mermaid
flowchart TD
    A[assistant message 中的 tool_use] --> B[partitionToolCalls]
    B --> C{是否可并发}
    C -->|否| D[runToolsSerially]
    C -->|是| E[runToolsConcurrently]
    D --> F[runToolUse]
    E --> F
    F --> G[生成 tool_result]
    G --> H[回放 contextModifier 或保持当前上下文]
    H --> I[返回给 query loop]
```

## 实现原理

### 1. `partitionToolCalls()`

这一阶段做两件事：

1. 用 `findToolByName()` 找到工具定义
2. 用 `inputSchema.safeParse()` 校验输入

只有在工具存在、输入合法且 `isConcurrencySafe()` 返回真时，才会把相邻调用合并进并发批次。

### 2. 串行批次

串行模式强调“前一个工具的上下文更新，后一个工具马上可见”。因此：

- 每个工具执行前会把自己的 ID 加入 in-progress 集合
- `runToolUse()` 产出的 `contextModifier` 会立即写回当前上下文
- 工具结束后马上移除 in-progress 标记

这是最保守、最容易保证确定性的执行方式。

### 3. 并发批次

并发模式强调“结果顺序可重现，而不是谁先结束谁先生效”。因此：

- 多个工具会受 `getMaxToolUseConcurrency()` 限流并发
- 并发阶段先把 `message` 向上透传
- `contextModifier` 不立即落到共享上下文
- 等整批完成后，再按原始 `tool_use` 顺序回放 modifier

这避免了上下文结果被“完成时序”污染。

## 单工具执行现状

`runToolUse()` 当前只覆盖三种路径：

1. 工具不存在：返回错误型 `tool_result`
2. 输入校验失败：返回错误型 `tool_result`
3. 工具存在且校验通过：返回“已调度但未真正执行”的错误型 `tool_result`

也就是说，当前工具层已经能维持 query loop 的协议闭环，但还不能产生真实业务结果。

## 伪代码

```text
1. 从 assistant 消息中收集 tool_use
2. 按工具并发安全性切分批次
3. 对串行批次逐个执行并立即提交上下文更新
4. 对并发批次并发运行并缓存上下文修改
5. 每个 tool_use 进入 runToolUse 做查找和校验
6. 生成 tool_result 消息返回给 query loop
7. 工具结果被拼回 messages 进入下一轮
```

## 关键数据结构

| 结构 | 位置 | 作用 |
| --- | --- | --- |
| `Tool` | `src/Tool.ts` | 定义工具名、输入 schema、并发能力、调用接口 |
| `ToolUseContext` | `src/Tool.ts` | 承载工具列表、中断控制器、消息和会话 setter |
| `MessageUpdate` | `toolOrchestration.ts` | 编排层向查询层返回消息与新上下文 |
| `ContextModifier` | `toolExecution.ts` | 延迟提交的上下文修改描述 |

## 设计取舍

### 优点

- 工具系统边界已经稳定
- 串行与并发语义区分清楚
- 上下文回放顺序明确，方便后续补真实执行

### 代价

- 真实工具还没落地，当前只能证明主回合协议能继续
- `_canUseTool` 目前没有真正参与权限决策
- 很多 UI / progress / hook 相关能力还只是类型占位

## 关键判断

当前最重要的事实不是“工具会不会执行”，而是：

- `tool_use` 已经能被识别
- 工具调度已经能区分串行和并发
- `tool_result` 已经能被拼回 query loop

因此后续只要补足 `runToolUse()` 内部真实调用，整个工具能力就能在现有骨架上自然加深。

## 小结

工具层现在处于“框架已成，执行未满”的阶段。它已经证明了：

- 查询层和工具层的协议是通的
- 工具上下文怎样共享和更新是明确的
- 并发执行的确定性问题已经提前被设计进来

这让它成为后续继续复刻真实工具能力的天然落点。

## 组合使用

- 和 `03-query-engine-layer.md` 组合，能看清 query loop 为什么会继续下一轮
- 和 `06-session-management-layer.md` 组合，能看清 `ToolUseContext` 为什么是共享状态中心
- 和 `07-tui-rendering-layer.md` 组合，能看清 in-progress 标记未来如何驱动 UI 状态
