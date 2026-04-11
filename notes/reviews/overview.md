# Claude Code Annotated

## Relevant source files
- `package.json`
- `build.ts`
- `src/entrypoints/cli.tsx`
- `src/main.tsx`
- `src/query.ts`
- `src/Tool.ts`
- `notes/reviews/core-features-breakdown.md`

本仓库是 `Claude Code` 主链路的复刻与注释化学习工程，当前重点覆盖 CLI 入口、REPL 交互、`query()` 代理循环、工具编排、最小 API 适配层和终端渲染这几条最核心链路。它运行在 `Bun + TypeScript` 上，终端 UI 基于 `Ink`，构建入口是 `src/entrypoints/cli.tsx`，运行时主入口落在 `src/main.tsx`。目前仓库还处于增量对齐阶段，因此文档只记录已经被当前源码证实的能力，不把上游完整特性提前写成已实现。

## Architecture and Runtime

- 仓库形态：单包 TypeScript 工程，源码集中在 `src/`
- 运行时：`bun` 执行与打包，`tsc --noEmit` 做类型检查
- 交互方式：CLI 启动后进入 Ink 驱动的 REPL
- 主链路：输入先进入交互层，再交给 `query()` 驱动代理回合，需要工具时转入工具编排层

## 仓库目录地图

```text
.
├── src/
│   ├── entrypoints/
│   │   └── cli.tsx                  # CLI 快速路径与动态导入入口
│   ├── bootstrap/
│   │   └── state.ts                 # 全局启动状态、交互态与 cwd 状态
│   ├── components/
│   │   └── App.tsx                  # 顶层包装组件
│   ├── constants/
│   │   └── querySource.ts           # 查询来源类型存根
│   ├── hooks/
│   │   └── useCanUseTool.ts         # 工具权限检查函数类型
│   ├── query/
│   │   ├── deps.ts                  # query 依赖注入工厂
│   │   └── transitions.ts           # query 终止/继续类型存根
│   ├── screens/
│   │   └── REPL.tsx                 # REPL 输入、消息回写与 query 接线
│   ├── services/
│   │   ├── api/
│   │   │   ├── claude.ts            # 消息归一化与 Anthropic 最小调用边界
│   │   │   └── client.ts            # Anthropic SDK 客户端创建与缓存
│   │   └── tools/
│   │       ├── toolExecution.ts     # 单个 tool_use 的最小执行入口
│   │       └── toolOrchestration.ts # 工具分批、串并行调度与上下文汇总
│   ├── types/
│   │   ├── global.d.ts              # 全局类型声明
│   │   ├── ids.ts                   # ID 相关类型
│   │   ├── index.ts                 # 类型出口
│   │   ├── message.ts               # transcript 与流事件相关类型
│   │   ├── tools.ts                 # 工具进度类型存根
│   │   └── utils.ts                 # 工具类型辅助
│   ├── utils/
│   │   ├── generators.ts            # AsyncGenerator 并发与收集工具
│   │   └── systemPromptType.ts      # SystemPrompt branded type
│   ├── Tool.ts                      # Tool、Tools、ToolUseContext 等核心类型
│   ├── ink.ts                       # Ink root/render 封装与组件导出
│   ├── interactiveHelpers.tsx       # 渲染运行、退出与 render context
│   ├── main.tsx                     # Commander 主命令与 REPL 启动
│   ├── query.ts                     # 代理主循环
│   └── replLauncher.tsx             # App + REPL 组合与启动
├── build.ts                         # Bun.build 构建脚本
├── package.json                     # 依赖、脚本、bin 配置
├── bun.lock
└── tsconfig.json
```

## 文件定位建议

- 想看程序从哪里启动：先读 `src/entrypoints/cli.tsx`、`src/main.tsx`
- 想看输入如何进入代理循环：读 `src/screens/REPL.tsx`、`src/query.ts`
- 想看模型请求如何进入真实 API 适配层：读 `src/query/deps.ts`、`src/services/api/`
- 想看工具调用如何被执行：读 `src/services/tools/`
- 想看终端 UI 如何挂载：读 `src/ink.ts`、`src/interactiveHelpers.tsx`
- 想看全局状态和 transcript 类型：读 `src/bootstrap/state.ts`、`src/types/message.ts`

## Wiki Navigation

- [01-architecture-and-core-flow](./01-architecture-and-core-flow.md)：先建立系统分层、主链路和阅读顺序。
- [02-core-interaction-layer](./02-core-interaction-layer.md)：看 CLI、REPL 和 `query()` 入口如何接线。
- [03-query-engine-layer](./03-query-engine-layer.md)：看 `queryLoop` 如何推进一轮代理回合。
- [04-tool-execution-layer](./04-tool-execution-layer.md)：看 `tool_use` 如何被分批、调度和回传。
- [05-api-client-layer](./05-api-client-layer.md)：看 `QueryDeps` 如何接入最小真实 API 适配层。
- [06-session-management-layer](./06-session-management-layer.md)：看全局状态、消息历史和跨层上下文承载。
- [07-tui-rendering-layer](./07-tui-rendering-layer.md)：看 Ink 运行时、渲染辅助与终端界面装配。
