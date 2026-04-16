# Graph Report - .  (2026-04-16)

## Corpus Check
- Corpus is ~19,612 words - fits in a single context window. You may not need a graph.

## Summary
- 214 nodes · 258 edges · 38 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_GlobTool 与工具注册|GlobTool 与工具注册]]
- [[_COMMUNITY_Tool 执行与查询|Tool 执行与查询]]
- [[_COMMUNITY_工具管理配置|工具管理配置]]
- [[_COMMUNITY_TUI 渲染层|TUI 渲染层]]
- [[_COMMUNITY_状态管理|状态管理]]
- [[_COMMUNITY_权限系统核心|权限系统核心]]
- [[_COMMUNITY_权限规则解析|权限规则解析]]
- [[_COMMUNITY_路径与文件系统|路径与文件系统]]
- [[_COMMUNITY_权限规则获取|权限规则获取]]
- [[_COMMUNITY_REPL 渲染|REPL 渲染]]
- [[_COMMUNITY_MCP 工具命名|MCP 工具命名]]
- [[_COMMUNITY_API 客户端|API 客户端]]
- [[_COMMUNITY_生成器工具|生成器工具]]
- [[_COMMUNITY_入口主函数|入口主函数]]
- [[_COMMUNITY_ID 类型|ID 类型]]
- [[_COMMUNITY_Prompt 处理|Prompt 处理]]
- [[_COMMUNITY_App 组件|App 组件]]
- [[_COMMUNITY_Graphify 集成|Graphify 集成]]
- [[_COMMUNITY_消息处理|消息处理]]
- [[_COMMUNITY_系统提示类型|系统提示类型]]
- [[_COMMUNITY_CLI 入口|CLI 入口]]
- [[_COMMUNITY_文档导航|文档导航]]
- [[_COMMUNITY_错误处理|错误处理]]
- [[_COMMUNITY_延迟 Schema|延迟 Schema]]
- [[_COMMUNITY_文件建议|文件建议]]
- [[_COMMUNITY_通配符匹配|通配符匹配]]
- [[_COMMUNITY_文件系统权限|文件系统权限]]
- [[_COMMUNITY_构建配置|构建配置]]
- [[_COMMUNITY_工具类型|工具类型]]
- [[_COMMUNITY_工具常量|工具常量]]
- [[_COMMUNITY_全局声明|全局声明]]
- [[_COMMUNITY_类型索引|类型索引]]
- [[_COMMUNITY_查询源|查询源]]
- [[_COMMUNITY_Spinner 组件|Spinner 组件]]
- [[_COMMUNITY_工具权限钩子|工具权限钩子]]
- [[_COMMUNITY_查询转换|查询转换]]
- [[_COMMUNITY_构建脚本|构建脚本]]
- [[_COMMUNITY_类型导出|类型导出]]

