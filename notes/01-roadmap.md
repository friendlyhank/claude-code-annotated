# 复刻路线图

## 主核心流程

```
用户输入 → 命令解析 → 查询构建 → LLM 调用 → 工具执行 → 结果输出 → 状态更新
    ↓           ↓           ↓           ↓           ↓           ↓
 CLI Args   Commander   Query.ts    API Client   Tool.ts    Ink Render
            main.tsx    QueryEngine   services/   tools/     components/
```

### 主链路节点

1. **启动阶段** (`cli.tsx` → `main.tsx`)
   - 参数解析与快速路径判断
   - 配置加载与环境初始化
   - 认证状态检查

2. **交互阶段** (`replLauncher.tsx` → `interactiveHelpers.tsx`)
   - REPL 循环启动
   - 用户输入捕获
   - 命令/消息路由

3. **查询阶段** (`query.ts` → `QueryEngine.ts`)
   - 消息构建与系统提示注入
   - 工具定义准备
   - LLM API 调用

4. **执行阶段** (`Tool.ts` → `tools/`)
   - 工具调用解析
   - 工具执行与结果收集
   - 错误处理与重试

5. **渲染阶段** (`ink.ts` → `components/`)
   - 响应流式输出
   - TUI 状态更新
   - 用户交互反馈

## 分阶段路线图

### 阶段 1：最小闭环（启动 → 输入 → 输出）

**目标**：建立最基础的 CLI 交互能力

| 任务 | 状态 | 优先级 |
|---|---|---|
| 项目结构初始化 | `done` | high |
| CLI 入口与参数解析 | `done` | high |
| 主命令模块框架 | `done` | high |
| 基础 REPL 循环 | `done` | high |
| 核心类型定义 | `done` | high |
| 基础工具类 | `done` | high |


### 阶段 2：核心查询引擎

**目标**：实现 LLM 交互与消息处理

#### 2.1 代理循环主流程（query.ts 核心逻辑）

**源码分析依据**：`claude-code/src/query.ts` 第 1-1300 行

| 任务 | 状态 | 优先级 | 源码依据 |
|---|---|---|---|
| query() 生成器函数框架 | `planned` | high | query.ts:89-97 |
| queryLoop() 主循环结构 | `planned` | high | query.ts:106-1300 |
| State 状态管理 | `planned` | high | query.ts:69-83 |
| 消息预处理（compact/snip） | `backlog` | medium | query.ts:230-340 |
| API 流式调用（callModel） | `planned` | high | query.ts:530-700 |
| 工具调用收集（toolUseBlocks） | `planned` | high | query.ts:700-750 |
| 错误恢复机制 | `backlog` | medium | query.ts:900-1100 |
| Stop Hook 处理 | `backlog` | medium | query.ts:1100-1300 |

**关键数据流**：
```
State { messages, toolUseContext, tracking, ... }
    ↓
预处理: applyToolResultBudget → snipCompact → microcompact → autocompact
    ↓
API 调用: deps.callModel({ messages, systemPrompt, tools, ... })
    ↓
流式处理: for await (const message of callModel(...))
    ↓
工具收集: toolUseBlocks.push(...msgToolUseBlocks)
    ↓
循环判断: needsFollowUp ? continue : return terminal
```

#### 2.2 QueryEngine 类（QueryEngine.ts）

**源码分析依据**：`claude-code/src/QueryEngine.ts` 第 1-500 行

| 任务 | 状态 | 优先级 | 源码依据 |
|---|---|---|---|
| QueryEngineConfig 类型定义 | `planned` | high | QueryEngine.ts:68-116 |
| QueryEngine 类框架 | `planned` | high | QueryEngine.ts:139-160 |
| submitMessage() 方法 | `planned` | high | QueryEngine.ts:162-500 |
| 会话状态管理（mutableMessages） | `planned` | high | QueryEngine.ts:140-145 |
| processUserInput 集成 | `backlog` | high | QueryEngine.ts:200-300 |

#### 2.3 消息构建模块（utils/messages.ts）

**源码分析依据**：`claude-code/src/utils/messages.ts` 5556 行

| 任务 | 状态 | 优先级 | 源码依据 |
|---|---|---|---|
| createUserMessage() | `planned` | high | messages.ts |
| normalizeMessagesForAPI() | `planned` | high | messages.ts |
| createAssistantAPIErrorMessage() | `planned` | high | messages.ts |
| 消息类型转换工具 | `backlog` | medium | messages.ts |

