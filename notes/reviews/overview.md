# Claude Code Annotated 源码总览

## 项目定位

`claude-code-annotated` 是一个围绕 Claude Code 主链路做源码复刻与注释化沉淀的 Bun + TypeScript 工程。当前仓库已经打通最小交互闭环：CLI 启动后进入 Ink 驱动的 REPL，用户输入先经过 REPL 提交编排层，再进入 `query()` 代理循环；模型响应若包含 `tool_use` 则进入工具编排层，再把 `tool_result` 回灌到下一轮。

阅读这套文档时，建议先看本页建立目录地图，再看 `01-architecture-and-core-flow.md` 建立分层认知，最后按能力域阅读 02-07 专题页。

## 仓库组织

- 单包工程，核心源码集中在 `src/`
- 构建脚本是 `build.ts`，打包入口是 `src/entrypoints/cli.tsx`
- 运行依赖以 `@commander-js/extra-typings`、`ink`、`react`、`@anthropic-ai/sdk` 为主
- `notes/reviews/` 只沉淀当前仓库已经被源码证明的能力，不把上游完整特性提前写成已实现

## 目录地图

```text
.
├── src/
│   ├── bootstrap/
│   │   └── state.ts
│   ├── components/
│   │   └── App.tsx
│   ├── constants/
│   │   ├── querySource.ts
│   │   └── tools.ts
│   ├── entrypoints/
│   │   └── cli.tsx
│   ├── hooks/
│   │   └── useCanUseTool.ts
│   ├── query/
│   │   ├── deps.ts
│   │   └── transitions.ts
│   ├── screens/
│   │   └── REPL.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── claude.ts
│   │   │   └── client.ts
│   │   ├── mcp/
│   │   │   └── mcpStringUtils.ts
│   │   └── tools/
│   │       ├── toolExecution.ts
│   │       └── toolOrchestration.ts
│   ├── tools/
│   │   └── GlobTool/
│   │       ├── GlobTool.ts
│   │       └── prompt.ts
│   ├── types/
│   │   ├── global.d.ts
│   │   ├── ids.ts
│   │   ├── index.ts
│   │   ├── message.ts
│   │   ├── permissions.ts
│   │   ├── tools.ts
│   │   └── utils.ts
│   ├── utils/
│   │   ├── cwd.ts
│   │   ├── envUtils.ts
│   │   ├── errors.ts
│   │   ├── file.ts
│   │   ├── fsOperations.ts
│   │   ├── generators.ts
│   │   ├── glob.ts
│   │   ├── handlePromptSubmit.ts
│   │   ├── api.ts
│   │   ├── json.ts
│   │   ├── lazySchema.ts
│   │   ├── messages.ts
│   │   ├── path.ts
│   │   ├── permissions/
│   │   │   ├── filesystem.ts
│   │   │   ├── permissionRuleParser.ts
│   │   │   ├── permissions.ts
│   │   │   └── shellRuleMatching.ts
│   │   └── systemPromptType.ts
│   ├── Tool.ts
│   ├── ink.ts
│   ├── interactiveHelpers.tsx
│   ├── main.tsx
│   ├── query.ts
│   ├── replLauncher.tsx
│   └── tools.ts
├── build.ts
├── bun.lock
├── package.json
└── tsconfig.json
```

## 目录职责

