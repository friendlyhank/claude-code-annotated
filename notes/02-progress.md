# 进度面板

> 最后更新：2026-04-12

## 总体进度

| 指标 | 值 |
|---|---:|
| 目标文件代码数 | 537,782 |
| 累计复刻目标文件代码数 | 1,577 |
| 覆盖率 | **0.29%** |

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
| REPL 到代理循环主流程对齐（提交编排） | `doing` | high |
| REPL 到代理循环 API 最小接线 | `doing` | high |
| 消息预处理流程 | `planned` | high |

### 进行中

| 任务 | 开始时间 | 备注 |
|---|---|---|
| REPL 到代理循环主流程对齐（提交编排） | 2026-04-12 | 已完成 onSubmit -> onQuery -> onQueryImpl -> onQueryEvent 分层，待补 StreamEvent 可见渲染 |
| REPL 到代理循环 API 最小接线 | 2026-04-11 | 生产依赖已切到 services/api，待真实 key 验证 assistant 成功响应 |
| toolExecution 真实执行 | 2026-04-09 | 编排闭环已打通，待补齐真实单工具执行、消息归一化与 hooks |

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

## 阻塞与风险

| 类型 | 描述 | 状态 |
|---|---|---|
| 验证条件 | 当前环境缺少 `ANTHROPIC_API_KEY`，真实 assistant 成功响应尚未留证 | doing |

## 能力清单

### 已实现能力

- [x] CLI 启动
- [x] --version 快速路径（零模块加载）
- [x] 参数解析（@commander-js/extra-typings）
- [x] 核心选项定义
- [x] preAction hook 框架
- [x] 交互模式/非交互模式路由
- [x] REPL 交互基础框架
- [ ] LLM 调用（生产边界已接通，待真实 key 验证与 streaming 细节补齐）
- [ ] 工具执行（已打通编排闭环，真实执行未完成）
- [ ] 会话管理

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
- [ ] 基础工具类

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
- 交互层最小 ToolUseContext 供给模式（先打通主链路，再补权限和状态细节）
- QueryDeps 生产依赖切换模式（query loop 只认 callModel 边界，不直接依赖 SDK）
- Anthropic SDK 最小接线模式（内部 Message -> SDK MessageParam[] -> AssistantMessage）

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
- [ ] 真实 API 成功响应验证证据
- [ ] Compact 机制的完整实现

## 历史记录

| 日期 | 进度变化 | 备注 |
|---|---|---|
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
