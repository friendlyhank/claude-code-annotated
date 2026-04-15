# 进度面板

> 最后更新：2026-04-15

## 总体进度

| 指标 | 值 |
|---|---:|
| 目标文件代码数 | 537,782 |
| 累计复刻目标文件代码数 | 2,790 |
| 覆盖率 | **0.52%** |

> 注：代码数使用 tokei 的 Code 列（排除注释和空行）

## 阶段进度

| 阶段 | 状态 | 完成度 |
|---|---|---:|
| 阶段 1：最小闭环 | `done` | 100% |
| 阶段 2：核心查询引擎 | `doing` | 11% |
| 阶段 3：工具系统 | `backlog` | 0% |
| 阶段 4：会话与状态管理 | `backlog` | 0% |
| 阶段 5：TUI 完善 | `backlog` | 0% |
| 阶段 6：扩展能力 | `backlog` | 0% |

## 当前任务

### 今日候选

| 任务 | 状态 | 优先级 |
|---|---|---|
| 工具注册机制（tools.ts） | `planned` | high |
| 权限检查逻辑 | `planned` | high |
| 第一个具体工具实现 | `backlog` | medium |

### 进行中

| 任务 | 开始时间 | 备注 |
|---|---|---|
| 工具注册机制 | 待开始 | 需先实现 tools.ts |

### 已完成

| 任务 | 完成时间 | 备注 |
|---|---|---|
| 项目结构初始化 | 2026-04-05 | package.json, tsconfig.json, CLI 入口, 构建脚本 |
| CLI 入口与参数解析 | 2026-04-06 | @commander-js/extra-typings, 快速路径, 核心选项 |
| 主命令模块框架 | 2026-04-06 | main() + run() 结构, preAction hook |
| 基础 REPL 循环 | 2026-04-06 | Ink 渲染, REPL 组件, 交互式输入 |
| 核心类型定义 | 2026-04-07 | Message, Tool, ID 类型体系 |
| query() 生成器函数框架 | 2026-04-07 | State 类型, query/queryLoop 框架 |
| queryLoop 核心流程 | 2026-04-08 | callModel 调用, 流式处理, tool_use 检测, 循环判断 |
| 工具执行编排最小闭环 | 2026-04-09 | runTools 接入 queryLoop，tool_use 不再停在 tools_pending |
| REPL 到代理循环最小接线 | 2026-04-10 | REPL 提交改为消费 query()，UI 不再停留在本地 setTimeout 占位响应 |
| 复刻规划文档初始化 | 2026-04-05 | 创建 notes 文档体系 |
| API 调用层流式化改造 | 2026-04-14 | queryModelWithStreaming 改为流式 AsyncGenerator，真实 API 响应验证通过 ✅ |
| 基础工具类（Tool.ts 核心框架） | 2026-04-15 | buildTool、ToolResult、ValidationResult、PermissionResult 类型完整 ✅ |

## 阻塞与风险

| 类型 | 描述 | 状态 |
|---|---|---|
| ~~验证条件~~ | ~~当前环境缺少 `ANTHROPIC_API_KEY`，真实 assistant 成功响应尚未留证~~ | ~~doing~~ → **已解除** |

> 2026-04-14：`ANTHROPIC_API_KEY` 已就绪，流式 API 真实响应验证通过

## 能力清单

### 已实现能力

- [x] CLI 启动
- [x] --version 快速路径（零模块加载）
- [x] 参数解析（@commander-js/extra-typings）
- [x] 核心选项定义
- [x] preAction hook 框架
- [x] 交互模式/非交互模式路由
- [x] REPL 交互基础框架
- [x] LLM 调用（流式 AsyncGenerator 已实现，真实 API 响应验证通过 ✅）
- [ ] 工具执行（已打通编排闭环，真实执行未完成）
- [ ] 会话管理
- [x] 工具类型系统（Tool 类型、buildTool、权限类型 ✅）

### 待实现能力

- [x] 复刻规划文档
- [x] 项目骨架
- [x] 入口文件 cli.tsx
- [x] 主命令模块 main.tsx
- [x] bootstrap/state.ts 全局状态
- [x] ink.ts 渲染封装
- [x] interactiveHelpers.tsx 交互辅助
- [x] replLauncher.tsx REPL 启动
- [x] App.tsx 顶层组件
- [x] REPL.tsx 主界面
- [x] 核心类型定义
- [x] API 调用层流式化
- [x] 基础工具类（Tool.ts）✅
- [ ] 工具注册机制 ← 下一步
- [ ] 工具权限检查

## 知识点记录

### 已掌握（已编码并验证）

