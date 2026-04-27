- 最新已处理提交：`93f50b8fbc933e004f85b294ba07870cf3e698ce`

1. 架构设计和核心流程
   - 文档：`notes/reviews/01-architecture-and-core-flow.md`
   - 启动主链路按 CLI 入口 → 主模块 → REPL 启动器 → REPL 屏幕 → 查询引擎 展开
   - 运行时稳定分层为入口装配、交互层、查询引擎、工具编排、模型适配、状态承载、TUI 运行时
   - 主回合以消息数组、工具上下文、引导状态为三条状态主线
   - 阅读顺序先看总览，再看架构页，最后按能力域下钻

2. CLI 入口与 REPL 交互
   - 文档：`notes/reviews/02-core-interaction-layer.md`
   - CLI 入口负责快速路径和主模块动态导入
   - 主模块用 Commander 定义命令、参数和交互会话启动动作
   - 输入提交处理把输入清空、排队命令转用户消息、处理中提示和查询前校验收口到统一入口
   - REPL 屏幕负责输入采集、消息回写，并通过提交编排后再接入查询引擎
   - 交互层当前只覆盖最小闭环，print/setup/agent 等上游分支仍未落地

3. 查询引擎、回合推进与流式事件处理
   - 文档：`notes/reviews/03-query-engine-layer.md`
   - 查询函数与查询循环是系统核心生成器边界
   - 状态对象负责跨轮次保存消息历史、工具上下文、终止条件和恢复标记
   - 每轮固定执行"准备请求 → 调模型 → 检测工具调用 → 执行工具 → 进入下一轮或终止"
   - 流式消息处理统一消费流式事件，覆盖请求开始、内容块开始/增量、消息增量/停止全部分支
   - 流式状态桥接：各类回调把事件映射到 REPL 状态
   - 当前已落地主回合骨架与流式事件处理，压缩、budget、stop hooks 等增强能力仍为 TODO

