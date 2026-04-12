- 最新已处理提交：`9d8ef75a821700824c283f46775bad2235b7052c`

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
 - `src/screens/REPL.tsx` 负责输入采集、消息回写和最小 `query()` 接线
 - 交互层当前只覆盖最小闭环，print/setup/agent 等上游分支仍未落地

3. 查询引擎与回合推进
 - 文档：`notes/reviews/03-query-engine-layer.md`
 - `query()` / `queryLoop()` 是系统核心生成器边界
 - `State` 负责跨轮次保存消息历史、工具上下文、终止条件和恢复标记
 - 每轮固定执行“准备请求 → 调模型 → 检测 `tool_use` → 执行工具 → 进入下一轮或终止”
 - 当前已落地主回合骨架，压缩、budget、stop hooks 等增强能力仍为 TODO

4. 工具编排与执行存根
 - 文档：`notes/reviews/04-tool-execution-layer.md`
 - `Tool` / `Tools` / `ToolUseContext` 提供统一工具边界
 - `toolOrchestration.ts` 负责按并发安全性切批、限流执行和上下文回放
 - `toolExecution.ts` 负责单个 `tool_use` 的工具查找、schema 校验与 `tool_result` 生成
 - 当前真实工具调用仍未落地，工具层以“可调度但未执行”的存根结果闭环

5. 模型调用与 Anthropic API 适配
 - 文档：`notes/reviews/05-api-client-layer.md`
 - `src/query/deps.ts` 用 `QueryDeps` 把查询层与外部 I/O 解耦
 - `src/services/api/claude.ts` 负责消息归一化、Anthropic 调用和 assistant 消息回填
 - `src/services/api/client.ts` 负责 API key 读取、客户端缓存和超时配置
 - 当前只覆盖最小 `messages.create()` 路径，streaming / retry / 多 provider 尚未复刻

6. 会话状态与消息类型
 - 文档：`notes/reviews/06-session-management-layer.md`
 - `src/bootstrap/state.ts` 保存进程级交互态、cwd 和 session source
 - `src/types/message.ts` 是 transcript、流事件和工具结果的统一消息模型
 - `ToolUseContext` 承载查询层与工具层共享的会话级可变状态
 - 当前 React 全局 AppState 尚未接入，状态主要分散在进程态、查询态与 REPL 本地态

7. TUI 渲染与终端运行时
 - 文档：`notes/reviews/07-tui-rendering-layer.md`
 - `src/ink.ts` 封装 Ink root/render API
 - `src/interactiveHelpers.tsx` 负责渲染运行、退出和消息式错误收尾
 - `src/components/App.tsx` 提供未来全局 Provider 的挂载位
 - 当前 TUI 已能支撑最小 REPL，会话指标、对话框与复杂 UI 基础设施仍待补齐
