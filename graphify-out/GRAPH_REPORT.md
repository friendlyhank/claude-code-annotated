# Graph Report - .  (2026-04-15)

## Corpus Check
- Corpus is ~17,699 words - fits in a single context window. You may not need a graph.

## Summary
- 139 nodes · 145 edges · 32 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_启动状态管理|启动状态管理]]
- [[_COMMUNITY_查询引擎核心|查询引擎核心]]
- [[_COMMUNITY_工具注册机制|工具注册机制]]
- [[_COMMUNITY_权限规则解析|权限规则解析]]
- [[_COMMUNITY_TUI 运行时|TUI 运行时]]
- [[_COMMUNITY_权限规则匹配|权限规则匹配]]
- [[_COMMUNITY_消息格式化|消息格式化]]
- [[_COMMUNITY_MCP 名称处理|MCP 名称处理]]
- [[_COMMUNITY_API 消息归一化|API 消息归一化]]
- [[_COMMUNITY_工具执行编排|工具执行编排]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `getTools()` - 6 edges
2. `permissionRuleValueFromString()` - 5 edges
3. `getAllBaseTools()` - 4 edges
4. `normalizeNameForMCP()` - 4 edges
5. `buildMcpToolName()` - 4 edges
6. `createPlaceholderTool()` - 3 edges
7. `filterToolsByDenyRules()` - 3 edges
8. `assembleToolPool()` - 3 edges
9. `executeUserInput()` - 3 edges
10. `getDenyRules()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Knowledge Graph System` --references--> `_rebuild_code Function`  [EXTRACTED]
  AGENTS.md → graphify.watch
- `Graph Report (God Nodes and Community Structure)` --conceptually_related_to--> `Wiki Navigation Index`  [INFERRED]
  graphify-out/GRAPH_REPORT.md → graphify-out/wiki/index.md

## Communities

### Community 0 - "启动状态管理"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 1 - "查询引擎核心"
Cohesion: 0.18
Nodes (0): 

### Community 2 - "工具注册机制"
Cohesion: 0.38
Nodes (7): assembleToolPool(), createPlaceholderTool(), filterToolsByDenyRules(), getAllBaseTools(), getMergedTools(), getTools(), getToolsForDefaultPreset()

### Community 3 - "权限规则解析"
Cohesion: 0.36
Nodes (7): escapeRuleContent(), findFirstUnescapedChar(), findLastUnescapedChar(), normalizeLegacyToolName(), permissionRuleValueFromString(), permissionRuleValueToString(), unescapeRuleContent()

### Community 4 - "TUI 运行时"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 5 - "权限规则匹配"
Cohesion: 0.36
Nodes (5): getAskRuleForTool(), getAskRules(), getDenyRuleForAgent(), getDenyRuleForTool(), getDenyRules()

### Community 6 - "消息格式化"
Cohesion: 0.25
Nodes (0): 

### Community 7 - "MCP 名称处理"
Cohesion: 0.43
Nodes (5): buildMcpToolName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), normalizeNameForMCP()

### Community 8 - "API 消息归一化"
Cohesion: 0.29
Nodes (2): normalizeContentFromAPI(), toAssistantMessage()

### Community 9 - "工具执行编排"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (2): hasEmbeddedSearchTools(), isEnvTruthy()

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (2): main(), run()

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (3): Graphify Knowledge Graph System, Graphify Output Directory, _rebuild_code Function

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **3 isolated node(s):** `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`, `_rebuild_code Function`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (2 nodes): `replLauncher.tsx`, `launchRepl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `handleMessageFromStream()`, `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `systemPromptType.ts`, `asSystemPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `cli.tsx`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `tools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `querySource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `useCanUseTool.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `transitions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`, `_rebuild_code Function` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `启动状态管理` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._