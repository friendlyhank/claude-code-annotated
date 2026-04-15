- 最新已处理提交：`a34de8aa6f1b3986fae2d57ce6a91da106ccf08c`

1. 架构设计和核心流程
 - 文档：`notes/reviews/01-architecture-and-core-flow.md`
 - 启动主链路按 `src/entrypoints/cli.tsx` → `src/main.tsx` → `src/replLauncher.tsx` → `src/screens/REPL.tsx` → `src/query.ts` 展开
 - 运行时稳定分层为入口装配、交互层、查询引擎、工具编排、模型适配、状态承载、TUI 运行时
 - 主回合以 `Message[]`、`ToolUseContext`、`bootstrap/state.ts` 为三条状态主线
 - 阅读顺序先看 `overview.md`，再看架构页，最后按能力域下钻

2. CLI 入口与 REPL 交互
 - 文档：`notes/reviews/02-core-interaction-layer.md`
 - `src/entrypoints/cli.tsx` 负责快速路径和主模块动态导入
 - `src/main.tsx` 用 Commander 定义命令、参数和交互会话启动动作
- `src/utils/handlePromptSubmit.ts` 把输入清空、`QueuedCommand -> UserMessage` 转换、处理中提示和查询前校验收口到 `handlePromptSubmit -> executeUserInput`
- `src/screens/REPL.tsx` 负责输入采集、消息回写，并通过 `handlePromptSubmit -> executeUserInput -> onQuery -> onQueryImpl -> onQueryEvent` 的提交编排后再接入 `query()`
 - 交互层当前只覆盖最小闭环，print/setup/agent 等上游分支仍未落地

3. 查询引擎、回合推进与流式事件处理
 - 文档：`notes/reviews/03-query-engine-layer.md`
 - `query()` / `queryLoop()` 是系统核心生成器边界
 - `State` 负责跨轮次保存消息历史、工具上下文、终止条件和恢复标记
 - 每轮固定执行"准备请求 → 调模型 → 检测 `tool_use` → 执行工具 → 进入下一轮或终止"
 - `src/utils/messages.ts` 的 `handleMessageFromStream()` 统一消费流式事件，覆盖 `stream_request_start`、`content_block_start/delta`、`message_delta/stop` 全部分支
 - 流式状态桥接：`onMessage`、`onUpdateLength`、`onSetStreamMode`、`onStreamingToolUses`、`onStreamingThinking`、`onApiMetrics`、`onStreamingText` 回调把事件映射到 REPL 状态
 - 当前已落地主回合骨架与流式事件处理，压缩、budget、stop hooks 等增强能力仍为 TODO

4. 工具编排与执行框架
 - 文档：`notes/reviews/04-tool-execution-layer.md`
 - `Tool` / `ToolDef` / `Tools` / `ToolUseContext` 提供统一工具边界与工厂模式
 - `buildTool()` 工厂函数 + `TOOL_DEFAULTS` 统一工具创建流程，填充安全默认值（fail-closed 原则）
 - `CanUseToolFn` / `ValidationResult` / `ToolResult<T>` 定义完整的调用→验证→权限→结果链路
 - `toolOrchestration.ts` 负责按并发安全性切批、限流执行和上下文回放
 - `toolExecution.ts` 负责单个 `tool_use` 的工具查找、schema 校验与 `tool_result` 生成
 - Tool 接口已落地完整定义（call/checkPermissions/validateInput/渲染方法等），真实工具实例仍待实现

5. 模型调用与 Anthropic API 适配
 - 文档：`notes/reviews/05-api-client-layer.md`
 - `src/query/deps.ts` 用 `QueryDeps` 把查询层与外部 I/O 解耦
 - `src/services/api/claude.ts` 负责消息归一化、流式事件处理和 assistant 消息回填
 - `src/services/api/client.ts` 负责 API key 读取、客户端缓存和超时配置
 - 流式事件处理（message_start、content_block_*、message_delta）已落地，支持双产出机制（StreamEvent + AssistantMessage）
 - 当前 retry / 多 provider 尚未复刻

6. 会话状态与消息类型
 - 文档：`notes/reviews/06-session-management-layer.md`
 - `src/bootstrap/state.ts` 保存进程级交互态、cwd 和 session source
 - `src/types/message.ts` 是 transcript、流事件和工具结果的统一消息模型
 - `ToolUseContext` 承载查询层与工具层共享的会话级可变状态
- `messagesRef` 作为 REPL 提交编排层的最新 transcript 快照，补齐了异步查询消费前的本地状态桥接
- `userInputOnProcessing` 与 `abortController` 把界面反馈和 `query()` 中断控制接到同一轮提交生命周期里
- 当前 React 全局 AppState 尚未接入，状态主要分散在进程态、查询态与 REPL 本地态

7. TUI 渲染与终端运行时
 - 文档：`notes/reviews/07-tui-rendering-layer.md`
 - `src/ink.ts` 封装 Ink root/render API
 - `src/interactiveHelpers.tsx` 负责渲染运行、退出和消息式错误收尾
 - `src/components/App.tsx` 提供未来全局 Provider 的挂载位
 - `REPL.tsx` 当前由 `handlePromptSubmit/executeUserInput`、`onQueryEvent`、`onQueryImpl` 分别驱动处理中提示、消息回写与 terminal reason 展示
 - REPL 流式状态管理：`streamMode`、`streamingText`、`streamingThinking`、`streamingToolUses`、`responseLength`、`lastTTFTMs` 提供细粒度反馈
 - ESC 退出前会优先触发共享 `AbortController`，让终端交互和查询中断保持同一退出语义
 - 当前 TUI 已能支撑最小 REPL，会话指标、对话框与复杂 UI 基础设施仍待补齐

8. 权限类型与决策体系
 - 文档：`notes/reviews/08-permission-system.md`
 - `src/types/permissions.ts` 独立权限类型定义，与实现分离以避免循环依赖
 - 权限模式：5 种外部模式（acceptEdits/bypassPermissions/default/dontAsk/plan）+ 2 种内部模式（auto/bubble）
 - 权限决策三态 + passthrough：`PermissionDecision<Allow/Ask/Deny>` + `PermissionResult` 含 passthrough 透传
 - `PermissionDecisionReason` 覆盖 rule/mode/hook/classifier/safetyCheck 等 10 种决策溯源
 - `ToolPermissionContext` 承载权限检查所需完整上下文（模式、规则、目录、标志位）
 - `PermissionUpdate` 支持规则增删替换、模式设置、目录增删 6 种操作
 - 当前仅落地类型定义，权限运行时逻辑（src/utils/permissions/）仍待复刻
