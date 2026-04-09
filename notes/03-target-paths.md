# 目标路径清单

> 最后更新：2026-04-09

## 统计口径

| 指标 | 定义 |
|---|---|
| 目标文件代码数 | 目标源码文件的 tokei Code 列（排除注释和空行） |
| 累计复刻目标文件代码数 | Σ(复刻文件的 tokei Code 值) |
| 覆盖率 | 累计复刻目标文件代码数 / 目标文件代码数 |

> 注：使用 `tokei src/ --types TypeScript,TSX` 获取统计

## 阶段 1：最小闭环

### 入口文件

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/entrypoints/cli.tsx` | 308 | 15 | 5% |
| `src/main.tsx` | 6,603 | 128 | 2% |
| `src/entrypoints/init.ts` | - | 0 | 0% |
| `src/replLauncher.tsx` | 28 | 24 | 86% |
| `src/interactiveHelpers.tsx` | 473 | 65 | 14% |

### 核心状态

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/bootstrap/state.ts` | ~1,200 | 63 | 5% |
| `src/context.ts` | 189 | 0 | 0% |

### 核心类型

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/types/ids.ts` | 45 | 12 | 27% |
| `src/types/message.ts` | 180 | 151 | 84% |
| `src/types/tools.ts` | 12 | 11 | 92% |
| `src/types/utils.ts` | 8 | 2 | 25% |
| `src/types/global.d.ts` | 80 | 47 | 59% |
| `src/types/index.ts` | - | 65 | - |

### 渲染层

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/ink.ts` | 85 | 38 | 45% |
| `src/ink/root.ts` | ~150 | 0 | 0% |
| `src/components/App.tsx` | ~50 | 7 | 14% |
| `src/screens/REPL.tsx` | ~3,000 | 80 | 3% |

**阶段 1 小计**：~7,900 行目标，已复刻 708 行（纯代码）

## 阶段 2：核心查询引擎

### 代理循环核心

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/query.ts` | 1,732 | 226 | 13% |
| `src/QueryEngine.ts` | 1,320 | 0 | 0% |
| `src/query/deps.ts` | 39 | 21 | 54% |
| `src/query/transitions.ts` | 3 | 2 | 67% |
| `src/query/config.ts` | - | 0 | 0% |
| `src/query/stopHooks.ts` | - | 0 | 0% |
| `src/query/tokenBudget.ts` | - | 0 | 0% |

### 类型与常量

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/utils/systemPromptType.ts` | 15 | 6 | 40% |
| `src/constants/querySource.ts` | 3 | 1 | 33% |
| `src/hooks/useCanUseTool.ts` | - | 1 | - |

### 消息构建

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/utils/messages.ts` | 5,556 | 0 | 0% |

### 工具执行

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/services/tools/toolOrchestration.ts` | 170 | 170 | 100% |
| `src/services/tools/toolExecution.ts` | 1,486 | 70 | 5% |

### API 客户端

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/services/api/claude.ts` | 3,420 | 0 | 0% |
| `src/services/api/` (其他) | ~2,000 | 0 | 0% |

**阶段 2 小计**：~15,961 行目标

## 阶段 3：工具系统

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/Tool.ts` | 456 | 107 | 23% |
| `src/tools.ts` | 387 | 0 | 0% |
| `src/tools/BashTool/` | - | 0 | 0% |
| `src/tools/FileEditTool/` | - | 0 | 0% |
| `src/tools/GrepTool/` | - | 0 | 0% |
| `src/tools/GlobTool/` | - | 0 | 0% |
| `src/tools/ReadTool/` | - | 0 | 0% |
| `src/tools/WriteTool/` | - | 0 | 0% |

**阶段 3 小计**：~15,000+ 行

## 阶段 4：会话与状态管理

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/history.ts` | 464 | 0 | 0% |
| `src/state/` | - | 0 | 0% |
| `src/utils/config.ts` | - | 0 | 0% |
| `src/setup.ts` | 477 | 0 | 0% |

**阶段 4 小计**：~5,000+ 行

## 阶段 5：TUI 完善

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/ink.ts` | 85 | 38 | 45% |
| `src/ink/` | - | 0 | 0% |
| `src/components/` | - | 7 | - |
| `src/hooks/` | - | 0 | 0% |
| `src/keybindings/` | - | 0 | 0% |

**阶段 5 小计**：~50,000+ 行

## 阶段 6：扩展能力

| 目标文件路径 | 目标文件代码数 | 已复刻 | 覆盖率 |
|---|---:|---:|---:|
| `src/services/mcp/` | - | 0 | 0% |
| `src/bridge/` | - | 0 | 0% |
| `src/tools/AgentTool/` | - | 0 | 0% |
| `src/utils/model/` | - | 0 | 0% |

**阶段 6 小计**：~20,000+ 行

## 总计

| 指标 | 值 |
|---|---:|
| 目标文件代码数（总计） | 537,782 |
| 累计复刻目标文件代码数 | 1,247 |
| **覆盖率** | **0.23%** |

---

> 注：`-` 表示需要进一步统计的目录或未确认的文件
