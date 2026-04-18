# Graph Report - .  (2026-04-18)

## Corpus Check
- Corpus is ~25,414 words - fits in a single context window. You may not need a graph.

## Summary
- 240 nodes · 267 edges · 34 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Type System & IDs|Type System & IDs]]
- [[_COMMUNITY_Permission & Tool Access|Permission & Tool Access]]
- [[_COMMUNITY_Tool Utilities & Helpers|Tool Utilities & Helpers]]
- [[_COMMUNITY_App Lifecycle & Rendering|App Lifecycle & Rendering]]
- [[_COMMUNITY_File Read Operations|File Read Operations]]
- [[_COMMUNITY_Bootstrap State|Bootstrap State]]
- [[_COMMUNITY_Glob Tool & Search|Glob Tool & Search]]
- [[_COMMUNITY_File System Utilities|File System Utilities]]
- [[_COMMUNITY_Range File Reading|Range File Reading]]
- [[_COMMUNITY_Message Formatting|Message Formatting]]
- [[_COMMUNITY_Permission Rule Parsing|Permission Rule Parsing]]
- [[_COMMUNITY_API Client & Messages|API Client & Messages]]
- [[_COMMUNITY_Permission Rules Engine|Permission Rules Engine]]
- [[_COMMUNITY_MCP Tool Naming|MCP Tool Naming]]
- [[_COMMUNITY_API & JSON Utilities|API & JSON Utilities]]
- [[_COMMUNITY_Tool Execution Pipeline|Tool Execution Pipeline]]
- [[_COMMUNITY_Generator Utilities|Generator Utilities]]
- [[_COMMUNITY_User Input Handling|User Input Handling]]
- [[_COMMUNITY_Error Utilities|Error Utilities]]
- [[_COMMUNITY_Filesystem Permissions|Filesystem Permissions]]
- [[_COMMUNITY_File Type Detection|File Type Detection]]
- [[_COMMUNITY_Semantic Number Utils|Semantic Number Utils]]
- [[_COMMUNITY_App Component|App Component]]
- [[_COMMUNITY_CLI Entrypoint|CLI Entrypoint]]
- [[_COMMUNITY_Graph Report & Wiki|Graph Report & Wiki]]
- [[_COMMUNITY_Graphify System|Graphify System]]
- [[_COMMUNITY_Lazy Schema|Lazy Schema]]
- [[_COMMUNITY_Shell Rule Matching|Shell Rule Matching]]
- [[_COMMUNITY_Build System|Build System]]
- [[_COMMUNITY_Type Utilities|Type Utilities]]
- [[_COMMUNITY_Global Types|Global Types]]
- [[_COMMUNITY_Type Exports|Type Exports]]
- [[_COMMUNITY_API Limits|API Limits]]
- [[_COMMUNITY_Spinner Types|Spinner Types]]

## God Nodes (most connected - your core abstractions)
1. `GlobTool` - 10 edges
2. `getDenyRules` - 7 edges
3. `getTools()` - 6 edges
4. `filterToolsByDenyRules` - 5 edges
5. `permissionRuleValueFromString` - 5 edges
6. `permissionRuleValueFromString()` - 5 edges
7. `getAllBaseTools` - 4 edges
8. `toRelativePath` - 4 edges
9. `glob()` - 4 edges
10. `buildMcpToolName` - 4 edges

## Surprising Connections (you probably didn't know these)
- `createPlaceholderTool` --semantically_similar_to--> `GlobTool`  [INFERRED] [semantically similar]
  src/tools.ts → src/tools/GlobTool/GlobTool.ts
- `Agent Tool Disallow Lists` --conceptually_related_to--> `getDenyRules`  [INFERRED]
  src/constants/tools.ts → src/utils/permissions/permissions.ts
- `glob()` --semantically_similar_to--> `matchWildcardPattern`  [INFERRED] [semantically similar]
  src/utils/glob.ts → src/utils/permissions/shellRuleMatching.ts
- `getAllBaseTools` --references--> `Tool Name Constants`  [EXTRACTED]
  src/tools.ts → src/constants/tools.ts
- `getTools` --calls--> `isEnvTruthy`  [EXTRACTED]
  src/tools.ts → src/utils/envUtils.ts

## Hyperedges (group relationships)
- **Permission Checking Pipeline** — permissions_getDenyRules, permissions_getAllowRules, permissions_getAskRules, permissions_toolMatchesRule, permissions_getDenyRuleForTool, mcpStringUtils_getToolNameForPermissionCheck [INFERRED 0.85]
- **Tool Registration Flow** — tools_getAllBaseTools, tools_getTools, tools_filterToolsByDenyRules, tools_assembleToolPool, GlobTool, envUtils_hasEmbeddedSearchTools [INFERRED 0.85]
- **MCP Tool Name Ecosystem** — mcpStringUtils_mcpInfoFromString, mcpStringUtils_buildMcpToolName, mcpStringUtils_getToolNameForPermissionCheck, mcpStringUtils_normalizeNameForMCP, concept_mcpToolNamingScheme [INFERRED 0.80]

