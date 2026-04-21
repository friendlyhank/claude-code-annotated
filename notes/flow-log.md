# 复刻流水日志

> 最后更新：2026-04-21

## 已完成清单

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
| API 调用层流式化改造 | 2026-04-14 | queryModelWithStreaming 改为流式 AsyncGenerator，真实 API 响应验证通过 |
| 基础工具类（Tool.ts 核心框架） | 2026-04-15 | buildTool、ToolResult、ValidationResult、PermissionResult 类型完整 |
| 工具注册机制（tools.ts） | 2026-04-15 | getAllBaseTools、getTools、filterToolsByDenyRules、assembleToolPool、getMergedTools |
| 权限规则解析（permissionRuleParser） | 2026-04-15 | permissionRuleValueFromString/ToString、escapeRuleContent、normalizeLegacyToolName |
| MCP 名称工具函数 | 2026-04-15 | mcpInfoFromString、buildMcpToolName、getToolNameForPermissionCheck |
| 权限类型系统（types/permissions.ts） | 2026-04-15 | PermissionResult、PermissionDecision、PermissionPolicy 类型完整 |
| 阶段 2 核心流程闭环 | 2026-04-16 | query() → queryLoop() → callModel() → tool_use → runTools() 全链路打通 |
| GlobTool 实现 | 2026-04-16 | GlobTool.ts + prompt.ts + glob.ts；工具注册、模式匹配、结果映射完整 |
| toolExecution 核心链路 | 2026-04-16 | runToolUse 实现真正的工具调用：查找→校验→权限→call→映射 |
| FileEditTool 实现 | 2026-04-19 | validateInput + call 主链路 + utils 全量；constants/types/prompt/utils/FileEditTool 5 文件 |
| FileWriteTool 实现 | 2026-04-19 | validateInput + call 主链路；prompt/FileWriteTool 2 文件 + diff.ts/fileRead.ts 新建 |
| 日志与调试系统 | 2026-04-21 | log.ts + debug.ts + debugFilter.ts + errorLogSink.ts + bufferedWriter.ts + sentry.ts 等 12 文件 |

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
- 工具注册模式（getAllBaseTools 唯一真相源、条件引入、isEnabled 过滤）
- 权限规则解析模式（permissionRuleValueFromString: "ToolName" 或 "ToolName(content)"）
- MCP 工具名解析模式（mcp__serverName__toolName 格式，mcpInfoFromString 解析）
- MCP 权限匹配模式（getToolNameForPermissionCheck 使用全限定名防止误匹配）
- 工具池组装模式（assembleToolPool: 内置排序 + MCP 排序 + uniqBy 去重，内置优先）
- prompt cache 稳定性模式（工具排序保持内置工具为连续前缀）
- 旧工具名映射模式（normalizeLegacyToolName: Task→Agent, KillShell→TaskStop）
- 规则内容转义模式（escapeRuleContent/unescapeRuleContent: 括号转义）
- glob 模式匹配（`**` 匹配任意路径，`*` 匹配非路径分隔符）
- 相对路径匹配模式（ripgrep 使用相对路径匹配 glob 模式）
- 工具执行链路（findToolByName → safeParse → validateInput → canUseTool → call → mapResult）
- FileWriteTool 全量写入模式（覆盖写入、强制 LF 行尾、临界区原子性保证）
- readFileSyncWithMetadata 同步读取模式（编码检测 + 行尾检测 + CRLF 规范化，一次 IO 完成所有元数据提取）
- safeResolvePath 安全路径解析（UNC 阻断、特殊文件类型检测、符号链接解析、ENOENT 容错）
- diff.ts &/$ 转义模式（diff 库对 & 和 $ 解析错误，需要 token 替换后还原）
- checkWritePermissionForTool 权限检查模式（deny 规则优先、内部可编辑路径检查、安全路径检查）
- 结构化日志系统（分级 log/info/warn/error/debug + DEBUG 环境变量过滤）
- 缓冲写入器模式（BufferedWriter 批量落盘 + 定时刷盘 + 进程退出保证）
- 错误上报机制（Sentry 集成 + 本地落盘双写）
- 清理注册表模式（cleanupRegistry 统一注册 process.on('exit') 钩子）

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

## 能力清单

### 已实现能力

- [x] CLI 启动
- [x] --version 快速路径（零模块加载）
- [x] 参数解析（@commander-js/extra-typings）
- [x] 核心选项定义
- [x] preAction hook 框架
- [x] 交互模式/非交互模式路由
- [x] REPL 交互基础框架
- [x] LLM 调用（流式 AsyncGenerator 已实现，真实 API 响应验证通过）
- [x] 工具类型系统（Tool 类型、buildTool、权限类型）
- [x] 工具注册机制（tools.ts：getAllBaseTools、getTools、assembleToolPool）
- [x] 工具权限检查（getDenyRuleForTool、filterToolsByDenyRules、permissionRuleParser）
- [x] GlobTool 工具执行

### 待实现能力

- [ ] 工具执行（更多具体工具）
- [ ] 会话管理
- [ ] FileReadTool
- [ ] BashTool
- [x] FileEditTool
- [x] FileWriteTool
- [ ] GrepTool

## 历史记录

| 日期 | 进度变化 | 备注 |
|---|---|---|
| 2026-04-21 | 1.32% → 1.49% | 日志与调试系统完成：log.ts + debug.ts + debugFilter.ts + errorLogSink.ts + bufferedWriter.ts + sentry.ts 等 12 文件，Code=929 |
| 2026-04-19 | 1.24% → 1.32% | FileWriteTool 完成：prompt.ts + FileWriteTool.ts + diff.ts + fileRead.ts；fsOperations 补充 safeResolvePath；filesystem 新增 checkWritePermissionForTool |
| 2026-04-18 | 1.23% → 1.24% | FileEditTool 完成：constants/types/prompt/utils/FileEditTool 5 文件 + semanticBoolean.ts |
| 2026-04-16 | 0.69% → 0.70% | API tools 参数传递修复：claude.ts toolsToApiFormat、query.ts tools 传递、REPL.tsx getTools()；完整 REPL → API → 工具执行链路验证通过 ✅ |
| 2026-04-16 | 0.61% → 0.67% | GlobTool 完成：GlobTool.ts + prompt.ts + glob.ts；修复 glob 模式匹配逻辑 |
| 2026-04-16 | 0.61% → 0.62% | 阶段 2 核心流程闭环完成；FileReadTool 任务规划完成；启动流程分析完成 |
| 2026-04-15 | 0.52% → 0.61% | 工具注册机制（tools.ts）+ 权限规则解析 + MCP 名称工具 + 环境变量工具；新增 6 个文件 |
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
