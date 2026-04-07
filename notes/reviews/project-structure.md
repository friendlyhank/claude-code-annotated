# 项目结构导航

## 目录概览

```
src/
├── bootstrap/          # 应用启动与状态初始化
├── components/         # React/Ink UI 组件
├── entrypoints/        # CLI 入口点
├── screens/            # 屏幕级组件
├── types/              # TypeScript 类型定义
├── ink.ts              # Ink 渲染器适配
├── interactiveHelpers.tsx  # 交互式辅助函数
├── main.tsx            # 主逻辑入口
└── replLauncher.tsx    # REPL 启动器
```

---

## 核心文件

### `src/main.tsx`
主逻辑入口，负责命令行解析与 REPL 启动流程。

### `src/entrypoints/cli.tsx`
CLI 入口点，处理启动参数解析、快速路径判断、版本输出。

### `src/replLauncher.tsx`
REPL 启动器，初始化 REPL 循环并渲染 Ink 应用。

### `src/ink.ts`
Ink 渲染器适配层，提供终端渲染能力。

### `src/interactiveHelpers.tsx`
交互式辅助函数，处理用户输入和交互逻辑。

---

## 目录详解

### `src/bootstrap/`
应用启动与状态初始化。

| 文件 | 描述 |
|------|------|
| `state.ts` | 全局状态管理，应用初始化状态定义 |

### `src/components/`
React/Ink UI 组件库。

| 文件 | 描述 |
|------|------|
| `App.tsx` | 根组件，应用主容器 |

### `src/entrypoints/`
CLI 入口点模块。

| 文件 | 描述 |
|------|------|
| `cli.tsx` | 命令行入口，参数解析与启动调度 |

### `src/screens/`
屏幕级组件（完整页面）。

| 文件 | 描述 |
|------|------|
| `REPL.tsx` | REPL 主屏幕，交互循环界面 |

### `src/types/`
TypeScript 类型定义，统一类型系统。

| 文件 | 描述 |
|------|------|
| `index.ts` | 类型统一导出入口 |
| `global.d.ts` | 全局类型声明（MACRO、模块声明等） |
| `ids.ts` | 品牌类型 SessionId/AgentId |
| `message.ts` | 消息类型体系（50+ 类型） |
| `tools.ts` | 工具进度类型 |
| `utils.ts` | 工具类型（DeepImmutable、Permutations） |

---

## 类型系统架构

```
src/types/
│
├── index.ts          ← 统一导出入口
│   └── re-export from ids, message, tools, utils
│
├── global.d.ts       ← 全局声明（无需导入）
│   ├── MACRO 命名空间（构建时常量）
│   ├── 内部标识符（Anthropic 内部）
│   └── 模块声明（.md/.txt/.html/.css）
│
├── ids.ts            ← ID 类型
│   ├── SessionId     会话 ID（品牌类型）
│   └── AgentId       代理 ID（品牌类型）
│
├── message.ts        ← 消息类型体系
│   ├── Message       基础消息
│   ├── UserMessage   用户消息
│   ├── AssistantMessage  助手消息
│   ├── SystemMessage 系统消息
│   └── ... 50+ 类型
│
├── tools.ts          ← 工具进度类型
│   ├── ToolProgressData
│   ├── BashProgress
│   └── ...
│
└── utils.ts          ← 工具类型
    ├── DeepImmutable<T>
    └── Permutations<T>
```

---

## 数据流

```
用户输入
    │
    ▼
┌─────────────────┐
│ cli.tsx         │  解析参数
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ main.tsx        │  主逻辑调度
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ replLauncher.tsx│  启动 REPL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ screens/REPL.tsx│  REPL 界面
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ components/App  │  渲染 UI
└─────────────────┘
```

---

## 扩展规划

根据上游 `claude-code` 源码，后续需扩展的目录：

| 目录 | 描述 | 文件数（上游） |
|------|------|---------------|
| `src/tools/` | 工具实现 | 58 |
| `src/commands/` | 命令处理器 | 110 |
| `src/services/` | 服务层 | 42 |
| `src/utils/` | 工具函数 | 346 |
| `src/hooks/` | React Hooks | 88 |
| `src/bridge/` | 远程控制桥接 | 36 |

---

## 参考文档

- [项目总览](../00-overview.md)
- [路线图](../01-roadmap.md)
- [进度跟踪](../02-progress.md)
- [目标路径](../03-target-paths.md)
- [Ink REPL 框架](./ink-repl-framework.md)
- [TypeScript 类型系统](./typescript-type-system.md)
