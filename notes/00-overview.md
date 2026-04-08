# 项目总览

## 复刻目标

复刻 `claude-code-best` 项目，这是一个逆向工程的 Anthropic Claude Code CLI — 交互式 AI 编码助手终端工具。

## 目标源码信息

| 项目 | 值 |
|---|---|
| 项目名称 | claude-code-best |
| 版本 | 1.1.0 |
| 源码路径 | `~/tsproject/claude-code` |
| 代码行数 | ~537,782 行 (TypeScript/TSX) |
| 运行时 | Bun >= 1.2.0 |
| 入口文件 | `src/entrypoints/cli.tsx` |
| 主文件 | `src/main.tsx` |

## 项目定位

Claude Code 是一个交互式 AI 编码助手，运行在终端环境中，提供：
- 自然语言交互的 REPL 界面
- 多种 LLM 后端支持（Claude、Bedrock、Vertex AI 等）
- 工具调用系统（文件操作、Shell 命令、Web 搜索等）
- MCP (Model Context Protocol) 集成
- 会话管理与历史记录
- 多代理协作支持

## 核心模块概览

### 入口与启动
- `src/entrypoints/cli.tsx` - CLI 入口点，处理启动参数与快速路径
- `src/main.tsx` - 主逻辑，命令行解析与 REPL 启动
- `src/entrypoints/init.ts` - 初始化逻辑

### 核心引擎
- `src/query.ts` - 查询处理核心
- `src/QueryEngine.ts` - 查询引擎实现
- `src/Tool.ts` - 工具系统基础类
- `src/tools.ts` - 工具注册与管理
- `src/commands.ts` - 命令系统
- `src/Task.ts` - 任务系统

### 模块目录
| 目录 | 描述 | 文件数 |
|---|---|---|
| `src/tools/` | 工具实现（文件操作、Shell、搜索等） | 58 |
| `src/commands/` | 命令处理器 | 110 |
| `src/services/` | 服务层（API、分析、MCP 等） | 42 |
| `src/utils/` | 工具函数 | 346 |
| `src/components/` | UI 组件（Ink/React） | 150 |
| `src/hooks/` | React Hooks | 88 |
| `src/ink/` | Ink 渲染器适配 | 53 |
| `src/bridge/` | 远程控制桥接 | 36 |
| `src/types/` | 类型定义 | 25 |

### 外部依赖
- `@anthropic-ai/sdk` - Anthropic API
- `@modelcontextprotocol/sdk` - MCP 协议
- `react` / `react-reconciler` / `ink` - TUI 框架
- `@commander-js/extra-typings` - 命令行解析
- `@opentelemetry/*` - 可观测性

## 复刻范围边界

### 包含
- 核心交互流程（输入 → 处理 → 输出）
- 工具系统架构与实现
- 命令系统
- 会话管理
- MCP 集成
- 多后端 LLM 支持

### 不包含（初始阶段）
- 原生模块（packages/*-napi）
- Chrome 扩展集成
- 自托管运行器
- 遥测与分析服务

## 复刻原则

1. **先主链路，再细节**：主核心流程 → 核心模块 → 细分功能 → 边界处理 → 工程化完善
2. **先最小闭环，再扩展**：输入 → 核心处理 → 输出
3. **保持与原源码一致**：功能逻辑、执行流程、分层职责、数据流优先对齐
4. **基于代码事实**：禁止臆造；无法确认必须标注待确认
