# Graph Report - .  (2026-04-17)

## Corpus Check
- 50 files · ~20,572 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 146 nodes · 158 edges · 23 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.82)
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

## God Nodes (most connected - your core abstractions)
1. `GlobTool` - 15 edges
2. `getDenyRules` - 7 edges
3. `filterToolsByDenyRules` - 5 edges
4. `permissionRuleValueFromString` - 5 edges
5. `getAllBaseTools` - 4 edges
6. `ToolPermissionContext` - 4 edges
7. `expandPath` - 4 edges
8. `toRelativePath` - 4 edges
9. `getCwd` - 4 edges
10. `glob()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `createPlaceholderTool` --semantically_similar_to--> `GlobTool`  [INFERRED] [semantically similar]
  src/tools.ts → src/tools/GlobTool/GlobTool.ts
- `getDenyRuleForTool` --semantically_similar_to--> `checkReadPermissionForTool`  [INFERRED] [semantically similar]
  src/utils/permissions/permissions.ts → src/utils/permissions/filesystem.ts
- `GlobTool` --conceptually_related_to--> `hasEmbeddedSearchTools`  [INFERRED]
  src/tools/GlobTool/GlobTool.ts → src/utils/envUtils.ts
- `Agent Tool Disallow Lists` --conceptually_related_to--> `getDenyRules`  [INFERRED]
  src/constants/tools.ts → src/utils/permissions/permissions.ts
- `glob()` --semantically_similar_to--> `matchWildcardPattern`  [INFERRED] [semantically similar]
  src/utils/glob.ts → src/utils/permissions/shellRuleMatching.ts

## Hyperedges (group relationships)
- **Permission Checking Pipeline** — permissions_getDenyRules, permissions_getAllowRules, permissions_getAskRules, permissions_toolMatchesRule, permissions_getDenyRuleForTool, mcpStringUtils_getToolNameForPermissionCheck [INFERRED 0.85]
- **Tool Registration Flow** — tools_getAllBaseTools, tools_getTools, tools_filterToolsByDenyRules, tools_assembleToolPool, GlobTool, envUtils_hasEmbeddedSearchTools [INFERRED 0.85]
- **MCP Tool Name Ecosystem** — mcpStringUtils_mcpInfoFromString, mcpStringUtils_buildMcpToolName, mcpStringUtils_getToolNameForPermissionCheck, mcpStringUtils_normalizeNameForMCP, concept_mcpToolNamingScheme [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (17): Permission Rule Resolution Flow, Tool Registration Architecture, Agent Tool Disallow Lists, Tool Name Constants, hasEmbeddedSearchTools, isEnvTruthy, escapeRuleContent, normalizeLegacyToolName (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (16): GlobTool, Path Token Optimization Strategy, ToolPermissionContext, getCwd, isENOENT, FILE_NOT_FOUND_CWD_NOTE, suggestPathUnderCwd, checkReadPermissionForTool (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 4 - "Community 4"
Cohesion: 0.25
Nodes (2): createDefaultPermissionContext(), createReplToolUseContext()

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (2): main(), run()

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (7): MCP Tool Naming Scheme, buildMcpToolName, getToolNameForPermissionCheck, mcpInfoFromString, normalizeNameForMCP, getDenyRuleForTool, toolMatchesRule

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 12 - "Community 12"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (2): Graphify Knowledge Graph System, Graphify Output Directory

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
Nodes (0): 

## Knowledge Gaps
- **13 isolated node(s):** `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy`, `isENOENT`, `lazySchema` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `main()`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `Graphify Knowledge Graph System`, `Graphify Output Directory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `prompt.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GlobTool` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getDenyRules` connect `Community 1` to `Community 9`, `Community 2`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `getDenyRuleForTool` connect `Community 9` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GlobTool` (e.g. with `createPlaceholderTool` and `hasEmbeddedSearchTools`) actually correct?**
  _`GlobTool` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getDenyRules` (e.g. with `Agent Tool Disallow Lists` and `getAllowRules`) actually correct?**
  _`getDenyRules` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `createPlaceholderTool`, `Tool Registration Architecture`, `Path Token Optimization Strategy` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._