4. 工具编排与执行框架
   - 文档：`notes/reviews/04-tool-execution-layer.md`
   - 工具接口/定义/集合/上下文提供统一工具边界与工厂模式
   - 工厂函数 + 默认配置统一工具创建流程，填充安全默认值（fail-closed 原则）
   - 权限检查函数定义完整签名：接收工具、输入、上下文，返回允许/拒绝决策
   - 工具注册机制：基础工具真相源、权限过滤、内置+MCP 合并、拒绝规则过滤
   - 集中管理工具名称常量、代理禁用列表、异步代理允许列表、协调器模式允许列表
   - 工具编排按并发安全性切批、限流执行和上下文回放
   - 单个工具调用的完整执行链路：查找→校验→权限→调用→结果映射
   - 工具输入规范化与安全 JSON 解析
   - lazySchema 延迟 Schema 构建：延迟 Zod schema 从模块初始化到首次访问，缓存后复用
    - 4.1 glob 搜索工具实现
        - 文档：`notes/reviews/04-01-glob-search-tool.md`
        - GlobTool 完整实现：buildTool 工厂模式落地、延迟 Schema 构建、路径相对化策略
        - 输入验证边界处理：UNC 路径安全检查、目录存在性检查、目录类型检查
        - 结果截断与提示：100 文件上限、truncated 标记、建议更具体路径
        - ripgrep 高性能搜索集成：system/builtin/embedded 三种模式、超时重试机制、EAGAIN 错误恢复
        - glob 核心实现：extractGlobBaseDirectory 静态目录提取、ripgrep --files --glob 调用
        - 路径工具函数：expandPath 路径展开、toRelativePath 相对化、getCwd 工作目录管理
        - 文件工具函数：isENOENT 错误判断、suggestPathUnderCwd 路径建议、getFsImplementation 文件系统抽象
    - 4.2 grep 搜索工具实现
        - 文档：`notes/reviews/04-02-grep-search-tool.md`
        - GrepTool 完整实现：文件内容正则搜索、三种输出模式（content/files_with_matches/count）
        - ripgrep 集成：高性能正则搜索、VCS 目录排除、结果按修改时间排序
        - 输入验证与权限检查：路径存在性验证、只读工具统一权限入口
        - 输出处理：相对路径转换、250 行默认上限、结果格式化
    - 4.3 mcp 工具实现
        - 文档：`notes/reviews/04-03-mcp-tool-implementation.md`
       - MCP 名称解析/构建：mcpInfoFromString 信息解析、buildMcpToolName 工具名构建、getToolNameForPermissionCheck 权限检查用名称提取
       - MCP 名称规范化：normalizeNameForMCP 合规化、getMcpPrefix 前缀生成、getMcpDisplayName/extractMcpToolDisplayName 显示名提取
       - Tool 类型 MCP 扩展：isMcp 标记、mcpInfo 元数据、inputJSONSchema JSON Schema 直通、mcpMeta 结构化内容透传
       - MCP 工具注册：ListMcpResources/ReadMcpResource 占位工具、assembleToolPool 内置+MCP 合并去重、specialTools 过滤
       - MCP 权限匹配：服务器级拒绝规则（mcp__server）、通配符匹配（mcp__server__*）、完整名匹配
       - MCP 流式处理：mcp_tool_use/mcp_tool_result 内容块识别与透传
       - MCP API 适配：inputJSONSchema 直接透传绕过 Zod 转换
       - 当前局限：MCP 客户端连接未实现、mcpClients/mcpResources 为 TODO 占位、MCPProgress 类型为 any 桩
    - 4.4 read 工具实现
        - 文档：`notes/reviews/04-04-read-tool-implementation.md`
       - FileReadTool 完整实现：buildTool 工厂落地、lazySchema 延迟构建、多类型输出判别联合
       - 输入验证与安全防护：二进制扩展名拒绝、设备文件黑名单、UNC 路径标记
       - 文本文件按行范围读取：快速路径（<10MB 整文件内存分割）与流式路径（>=10MB 增量扫描）
       - 文件未变更去重：mtimeMs 比对 + offset/limit 匹配，返回 file_unchanged 节省 token
       - 多媒体扩展预留：image/notebook/pdf 输出 schema 已定义，实现为 TODO
       - macOS 截图薄空格处理、二进制文件安全风险提示、语义数字预处理
    - 4.5 Edit 工具实现
        - 文档：`notes/reviews/04-05-edit-tool-implementation.md`
       - FileEditTool 完整实现：精确字符串替换（old_string → new_string）
       - 验证链（10 步）：相同内容拒绝 → deny 规则 → UNC 安全 → 文件大小限制 → 文件存在性 → 先读后写 → 修改时间检查 → 引号规范化查找 → 多匹配检测
       - 执行链：加载文件 → 确认未修改 → 引号规范化匹配 → 弯引号风格保持 → 生成 patch → 写入磁盘 → 更新读取时间戳
       - 编辑工具函数集：引号规范化、弯引号风格保持、精确字符串查找、编辑应用（删除智能尾部换行）、patch 生成、snippet 生成、反净化处理、输入规范化、编辑等价性判断
       - diff 工具函数：getPatchForDisplay 展示用 patch 生成、&/$ 转义处理
       - 先读后写原则 + 修改时间防冲突（mtimeMs 比对 + 内容比较兜底）
       - 当前局限：fileHistory 备份撤销、LSP 通知、VSCode 集成、日志事件待补齐
    - 4.6 Write 工具实现
        - 文档：`notes/reviews/04-06-write-tool-implementation.md`
       - FileWriteTool 完整实现：全量文件写入（创建/覆盖）
       - 验证链：deny 规则 → UNC 安全 → 文件存在性 → 先读后写 → 修改时间检查
       - 执行链：确保父目录 → 同步加载文件 → 确认未修改 → 写入磁盘（始终 LF 行尾）→ 更新读取时间戳
       - 行尾策略：模型发送的 content 包含明确行尾，不保留旧文件行尾风格（避免跨平台损坏）
       - 输出区分 create/update：新文件返回空 structuredPatch，已有文件生成 diff patch
       - 当前局限：fileHistory 备份撤销、LSP 通知、VSCode 集成、日志事件待补齐
    - 4.7 Bash 工具实现
        - 文档：`notes/reviews/04-07-bash-tool-implementation.md`
       - BashTool 完整实现：buildTool 工厂落地、lazySchema 延迟构建、命令分类体系
       - 命令分类：搜索类/读取类/列表类/静默类/中性类，用于只读判断和 UI 折叠显示
       - 执行主链路：exec 调用 → ShellCommand 执行 → interpretCommandResult 退出码解释 → CWD 恢复检查
       - 命令语义解析：grep/rg/find/diff/test/[ 的非零退出码解释（非匹配 ≠ 错误）
       - 输出处理：空行清除、退出码追加、中断标记、结果映射
       - 并发安全：只读命令（搜索/读取/列表）可并发，其他串行
       - 后台任务：run_in_background 字段（受 CLAUDE_CODE_DISABLE_BACKGROUND_TASKS 控制）
       - Shell 执行引擎：exec 命令执行入口、findSuitableShell 查找可用 shell、getShellConfig 缓存配置
       - ShellCommand 命令生命周期：spawn 包装、stdout/stderr 收集、退出码处理、中断信号响应、超时控制、进程组 kill
       - 当前局限：sandbox 集成、完整权限检查、PowerShell 支持、输出持久化待补齐
 5. 模型调用与 Anthropic API 适配
   - 文档：`notes/reviews/05-api-client-layer.md`
   - 查询依赖注入把查询层与外部 I/O 解耦
   - Anthropic 适配层负责消息归一化、流式事件处理、assistant 消息回填和工具定义转换为 API 格式
   - API 客户端负责 API key 读取、客户端缓存和超时配置
   - 流式内容块归一化（工具调用输入解析与规范化）
   - 流式事件处理已落地，支持双产出机制（流事件 + 助手消息）
   - 工具定义转换为 API 格式并透传到 Anthropic API
   - API 请求/响应日志记录：logAPIQuery/logAPIError/logAPISuccessAndDuration/logAPIRequest/logAPIResponse
   - 当前 retry / 多 provider 尚未复刻

6. 会话状态与消息类型
   - 文档：`notes/reviews/06-session-management-layer.md`
   - 引导状态保存进程级交互态、cwd 和会话来源
   - 统一消息模型覆盖 transcript、流事件和工具结果
   - 工具上下文承载查询层与工具层共享的会话级可变状态
   - 最新 transcript 快照补齐了异步查询消费前的本地状态桥接
   - 处理中输入标记与中断控制器把界面反馈和查询中断接到同一轮提交生命周期里
   - AppState 全局状态管理：mainLoopModel/verbose/toolPermissionContext
   - AppStateStore 基于 useSyncExternalStore 的订阅式状态
   - AppStateProvider 提供全局上下文环境
   - 当前 React 全局 AppState 已接入，状态主要分散在进程态、查询态与 REPL 本地态

7. TUI 渲染与终端运行时
   - 文档：`notes/reviews/07-tui-rendering-layer.md`
   - Ink 渲染封装
   - 渲染运行、退出和消息式错误收尾
   - 全局 Provider 挂载位
   - REPL 由提交处理、查询事件、查询实现分别驱动处理中提示、消息回写与终止原因展示
   - REPL 流式状态管理：流模式、流式文本、流式思考、流式工具调用、响应长度、首 token 时间提供细粒度反馈
   - ESC 退出前会优先触发共享中断控制器，让终端交互和查询中断保持同一退出语义
   - 进程输出错误处理：EPIPE 处理、stdout/stderr 安全写入
   - 当前 TUI 已能支撑最小 REPL，会话指标、对话框与复杂 UI 基础设施仍待补齐

8. 权限类型与决策体系
   - 文档：`notes/reviews/08-permission-system.md`
   - 独立权限类型定义，与实现分离以避免循环依赖
   - 权限检查函数已从最小签名升级为完整类型，REPL 中默认返回允许
   - 权限模式：5 种外部模式（接受编辑/绕过权限/默认/不询问/计划）+ 2 种内部模式（自动/冒泡）
   - 权限决策三态 + 透传：允许/询问/拒绝 + 含透传的结果类型
   - 决策溯源覆盖规则/模式/钩子/分类器/安全检查等 10 种原因
   - 工具权限上下文承载权限检查所需完整上下文（模式、规则、目录、标志位）
   - 权限更新支持规则增删替换、模式设置、目录增删 6 种操作
   - 规则提取与工具匹配：获取允许/拒绝/询问规则、工具匹配规则、按工具获取对应规则
   - 规则字符串解析：值解析/序列化、内容转义/反转义、旧工具名别名映射
   - 文件系统权限检查：为只读/写入工具提供统一权限入口（checkReadPermissionForTool、checkWritePermissionForTool、matchingRuleForInput）
   - 写入权限检查：deny 规则优先 → 内部可编辑路径 → 安全路径 → 无匹配则 ask（当前简化实现默认允许）
   - 通配符模式匹配：支持权限规则中的 `*` 通配符
   - 规则来源定义 8 种遍历顺序：用户设置 → 项目设置 → 本地设置 → 标志设置 → 策略设置 → CLI 参数 → 命令 → 会话
   - MCP 权限匹配支持服务器级规则：规则 "mcp__server" 匹配该服务器所有工具，通配符 "mcp__server__*" 同效

9. 日志系统与可观测性
   - 文档：`notes/reviews/09-logging-and-observability.md`
   - 调试日志系统：logForDebugging 核心 API、日志级别过滤（verbose/debug/info/warn/error）
   - 调试模式检测：--debug/-d/--debug=filter/--debug-to-stderr/--debug-file=path
   - 缓冲写入器：减少频繁 I/O，支持立即模式和缓冲模式
   - 日志文件路径：基于会话 ID 生成，支持符号链接指向最新日志
   - 错误日志接收器：内存缓冲 + 文件持久化，支持 MCP 错误/调试日志
   - 全局清理注册表：进程退出时执行清理操作（如刷新日志缓冲）
   - API 请求日志：记录查询参数、错误、成功、请求/响应内容
    - 慢操作日志：slowLogging 标记模板、AntSlowLogger 计时器、阈值配置（环境变量/开发模式/生产模式）
    - 慢操作包装函数：jsonStringify、jsonParse、clone、cloneDeep、writeFileSync_DEPRECATED
    - 慢操作阈值分级：环境变量覆盖 → 开发模式 20ms → Ants 内部 300ms → 外部默认 Infinity
    - 标记模板惰性构建：slowLogging\`op(${value})\` 仅在超阈值时构建描述和捕获堆栈
    - 重入保护：isLogging 标志防止 logForDebugging 触发递归慢操作日志
   - 慢操作记录存储：addSlowOperation、getSlowOperations、clearSlowOperations

10. 提示词工程系统
    - 10.1 系统提示词构建
        - 文档：`notes/reviews/10-01-system-prompt.md`
        - 系统提示词分层：简单介绍 → 系统配置 → 任务 → 操作 → 使用工具 → 语气风格 → 输出效率 → 环境信息
        - 环境信息计算：工作目录、git 状态、平台、Shell、OS 版本、模型描述、知识截止日期
        - 有效系统提示词构建：优先级为 agent > custom > default，appendSystemPrompt 始终追加
        - 模型营销名称映射：Opus/Sonnet/Haiku 对应具体版本号
        - 知识截止日期：不同模型对应不同截止日期
        - 系统提示词类型：asSystemPrompt 类型断言、SystemPrompt 类型定义
    - 10.2 工具提示词设计
        - 文档：`notes/reviews/10-02-tool-prompts.md`
        - 工具描述模板：各工具独立的 prompt.ts 定义使用说明和约束
        - FileReadTool 提示词：文件读取规范、行格式说明、偏移量策略、多媒体支持
        - FileEditTool 提示词：精确替换规则、验证链说明、先读后写原则
        - FileWriteTool 提示词：全量写入规范、行尾策略、创建/更新区分
        - BashTool 提示词：命令执行规范、并发策略、路径引用、超时配置
        - GlobTool 提示词：glob 模式匹配、结果排序、截断策略
        - GrepTool 提示词：正则搜索模式、输出格式、VCS 目录排除

11. 错误处理与崩溃报告
    - Sentry 集成：错误捕获、标签设置、用户设置、敏感头过滤
    - 错误分类：API 错误分类器（classifyAPIError）
    - 内存错误缓冲：最多保留 100 条错误记录
    - 错误日志队列：支持延迟初始化，先入队列后消费

12. 工具函数与基础设施
    - 12.1 搜索引擎基础设施
        - 文档：`notes/reviews/12-01-search-engine-infrastructure.md`
        - ripgrep 配置自动选择：system（系统 rg）/builtin（vendor 目录）/embedded（Bun 编译）三种模式
        - 高性能文件搜索：比 Node.js 原生方法快得多，支持大型 monorepo（200k+ 文件）
        - 超时与重试机制：平台自适应超时（WSL 60s/其他 20s）、EAGAIN 错误检测、单线程降级重试
        - 流式处理：ripGrepStream 增量返回结果（fzf change:reload 模式）、ripGrepFileCount 内存优化（仅计数换行符）
        - 进程生命周期管理：spawn 包装、stdout/stderr 截断、超时升级 SIGKILL、AbortSignal 响应
        - macOS 代码签名：codesignRipgrepIfNecessary 解决 quarantine 问题、xattr 清除隔离属性
        - 结果归一化：退出码语义（0=匹配/1=无匹配/2=用法错误）、部分结果返回、超时错误区分
    - 12.2 平台检测与环境适配
        - 文档：`notes/reviews/12-02-platform-and-environment.md`
        - 平台检测：getPlatform 支持 macOS/Windows/WSL/Linux、WSL 版本检测、Linux 发行版信息
        - Bundled 模式检测：isRunningWithBun、isInBundledMode 检测 Bun 编译独立可执行文件
        - 嵌入式搜索工具：hasEmbeddedSearchTools、embeddedSearchToolsBinaryPath bfs/ugrep 嵌入检测
        - 可执行文件查找：which 异步/同步版本、Bun.which 优先、findExecutable 替代 spawn-rx
        - 环境变量工具：isEnvTruthy、isEnvFalsy 布尔环境变量解析
    - 12.3 缓存与路径管理
        - 文档：`notes/reviews/12-03-cache-and-path-management.md`
        - 缓存路径管理：基于 env-paths 的标准缓存目录
        - 项目目录隔离：按 cwd 生成隔离的缓存目录
        - 路径安全处理：非法字符替换、长度限制、哈希后缀
        - 缓存类型：错误日志、消息、MCP 日志分别存储
        - 工作目录管理：getCwd/setCwd 工作目录访问、toRelativePath 相对路径转换
    - 12.4 进程与执行引擎
        - 文档：`notes/reviews/12-04-process-and-execution.md`
        - 跨平台执行工具：execFileNoThrow 始终 resolve、execSyncWithDefaults_DEPRECATED 同步执行包装
        - 进程输出处理：EPIPE 错误处理、stdout/stderr 安全写入
        - 进程退出处理：exitWithError 错误退出、peekForStdinData 标准输入检查
        - 清理注册表：registerCleanup 注册清理函数、runCleanupFunctions 进程退出时执行清理
    - 12.5 字符串与数据格式化工具
        - 文档：`notes/reviews/12-05-string-and-formatting.md`
        - 字符串工具函数：escapeRegExp、capitalize、plural、safeJoinLines、EndTruncatingAccumulator、countCharInString
        - JSON 工具函数：safeJsonStringify、safeJsonParse 带 try-catch 保护
        - 语义数字处理：prettifyNumber 数字格式化、semanticNumber 语义数字转换
        - 语义布尔值处理：semanticBoolean 布尔值规范化