## God Nodes (most connected - your core abstractions)
1. `GlobTool` - 15 edges
2. `getDenyRules` - 7 edges
3. `getTools()` - 6 edges
4. `permissionRuleValueFromString()` - 5 edges
5. `glob()` - 5 edges
6. `filterToolsByDenyRules` - 5 edges
7. `permissionRuleValueFromString` - 5 edges
8. `ToolPermissionContext` - 5 edges
9. `getAllBaseTools()` - 4 edges
10. `normalizeNameForMCP()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `matchWildcardPattern` --semantically_similar_to--> `glob()`  [INFERRED] [semantically similar]
  src/utils/permissions/shellRuleMatching.ts → src/utils/glob.ts
- `GlobTool` --semantically_similar_to--> `createPlaceholderTool`  [INFERRED] [semantically similar]
  src/tools/GlobTool/GlobTool.ts → src/tools.ts
- `checkReadPermissionForTool` --semantically_similar_to--> `getDenyRuleForTool`  [INFERRED] [semantically similar]
  src/utils/permissions/filesystem.ts → src/utils/permissions/permissions.ts
- `Graphify Knowledge Graph System` --references--> `_rebuild_code Function`  [EXTRACTED]
  AGENTS.md → graphify.watch
- `assembleToolPool` --conceptually_related_to--> `Agent Tool Disallow Lists`  [INFERRED]
  src/tools.ts → src/constants/tools.ts

## Hyperedges (group relationships)
- **Permission Checking Pipeline** — permissions_getDenyRules, permissions_getAllowRules, permissions_getAskRules, permissions_toolMatchesRule, permissions_getDenyRuleForTool, mcpStringUtils_getToolNameForPermissionCheck [INFERRED 0.85]
- **Tool Registration Flow** — tools_getAllBaseTools, tools_getTools, tools_filterToolsByDenyRules, tools_assembleToolPool, GlobTool, envUtils_hasEmbeddedSearchTools [INFERRED 0.85]
- **MCP Tool Name Ecosystem** — mcpStringUtils_mcpInfoFromString, mcpStringUtils_buildMcpToolName, mcpStringUtils_getToolNameForPermissionCheck, mcpStringUtils_normalizeNameForMCP, concept_mcpToolNamingScheme [INFERRED 0.80]

## Communities

### Community 0 - "GlobTool 与工具注册"
Cohesion: 0.12
Nodes (25): GlobTool, Path Token Optimization Strategy, ToolPermissionContext, Tool Registration Architecture, Tool Name Constants, getCwd, hasEmbeddedSearchTools, isEnvTruthy (+17 more)

### Community 1 - "Tool 执行与查询"
Cohesion: 0.11
Nodes (0): 

### Community 2 - "工具管理配置"
Cohesion: 0.16
Nodes (9): hasEmbeddedSearchTools(), isEnvTruthy(), assembleToolPool(), createPlaceholderTool(), filterToolsByDenyRules(), getAllBaseTools(), getMergedTools(), getTools() (+1 more)

### Community 3 - "TUI 渲染层"
Cohesion: 0.21
Nodes (10): createRoot(), render(), exitWithError(), exitWithMessage(), getRenderContext(), gracefulShutdown(), gracefulShutdownSync(), renderAndRun() (+2 more)

### Community 4 - "状态管理"
Cohesion: 0.24
Nodes (14): getClientType(), getCwdState(), getInitialState(), getIsInteractive(), getIsNonInteractiveSession(), getOriginalCwd(), getSessionSource(), getTotalDuration() (+6 more)

### Community 5 - "权限系统核心"
Cohesion: 0.17
Nodes (15): MCP Tool Naming Scheme, Permission Rule Resolution Flow, Agent Tool Disallow Lists, buildMcpToolName, getToolNameForPermissionCheck, mcpInfoFromString, normalizeNameForMCP, escapeRuleContent (+7 more)

### Community 6 - "权限规则解析"
Cohesion: 0.36
Nodes (7): escapeRuleContent(), findFirstUnescapedChar(), findLastUnescapedChar(), normalizeLegacyToolName(), permissionRuleValueFromString(), permissionRuleValueToString(), unescapeRuleContent()

### Community 7 - "路径与文件系统"
Cohesion: 0.25
Nodes (2): getCwd(), pwd()

### Community 8 - "权限规则获取"
Cohesion: 0.36
Nodes (5): getAskRuleForTool(), getAskRules(), getDenyRuleForAgent(), getDenyRuleForTool(), getDenyRules()

### Community 9 - "REPL 渲染"
Cohesion: 0.25
Nodes (0): 

### Community 10 - "MCP 工具命名"
Cohesion: 0.43
Nodes (5): buildMcpToolName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), normalizeNameForMCP()

### Community 11 - "API 客户端"
Cohesion: 0.29
Nodes (2): normalizeContentFromAPI(), toAssistantMessage()

### Community 12 - "生成器工具"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 13 - "入口主函数"
Cohesion: 0.83
Nodes (2): main(), run()

### Community 14 - "ID 类型"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Prompt 处理"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 16 - "App 组件"
Cohesion: 0.67
Nodes (1): App()

### Community 17 - "Graphify 集成"
Cohesion: 0.67
Nodes (3): Graphify Knowledge Graph System, Graphify Output Directory, _rebuild_code Function

### Community 18 - "消息处理"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "系统提示类型"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "CLI 入口"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "文档导航"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 22 - "错误处理"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "延迟 Schema"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "文件建议"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "通配符匹配"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "文件系统权限"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "构建配置"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "工具类型"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "工具常量"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "全局声明"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "类型索引"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "查询源"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Spinner 组件"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "工具权限钩子"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "查询转换"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "构建脚本"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "类型导出"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **13 isolated node(s):** `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`, `_rebuild_code Function`, `createPlaceholderTool`, `isENOENT` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `消息处理`** (2 nodes): `handleMessageFromStream()`, `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `系统提示类型`** (2 nodes): `systemPromptType.ts`, `asSystemPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI 入口`** (2 nodes): `cli.tsx`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `文档导航`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `错误处理`** (2 nodes): `isENOENT()`, `errors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `延迟 Schema`** (2 nodes): `lazySchema()`, `lazySchema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `文件建议`** (2 nodes): `suggestPathUnderCwd()`, `file.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `通配符匹配`** (2 nodes): `matchWildcardPattern()`, `shellRuleMatching.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `文件系统权限`** (2 nodes): `checkReadPermissionForTool()`, `filesystem.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `构建配置`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `工具类型`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `工具常量`** (1 nodes): `tools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `全局声明`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `类型索引`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `查询源`** (1 nodes): `querySource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner 组件`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `工具权限钩子`** (1 nodes): `useCanUseTool.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `查询转换`** (1 nodes): `transitions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `构建脚本`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `类型导出`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDenyRules` connect `权限系统核心` to `GlobTool 与工具注册`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `getDenyRuleForTool` connect `权限系统核心` to `GlobTool 与工具注册`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GlobTool` (e.g. with `createPlaceholderTool` and `hasEmbeddedSearchTools`) actually correct?**
  _`GlobTool` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getDenyRules` (e.g. with `getAllowRules` and `getAskRules`) actually correct?**
  _`getDenyRules` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`, `_rebuild_code Function` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GlobTool 与工具注册` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Tool 执行与查询` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._