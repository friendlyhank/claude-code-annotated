# Graph Report - .  (2026-04-17)

## Corpus Check
- 58 files · ~24,981 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 185 nodes · 189 edges · 29 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
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

## God Nodes (most connected - your core abstractions)
1. `GlobTool` - 10 edges
2. `getDenyRules` - 7 edges
3. `filterToolsByDenyRules` - 5 edges
4. `permissionRuleValueFromString` - 5 edges
5. `getAllBaseTools` - 4 edges
6. `toRelativePath` - 4 edges
7. `glob()` - 4 edges
8. `buildMcpToolName` - 4 edges
9. `getTools` - 3 edges
10. `assembleToolPool` - 3 edges

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

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (21): MCP Tool Naming Scheme, Permission Rule Resolution Flow, ToolPermissionContext, Agent Tool Disallow Lists, Tool Name Constants, buildMcpToolName, getToolNameForPermissionCheck, mcpInfoFromString (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (6): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun(), main(), run()

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (3): MaxFileReadTokenExceededError, getDefaultFileReadingLimits(), getEnvMaxTokens()

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (14): GlobTool, Path Token Optimization Strategy, Tool Registration Architecture, getCwd, hasEmbeddedSearchTools, isEnvTruthy, glob(), globToRegex() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (4): FileTooLargeError, readFileInRange(), readFileInRangeFast(), readFileInRangeStreaming()

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (2): createDefaultPermissionContext(), createReplToolUseContext()

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (2): getErrnoCode(), isENOENT()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

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
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): Graphify Knowledge Graph System, Graphify Output Directory

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

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

## Knowledge Gaps
- **11 isolated node(s):** `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy`, `lazySchema`, `Permission Rule Resolution Flow` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (2 nodes): `hasBinaryExtension()`, `files.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `semanticNumber()`, `semanticNumber.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `main()`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `Graphify Knowledge Graph System`, `Graphify Output Directory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `prompt.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `apiLimits.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GlobTool` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `ToolPermissionContext` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GlobTool` (e.g. with `createPlaceholderTool` and `hasEmbeddedSearchTools`) actually correct?**
  _`GlobTool` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getDenyRules` (e.g. with `Agent Tool Disallow Lists` and `getAllowRules`) actually correct?**
  _`getDenyRules` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._