- 项目整体结构
- 入口流程（cli.tsx → main.tsx → run()）
- 核心模块分布
- CLI 快速路径设计模式
- Bun.build ESM 打包配置
- @commander-js/extra-typings 链式 API
- 动态导入与代码分割
- preAction hook 初始化模式
- Side-effect imports 模式
- Ink 渲染框架（createRoot, render, useInput, useApp）
- React TUI 组件设计
- 全局状态管理模式
- 品牌类型模式（名义类型）
- 判别联合模式（discriminated union）
- Anthropic SDK 类型（ContentBlockParam, ContentBlock, BetaUsage）
- 全局声明文件（.d.ts）
- AsyncGenerator 模式（yield/return 区分流式输出和终止）
- 依赖注入模式（QueryDeps 接口）
- 状态集中管理模式（State 类型）
- 代理循环架构（query → queryLoop → State）
- 流式响应处理（for await 遍历 AsyncGenerator）
- tool_use 检测机制（content.type === 'tool_use'）
- 中断信号处理（AbortController.signal.aborted）
- ModelCallParams 类型设计
- 工具批次编排模式（并发安全分批、串行/并发执行切换）
- tool result 回灌主循环模式（runTools -> toolResults -> next_turn）
- REPL 提交路径接入 query() 模式（用户输入 -> query() -> 事件流回写 transcript）
- REPL 提交编排分层模式（onSubmit -> onQuery -> onQueryImpl -> onQueryEvent）
- REPL 提交处理器最小对齐模式（handlePromptSubmit -> executeUserInput -> onQuery）
- AbortController 端到端透传模式（提交层创建 -> query/toolUseContext 复用）
- 交互层最小 ToolUseContext 供给模式（先打通主链路，再补权限和状态细节）
- QueryDeps 生产依赖切换模式（query loop 只认 callModel 边界，不直接依赖 SDK）
- Anthropic SDK 最小接线模式（内部 Message -> SDK MessageParam[] -> AssistantMessage）
- 流式 API 调用模式（anthropic.beta.messages.create({ stream: true })）
- 流式事件处理模式（message_start, content_block_start/delta/stop, message_delta/stop）
- Usage 增量累加模式（MutableUsage 支持渐进更新）
- contentBlocks 状态累积模式（流式过程中逐步构建完整消息）
- TTFT 追踪模式（首 token 延迟计算）
- Tool 类型完整架构（30+ 方法签名）
- buildTool 工厂模式（统一默认行为，fail-closed 原则）
- 权限三态设计（PermissionResult: allow/deny/ask）
- 权限类型抽取模式（独立文件打破循环依赖）
- Zod schema 类型（AnyObject = z.ZodType<{ [key: string]: unknown }>）

### 已识别/已建模（仅阅读源码，未实现）

- 错误恢复机制（Fallback、Reactive Compact）
- QueryEngine 类结构
- 消息构建工具函数
- 消息预处理流程（compact, snip, microcompact）
- API 调用流程（上游 streaming/retry/client provider 细节）
- StreamingToolExecutor 流式工具执行
- stopHooks 停止钩子

### 待确认

- [ ] 具体的工具实现细节
- [ ] 消息格式与协议
- [ ] 状态管理机制细节
- [x] ~~真实 API 成功响应验证证据~~ → **2026-04-14 已验证**
- [ ] Compact 机制的完整实现

## 历史记录

| 日期 | 进度变化 | 备注 |
|---|---|---|
| 2026-04-15 | 0.42% → 0.52% | 基础工具类（Tool.ts 核心框架）：buildTool、ToolResult、ValidationResult、PermissionResult 类型完整；新增 `src/types/permissions.ts` |
| 2026-04-14 | 0.39% → 0.42% | API 调用层流式化改造：`services/api/claude.ts` 从非流式改为 AsyncGenerator，使用 `anthropic.beta.messages.create({ stream: true })`，yield StreamEvent |
| 2026-04-13 | 0.39% → 0.39% | 按源码事实复核并二次对齐：`handleMessageFromStream` 签名改为上游同形态，`onStreamingThinking` 回调协议改为函数式更新；tokei 复核 `messages.ts=209`、`REPL.tsx=400` |
| 2026-04-13 | 0.35% → 0.39% | 按上游 `handleMessageFromStream` 重改：新增 `src/utils/messages.ts`（Code=209），`REPL.tsx` 调整为统一事件消费链（Code=400） |
| 2026-04-13 | 0.34% → 0.35% | `REPL.tsx` 新增 StreamEvent 语义提示映射（`stream_request_start`/`stream_event` 关键分支），并经 tokei 复核 `Code=393` |
| 2026-04-13 | 0.35% → 0.34% | tokei 可用后完成统计口径校准：REPL.tsx 实测 Code=351，并统一重算累计复刻代码数 |
| 2026-04-13 | 0.35% → 0.35% | REPL 补齐 StreamEvent 最小可见反馈（onQueryEvent 增加 StreamEvent 识别并在 processing 区显示最近事件类型） |
| 2026-04-12 | 0.29% → 0.35% | 新增 utils/handlePromptSubmit.ts 最小链路并接入 REPL，打通提交层到 query() 的 AbortController 透传 |
| 2026-04-12 | 0.29% → 0.29% | REPL 提交路径对齐上游分层编排（新增 onQueryEvent/onQueryImpl/onQuery，提交流程改为委派链路） |
| 2026-04-11 | 0.26% → 0.29% | REPL 到代理循环 API 最小接线推进到生产边界（新增 services/api/client.ts 与 services/api/claude.ts） |
| 2026-04-10 | 0.23% → 0.26% | REPL 到代理循环最小接线完成（REPL 提交改为 query() 事件流消费） |
| 2026-04-09 | 0.21% → 0.23% | 工具执行编排最小闭环完成（runTools 接入 queryLoop, tool_result 回灌下一轮） |
| 2026-04-08 | 0.17% → 0.21% | queryLoop 核心流程完成（callModel 调用, 流式处理, tool_use 检测） |
| 2026-04-07 | 0.14% → 0.17% | query() 生成器函数框架完成（State 类型, query/queryLoop 框架） |
| 2026-04-07 | 0.08% → 0.14% | 核心类型定义完成（Message, Tool, ID 类型体系） |
| 2026-04-06 | 0.02% → 0.08% | REPL 交互框架、Ink 渲染、全局状态完成 |
| 2026-04-06 | 0.01% → 0.02% | CLI 入口、主命令模块框架完成 |
| 2026-04-05 | 0% → 0.01% | 项目结构初始化完成 |
