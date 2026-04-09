# Claude Code Annotated - 项目总览

## Relevant source files

- `package.json`
- `build.ts`
- `src/main.tsx`
- `src/query.ts`
- `src/services/tools/toolOrchestration.ts`
- `src/services/tools/toolExecution.ts`
- `src/Tool.ts`
- `notes/reviews/core-features-breakdown.md`

## 项目定位

本仓库是 Claude Code 相关核心链路的源码复刻与注释化学习工程。  
文档体系采用“总览页 + 架构页 + 功能专题页”组织方式：总览页负责导航，架构页负责全局链路，专题页负责源码细节。

## 仓库目录与文件地图

> 目标：让读者快速知道文件在哪、做什么、下一步读哪里。  
> 下表按当前仓库实际文件整理（排除 `.git`、`node_modules`、构建产物）。

```text
.
├── src/
│   ├── main.tsx                                     # 主入口
│   ├── replLauncher.tsx                             # REPL 启动
│   ├── interactiveHelpers.tsx                       # 交互辅助
│   ├── ink.ts                                       # Ink 运行入口
│   ├── query.ts                                     # 查询主循环
│   ├── Tool.ts                                      # 工具系统核心类型
│   ├── bootstrap/
│   │   └── state.ts                                 # 启动态/全局状态
│   ├── entrypoints/
│   │   └── cli.tsx                                  # CLI 入口
│   ├── screens/
│   │   └── REPL.tsx                                 # REPL 屏幕
│   ├── components/
│   │   └── App.tsx                                  # 主 UI 组件
│   ├── query/
│   │   ├── deps.ts                                  # 查询依赖注入
│   │   └── transitions.ts                           # 循环状态转移类型
│   ├── services/
│   │   └── tools/
│   │       ├── toolOrchestration.ts                 # 工具编排
│   │       └── toolExecution.ts                     # 单工具执行入口
│   ├── hooks/
│   │   └── useCanUseTool.ts                         # 工具权限函数类型
│   ├── constants/
│   │   └── querySource.ts                           # 查询来源常量
│   ├── utils/
│   │   ├── generators.ts                            # AsyncGenerator 工具
│   │   └── systemPromptType.ts                      # 系统提示类型
│   └── types/
│       ├── index.ts
│       ├── ids.ts
│       ├── message.ts
│       ├── tools.ts
│       ├── utils.ts
│       └── global.d.ts
├── package.json
├── bun.lock
├── build.ts
└── tsconfig.json
```

## 阅读导航

- `第 1 步`：先读 `notes/reviews/01-architecture-and-core-flow.md` 建立全局链路。
- `第 2 步`：按 `core-features-breakdown.md` 的序号阅读 `02` 到 `07` 专题页。
- `第 3 步`：遇到某能力域问题时，回到对应专题页的 Relevant source files 定位代码。

## Wiki Navigation

- [01-architecture-and-core-flow](./01-architecture-and-core-flow.md)：理解系统分层、主流程和模块协作边界。
- [02-core-interaction-layer](./02-core-interaction-layer.md)：理解 CLI、REPL 与交互入口。
- [03-query-engine-layer](./03-query-engine-layer.md)：理解 queryLoop、状态流转、工具回灌。
- [04-tool-execution-layer](./04-tool-execution-layer.md)：理解工具分批调度、并发策略与执行入口。
- [05-api-client-layer](./05-api-client-layer.md)：理解模型调用与流式接口边界。
- [06-session-management-layer](./06-session-management-layer.md)：理解会话与全局状态承载。
- [07-tui-rendering-layer](./07-tui-rendering-layer.md)：理解终端渲染与交互反馈承载。
