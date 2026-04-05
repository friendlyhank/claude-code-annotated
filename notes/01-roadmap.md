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
| 项目结构初始化 | `planned` | high |
| CLI 入口与参数解析 | `backlog` | high |
| 基础 REPL 循环 | `backlog` | high |
| 简单输入输出 | `backlog` | high |

**关键文件**：
- `src/entrypoints/cli.tsx`
- `src/main.tsx`
- `src/replLauncher.tsx`
- `src/interactiveHelpers.tsx`

### 阶段 2：核心查询引擎

**目标**：实现 LLM 交互与消息处理

| 任务 | 状态 | 优先级 |
|---|---|---|
| Query 核心逻辑 | `backlog` | high |
| QueryEngine 实现 | `backlog` | high |
| 消息构建与管理 | `backlog` | high |
| Anthropic API 集成 | `backlog` | high |

**关键文件**：
- `src/query.ts`
- `src/QueryEngine.ts`
- `src/utils/messages.ts`
- `src/services/api/`

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