| 路径 | 作用 | 下一步读哪里 |
| --- | --- | --- |
| `src/entrypoints/cli.tsx` | CLI 快速路径与主模块动态导入入口 | `src/main.tsx` |
| `src/main.tsx` | Commander 主命令、参数定义、Ink root 创建、REPL 启动 | `src/replLauncher.tsx`、`src/screens/REPL.tsx` |
| `src/screens/REPL.tsx` | 输入采集、消息展示、提交编排层入口与 `query()` 接线 | `src/utils/handlePromptSubmit.ts`、`src/query.ts` |
| `src/utils/handlePromptSubmit.ts` | 把用户输入转换成待提交消息，收口输入清空、处理中提示与共享中断控制器创建 | `src/screens/REPL.tsx`、`src/query.ts` |
| `src/query.ts` | 代理主循环、模型调用、工具分支与终止判断 | `src/query/deps.ts`、`src/services/tools/` |
| `src/tools.ts` | 工具注册机制：getAllBaseTools/getTools/assembleToolPool/filterToolsByDenyRules | `src/Tool.ts`、`src/utils/permissions/`、`src/tools/GlobTool/` |
| `src/tools/GlobTool/GlobTool.ts` | 首个真实工具：文件名模式匹配，完整实现 buildTool 工厂模式 | `src/utils/glob.ts`、`src/utils/path.ts` |
| `src/tools/GlobTool/prompt.ts` | GlobTool 名称与描述常量 | `src/tools/GlobTool/GlobTool.ts` |
| `src/constants/tools.ts` | 工具名称常量、代理禁用列表、异步代理允许列表 | `src/tools.ts` |
| `src/services/api/` | 模型请求归一化、Anthropic 客户端与最小 API 适配 | `src/services/api/claude.ts` |
| `src/services/tools/` | `tool_use` 分批、串并行调度与结果回传 | `src/services/tools/toolOrchestration.ts` |
| `src/services/mcp/mcpStringUtils.ts` | MCP 名称解析/构建：mcpInfoFromString/buildMcpToolName/getToolNameForPermissionCheck | `src/utils/permissions/permissions.ts` |
| `src/utils/glob.ts` | Glob 文件搜索（简化实现，待 ripgrep 集成） | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/path.ts` | 路径展开与相对化：expandPath/toRelativePath | `src/tools/GlobTool/GlobTool.ts`、`src/utils/cwd.ts` |
| `src/utils/cwd.ts` | 当前工作目录管理：getCwd/runWithCwdOverride | `src/utils/path.ts` |
| `src/utils/errors.ts` | 错误类型判断：isENOENT | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/file.ts` | 文件工具函数：suggestPathUnderCwd | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/fsOperations.ts` | 文件系统操作抽象：getFsImplementation | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/lazySchema.ts` | 延迟 Schema 构建：lazySchema | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/permissions/` | 权限规则提取、匹配与字符串解析 | `src/types/permissions.ts` |
| `src/utils/permissions/filesystem.ts` | 文件系统权限检查：checkReadPermissionForTool | `src/tools/GlobTool/GlobTool.ts` |
| `src/utils/permissions/shellRuleMatching.ts` | 通配符模式匹配：matchWildcardPattern | `src/utils/permissions/permissions.ts` |
| `src/bootstrap/state.ts` | 进程级状态，如交互模式、cwd、session source | `src/types/message.ts` |
| `src/ink.ts` / `src/interactiveHelpers.tsx` | TUI root/render 抽象、退出与消息式收尾 | `src/components/App.tsx` |

## 源码阅读入口

### 1. 想先看程序怎么跑起来

先读：

1. `package.json`
2. `build.ts`
3. `src/entrypoints/cli.tsx`
4. `src/main.tsx`

这条路径先回答“命令从哪里进来、如何创建交互环境、最终为什么会进入 REPL”。

### 2. 想看用户输入如何进入代理循环

先读：

1. `src/screens/REPL.tsx`
2. `src/utils/handlePromptSubmit.ts`
3. `src/query.ts`
4. `src/query/deps.ts`

这条路径回答“消息怎样先进入提交编排层、怎样创建共享中断控制器、怎样被追加到 transcript、模型调用怎样发生、什么时候进入下一轮”。

### 3. 想看工具调用怎样被处理

先读：

1. `src/Tool.ts`
2. `src/services/tools/toolOrchestration.ts`
3. `src/services/tools/toolExecution.ts`

这条路径回答“工具如何被匹配、校验、权限检查、真实调用，结果如何回传”。

### 4. 想看模型适配与状态边界

先读：

1. `src/services/api/client.ts`
2. `src/services/api/claude.ts`
3. `src/bootstrap/state.ts`
4. `src/types/message.ts`

这条路径回答“查询层如何和 Anthropic SDK 解耦、消息形态如何统一、状态分别落在哪一层”。

## 当前稳定能力域

```mermaid
mindmap
  root((Claude Code Annotated))
    入口装配
      CLI 快速路径
      Commander 主命令
      REPL 启动
    查询主循环
      query
      queryLoop
      Terminal reason
    工具编排
      ToolUseContext
      串行与并发批次
      tool_result 回灌
      GlobTool 首个真实实现
    工具函数
      路径展开与相对化
      当前工作目录管理
      文件系统操作抽象
      延迟 Schema 构建
      错误类型判断
    模型适配
      QueryDeps
      Anthropic client
      messages.create
    状态承载
      bootstrap state
      Message 类型
      REPL 本地状态
    权限体系
      类型定义与决策模型
      规则提取与匹配
      文件系统权限检查
      通配符模式匹配
    TUI 运行时
      Ink root
      renderAndRun
      App 包装层
```

## 当前实现边界

- 已实现的是最小主链路，不是完整 Claude Code 全量能力
- `query.ts` 保留了大量 TODO，占位于压缩、token budget、stop hooks、fallback 等增强能力
- 工具系统已具备类型边界、批次调度、结果回传框架和注册机制，GlobTool 已完成首个真实工具实现，`runToolUse()` 已升级为完整 5 步执行链路
- 工具函数层已实现路径处理、错误判断、文件操作抽象等基础设施
- glob 搜索当前为简化实现（Node.js fs 递归），待 ripgrep 集成后替换
- 权限系统已具备类型定义、规则提取、字符串解析、工具匹配和文件系统权限检查
- `App.tsx`、`query/transitions.ts`、`constants/querySource.ts`、`types/tools.ts` 仍以占位实现为主
- 文档结论只以当前仓库源码为准，不把目标仓库里尚未复刻的能力写进现状

## 文档导航

- `01-architecture-and-core-flow.md`：看整体分层、核心协作关系和阅读顺序
- `02-core-interaction-layer.md`：看 CLI、Commander、REPL 怎样接出最小交互闭环
- `03-query-engine-layer.md`：看 `queryLoop` 怎样推进一轮代理回合
- `04-tool-execution-layer.md`：看 `tool_use` 怎样分批、调度、回传 `tool_result`
- `05-api-client-layer.md`：看查询层怎样通过 `QueryDeps` 进入 Anthropic API 适配层
- `06-session-management-layer.md`：看进程态、查询态、消息态和 REPL 本地态如何分工
- `07-tui-rendering-layer.md`：看 Ink root、渲染辅助和终端界面如何装配
