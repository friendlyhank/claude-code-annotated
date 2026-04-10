1. 架构设计和核心流程
 - 启动主链路（`src/entrypoints/cli.tsx` -> `src/main.tsx` -> `src/replLauncher.tsx` -> `src/screens/REPL.tsx`）
 - 运行时分层（交互入口、查询引擎、工具编排、模型依赖、状态承载、TUI 渲染）
 - 主回合流程（用户输入 -> `query()` -> assistant 事件 -> `tool_use` 分支 -> 下一轮或终止）
 - 文档阅读路径（先 `overview`，再架构页，再按能力域下钻）

2. 交互入口与 REPL 驱动
 - CLI 快速路径与动态导入主模块
 - Commander 主命令与交互/非交互模式判定
 - `launchRepl()` 的装配职责
 - REPL 输入捕获、消息回写与最小 `query()` 接线

3. 查询引擎与状态推进
 - `QueryParams`、`State` 与跨轮次可变状态
 - `query()` / `queryLoop()` 的流式生成器边界
 - assistant 消息收集与 `tool_use` 检测
 - 中断、错误与终止原因返回

4. 工具编排与执行存根
 - `Tool` / `Tools` / `ToolUseContext` 类型边界
 - 工具注册匹配与 schema 校验
 - 串行/并发分批与上下文回放策略
 - `runToolUse()` 的最小 `tool_result` 回传实现

5. 模型调用与依赖注入
 - `QueryDeps` 抽象与 `productionDeps()` 工厂
 - `callModel` 当前 mock 流式实现
 - 模型调用参数如何从查询层透传

6. 会话与全局状态承载
 - `bootstrap/state.ts` 的全局会话态与交互态
 - `Message` 类型体系作为 transcript 载体
 - `ToolUseContext.messages` 与 `initialMessages` 的跨层传递

7. TUI 渲染与终端运行时
 - `ink.ts` 的 root/render 封装
 - `interactiveHelpers.tsx` 的渲染与退出流程
 - `App` 包装层与 `REPL` 终端界面