#### 2.4 工具执行编排（services/tools/）

**源码分析依据**：`claude-code/src/services/tools/toolOrchestration.ts` + `toolExecution.ts`

| 任务 | 状态 | 优先级 | 源码依据 |
|---|---|---|---|
| runTools() 并行/串行编排 | `planned` | high | toolOrchestration.ts:20-70 |
| partitionToolCalls() 分区 | `planned` | high | toolOrchestration.ts:80-110 |
| runToolUse() 单工具执行 | `planned` | high | toolExecution.ts |
| StreamingToolExecutor | `backlog` | medium | query.ts:520 |

#### 2.5 API 客户端集成（services/api/claude.ts）

**源码分析依据**：`claude-code/src/services/api/claude.ts` 3420 行

| 任务 | 状态 | 优先级 | 源码依据 |
|---|---|---|---|
| callModel() 函数 | `planned` | high | query.ts deps.callModel |
| 流式响应处理 | `planned` | high | api/claude.ts |
| 错误处理与重试 | `backlog` | medium | api/ |
| 用量统计（usage） | `backlog` | low | api/ |

**关键文件**：
- `src/query.ts` (1,732 行) - 代理循环核心
- `src/QueryEngine.ts` (1,320 行) - 查询引擎类
- `src/utils/messages.ts` (5,556 行) - 消息构建
- `src/services/api/claude.ts` (3,420 行) - API 客户端
- `src/services/tools/toolOrchestration.ts` (188 行) - 工具编排
- `src/services/tools/toolExecution.ts` (1,745 行) - 工具执行

### 阶段 3：工具系统

**目标**：实现工具调用框架与核心工具

| 任务 | 状态 | 优先级 |
|---|---|---|
| Tool 基础类 | `backlog` | high |
| 工具注册机制 | `backlog` | high |
| 文件操作工具 | `backlog` | medium |
| Shell 执行工具 | `backlog` | medium |
| 搜索工具 | `backlog` | medium |

**关键文件**：
- `src/Tool.ts`
- `src/tools.ts`
- `src/tools/BashTool/`
- `src/tools/FileEditTool/`
- `src/tools/GrepTool/`

### 阶段 4：会话与状态管理

**目标**：实现会话持久化与状态管理

| 任务 | 状态 | 优先级 |
|---|---|---|
| 会话存储 | `backlog` | medium |
| 历史记录 | `backlog` | medium |
| 状态管理 | `backlog` | medium |
| 配置系统 | `backlog` | medium |

**关键文件**：
- `src/history.ts`
- `src/state/`
- `src/utils/config.ts`
- `src/context.ts`

### 阶段 5：TUI 完善

**目标**：完善终端用户界面

| 任务 | 状态 | 优先级 |
|---|---|---|
| Ink 组件系统 | `backlog` | medium |
| 交互组件 | `backlog` | medium |
| 样式与主题 | `backlog` | low |
| 快捷键绑定 | `backlog` | low |

**关键文件**：
- `src/ink.ts`
- `src/ink/`
- `src/components/`
- `src/keybindings/`

### 阶段 6：扩展能力

**目标**：添加高级功能

| 任务 | 状态 | 优先级 |
|---|---|---|
| MCP 集成 | `backlog` | medium |
| 多后端支持 | `backlog` | low |
| 代理系统 | `backlog` | low |
| 远程控制 | `backlog` | low |

**关键文件**：
- `src/services/mcp/`
- `src/utils/model/`
- `src/tools/AgentTool/`
- `src/bridge/`

## 依赖关系

```
阶段 1 (最小闭环)
    ↓
阶段 2 (查询引擎) ←→ 阶段 3 (工具系统)
    ↓                    ↓
阶段 4 (会话管理) ←→ 阶段 5 (TUI)
    ↓
阶段 6 (扩展能力)
```

## 风险与注意事项

1. **代码量巨大**：53万行代码，需分阶段渐进
2. **依赖复杂**：大量外部依赖，需逐步引入
3. **功能耦合**：模块间存在交叉依赖，需谨慎拆分
4. **原生模块**：部分功能依赖原生模块，可能需要替代方案
