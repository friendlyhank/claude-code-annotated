# 4.2 MCP 工具实现

## 概述

MCP（Model Context Protocol）工具实现为工具系统提供了外部工具集成能力。核心设计是：名称体系作为 MCP 与内置工具的边界，权限匹配通过全限定名隔离，注册流程通过 assembleToolPool 合并去重。当前 MCP 客户端连接尚未实现，已落地的是名称处理、权限匹配和注册框架。

## 关键源码

| 文件 | 职责 |
| --- | --- |
| `src/services/mcp/mcpStringUtils.ts` | MCP 名称解析/构建/规范化 |
| `src/tools.ts` | 工具注册：assembleToolPool/filterToolsByDenyRules/getMergedTools |
| `src/constants/tools.ts` | SYNTHETIC_OUTPUT_TOOL_NAME、ListMcpResources/ReadMcpResource 占位 |
| `src/utils/permissions/permissions.ts` | getDenyRuleForTool/toolMatchesRule（含 MCP 服务器级匹配） |
| `src/Tool.ts` | Tool 类型的 MCP 扩展：isMcp/mcpInfo/inputJSONSchema/mcpMeta |

## MCP 名称体系

### 命名格式

MCP 工具名格式：`mcp__{serverName}__{toolName}`

- `__`（双下划线）为分隔符
- `serverName` 和 `toolName` 都经过 `normalizeNameForMCP()` 规范化

### 核心函数

#### mcpInfoFromString()

（`mcpStringUtils.ts:50`）从字符串解析 MCP 信息：

```typescript
mcpInfoFromString('mcp__server__tool')
// => { serverName: 'server', toolName: 'tool' }

mcpInfoFromString('mcp__server')
// => { serverName: 'server', toolName: undefined }

mcpInfoFromString('Bash')
// => null（非 MCP 工具）
```

解析逻辑：按 `__` 分割，第一段必须为 `mcp`，第二段为 serverName，后续段合并为 toolName（保留 toolName 内部的双下划线）。

已知限制：serverName 包含 `__` 时解析会出错。

#### buildMcpToolName()

（`mcpStringUtils.ts:78`）构建完整 MCP 工具名，是 `mcpInfoFromString()` 的逆操作：

```typescript
buildMcpToolName('my server', 'read file')
// => 'mcp__my_server__read_file'
```

流程：`getMcpPrefix(serverName)` + `normalizeNameForMCP(toolName)`

#### getMcpPrefix()

（`mcpStringUtils.ts:69`）生成 MCP 工具名前缀：

```typescript
getMcpPrefix('my server')
// => 'mcp__my_server__'
```

#### getToolNameForPermissionCheck()

（`mcpStringUtils.ts:90`）返回权限规则匹配用的名称：

```typescript
getToolNameForPermissionCheck({ name: 'Bash', mcpInfo: undefined })
// => 'Bash'

getToolNameForPermissionCheck({ name: 'mcp__srv__tool', mcpInfo: { serverName: 'srv', toolName: 'tool' } })
// => 'mcp__srv__tool'
```

设计原因：MCP 工具使用全限定名匹配，确保针对内置工具（如 "Write"）的拒绝规则不会匹配到同名但无前缀的 MCP 替代工具。

### 名称规范化

#### normalizeNameForMCP()

（`mcpStringUtils.ts:28`）将名称规范化为 `^[a-zA-Z0-9_-]{1,64}$` 格式：

1. 将无效字符（非字母数字、非下划线、非连字符）替换为 `_`
2. 对 `claude.ai` 服务器（名称以 `"claude.ai "` 开头），额外合并连续下划线并去除首尾下划线
3. 防止规范化后的下划线干扰 `__` 分隔符

```typescript
normalizeNameForMCP('my server')
// => 'my_server'

normalizeNameForMCP('claude.ai my-server')
// => 'claude_ai_my_server'（合并连续下划线，去除首尾下划线）
```

#### 显示名提取

`getMcpDisplayName()`（`mcpStringUtils.ts:103`）：从完整 MCP 工具名中移除前缀，返回工具显示名。

`extractMcpToolDisplayName()`（`mcpStringUtils.ts:115`）：从用户面向名称中提取显示名：
1. 移除 `(MCP)` 后缀
2. 移除服务器前缀（`" - "` 之前的所有内容）

## Tool 类型的 MCP 扩展

`Tool` 接口（`src/Tool.ts`）中与 MCP 相关的属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `isMcp?` | `boolean` | MCP 工具标记 |
| `mcpInfo?` | `{ serverName: string; toolName: string }` | MCP 服务器与工具名元数据 |
| `inputJSONSchema?` | `ToolInputJSONSchema` | MCP 工具直接指定 JSON Schema，无需 Zod 转换 |
| `mcpMeta?`（在 ToolResult 中） | `{ _meta?: Record<string, unknown>; structuredContent?: Record<string, unknown> }` | MCP 协议元数据透传 |