## Communities

### Community 0 - "Type System & IDs"
Cohesion: 0.1
Nodes (0): 

### Community 1 - "Permission & Tool Access"
Cohesion: 0.13
Nodes (21): MCP Tool Naming Scheme, Permission Rule Resolution Flow, ToolPermissionContext, Agent Tool Disallow Lists, Tool Name Constants, buildMcpToolName, getToolNameForPermissionCheck, mcpInfoFromString (+13 more)

### Community 2 - "Tool Utilities & Helpers"
Cohesion: 0.16
Nodes (9): hasEmbeddedSearchTools(), isEnvTruthy(), assembleToolPool(), createPlaceholderTool(), filterToolsByDenyRules(), getAllBaseTools(), getMergedTools(), getTools() (+1 more)

### Community 3 - "App Lifecycle & Rendering"
Cohesion: 0.15
Nodes (6): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun(), main(), run()

### Community 4 - "File Read Operations"
Cohesion: 0.14
Nodes (3): MaxFileReadTokenExceededError, getDefaultFileReadingLimits(), getEnvMaxTokens()

### Community 5 - "Bootstrap State"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 6 - "Glob Tool & Search"
Cohesion: 0.19
Nodes (14): GlobTool, Path Token Optimization Strategy, Tool Registration Architecture, getCwd, hasEmbeddedSearchTools, isEnvTruthy, glob(), globToRegex() (+6 more)

### Community 7 - "File System Utilities"
Cohesion: 0.16
Nodes (2): getCwd(), pwd()

### Community 8 - "Range File Reading"
Cohesion: 0.22
Nodes (4): FileTooLargeError, readFileInRange(), readFileInRangeFast(), readFileInRangeStreaming()

### Community 9 - "Message Formatting"
Cohesion: 0.25
Nodes (2): createDefaultPermissionContext(), createReplToolUseContext()

### Community 10 - "Permission Rule Parsing"
Cohesion: 0.36
Nodes (7): escapeRuleContent(), findFirstUnescapedChar(), findLastUnescapedChar(), normalizeLegacyToolName(), permissionRuleValueFromString(), permissionRuleValueToString(), unescapeRuleContent()

### Community 11 - "API Client & Messages"
Cohesion: 0.25
Nodes (0): 

### Community 12 - "Permission Rules Engine"
Cohesion: 0.36
Nodes (5): getAskRuleForTool(), getAskRules(), getDenyRuleForAgent(), getDenyRuleForTool(), getDenyRules()

### Community 13 - "MCP Tool Naming"
Cohesion: 0.43
Nodes (5): buildMcpToolName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), normalizeNameForMCP()

### Community 14 - "API & JSON Utilities"
Cohesion: 0.29
Nodes (0): 

### Community 15 - "Tool Execution Pipeline"
Cohesion: 0.33
Nodes (0): 

### Community 16 - "Generator Utilities"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 17 - "User Input Handling"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 18 - "Error Utilities"
Cohesion: 1.0
Nodes (2): getErrnoCode(), isENOENT()

### Community 19 - "Filesystem Permissions"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "File Type Detection"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Semantic Number Utils"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "App Component"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "CLI Entrypoint"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Graph Report & Wiki"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 25 - "Graphify System"
Cohesion: 1.0
Nodes (2): Graphify Knowledge Graph System, Graphify Output Directory

### Community 26 - "Lazy Schema"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Shell Rule Matching"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Build System"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Type Utilities"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Global Types"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Type Exports"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "API Limits"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Spinner Types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **11 isolated node(s):** `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy`, `lazySchema`, `Permission Rule Resolution Flow` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `File Type Detection`** (2 nodes): `hasBinaryExtension()`, `files.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Semantic Number Utils`** (2 nodes): `semanticNumber()`, `semanticNumber.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Component`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Entrypoint`** (2 nodes): `main()`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Graph Report & Wiki`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Graphify System`** (2 nodes): `Graphify Knowledge Graph System`, `Graphify Output Directory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lazy Schema`** (2 nodes): `lazySchema()`, `lazySchema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shell Rule Matching`** (2 nodes): `matchWildcardPattern()`, `shellRuleMatching.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build System`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Utilities`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global Types`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Limits`** (1 nodes): `apiLimits.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GlobTool` connect `Glob Tool & Search` to `Permission & Tool Access`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `ToolPermissionContext` connect `Permission & Tool Access` to `Glob Tool & Search`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GlobTool` (e.g. with `createPlaceholderTool` and `hasEmbeddedSearchTools`) actually correct?**
  _`GlobTool` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getDenyRules` (e.g. with `Agent Tool Disallow Lists` and `getAllowRules`) actually correct?**
  _`getDenyRules` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Type System & IDs` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Permission & Tool Access` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._