设计原因：
- `isMcp` 标记：运行时区分 MCP 工具与内置工具，影响权限检查、UI 渲染
- `mcpInfo`：权限检查时通过 `getToolNameForPermissionCheck()` 构建全限定名
- `inputJSONSchema`：MCP 工具的 schema 由外部提供，直接透传绕过 Zod 转换
- `mcpMeta`：MCP 协议的 `structuredContent` 和 `_meta` 透传到 SDK 消费者

`ToolInputJSONSchema`（`src/Tool.ts:182`）定义：`{ [x: string]: unknown; type: 'object'; properties?: { [x: string]: unknown } }`

## MCP 工具注册

### 占位工具

`src/tools.ts` 中 MCP 相关的占位工具：

- `ListMcpResources` — 列出可用 MCP 资源
- `ReadMcpResource` — 读取 MCP 资源

这两个工具被标记为 `specialTools`，不在常规工具列表中展示：

```typescript
const specialTools = new Set([
  'ListMcpResources',
  'ReadMcpResource',
  SYNTHETIC_OUTPUT_TOOL_NAME,
])
```

### assembleToolPool()

（`src/tools.ts:278`）合并内置工具和 MCP 工具：

1. `getTools(permissionContext)` 获取内置工具
2. `filterToolsByDenyRules(mcpTools, permissionContext)` 过滤 MCP 工具中的拒绝列表
3. 内置工具和 MCP 工具各自按名称排序
4. `sortedBuiltIn.concat(sortedMcp)` → 按 name 去重（内置优先）

排序目的：内置工具保持连续前缀，确保 prompt cache 稳定。

去重策略：`Set<string>` 追踪已见名称，内置工具先入，同名 MCP 工具被忽略。

### getMergedTools()

（`src/tools.ts:318`）获取所有工具（内置 + MCP），不做排序和去重。用于 ToolSearch 阈值计算和 token 计数。

## MCP 权限匹配

### toolMatchesRule()

（`src/utils/permissions/permissions.ts:112`）工具级权限匹配逻辑：

1. 有 `ruleContent` 的规则不是整个工具级匹配（如 `Bash(prefix:*)`）
2. 使用 `getToolNameForPermissionCheck()` 获取全限定名
3. 直接工具名匹配：`rule.ruleValue.toolName === nameForRuleMatch`
4. MCP 服务器级匹配：
   - 规则 `"mcp__server1"` 匹配工具 `"mcp__server1__tool1"`
   - 通配符 `"mcp__server1__*"` 匹配 server1 的所有工具
   - 判断条件：`ruleInfo.toolName === undefined || ruleInfo.toolName === '*'` 且 `ruleInfo.serverName === toolInfo.serverName`

### filterToolsByDenyRules()

（`src/tools.ts:204`）泛型约束 `T extends { name, mcpInfo? }`，与 `getDenyRuleForTool()` 配合：

- 与运行时权限检查（`canUseTool`）使用相同的 `toolMatchesRule` 匹配器
- MCP server-prefix 规则在模型看到之前过滤掉该服务器的所有工具

## 权限规则解析

### permissionRuleValueFromString()

（`src/utils/permissions/permissionRuleParser.ts:94`）解析权限规则字符串：

格式：`"ToolName"` 或 `"ToolName(content)"`

解析逻辑：
1. 查找第一个未转义的 `(`
2. 查找最后一个未转义的 `)`
3. 右括号必须在末尾
4. 空内容或 `*` 视为工具级规则
5. 内容经过 `unescapeRuleContent()` 反转义

### 旧工具名别名

`LEGACY_TOOL_NAME_ALIASES`（`permissionRuleParser.ts:26`）：

| 旧名 | 当前名 |
| --- | --- |
| `Task` | `Agent` |
| `KillShell` | `TaskStop` |
| `AgentOutputTool` | `TaskOutput` |
| `BashOutputTool` | `TaskOutput` |

设计原因：工具重命名后，旧名称仍存在于用户持久化的权限规则中，必须能解析到当前规范名。

### 规则内容转义

`escapeRuleContent()` / `unescapeRuleContent()` 处理规则内容中的特殊字符：
- 转义顺序：`\` → `\\`，`(` → `\(`，`)` → `\)`
- 反转义顺序相反

## 权限规则来源

`PERMISSION_RULE_SOURCES`（`src/utils/permissions/permissions.ts:43`）定义 8 种遍历顺序：

```
userSettings → projectSettings → localSettings → flagSettings → policySettings → cliArg → command → session
```

`getAllowRules()` / `getDenyRules()` / `getAskRules()` 按 `PERMISSION_RULE_SOURCES` 顺序从 `ToolPermissionContext` 中提取规则，每条规则经过 `permissionRuleValueFromString()` 解析。

## 当前局限

1. **MCP 客户端连接未实现**：`mcpClients` / `mcpResources` 为 TODO 占位
2. **MCPProgress 类型为 any 桩**：`src/types/tools.ts` 中 `MCPProgress = any`
3. **MCP 流式处理未实现**：`mcp_tool_use` / `mcp_tool_result` 内容块识别与透传待实现
4. **ListMcpResources / ReadMcpResource 为占位工具**：通过 `createPlaceholderTool()` 创建
5. **inputJSONSchema 透传未实际使用**：当前 MCP 工具的 schema 注册仍走 Zod 路径
