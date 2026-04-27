# Graph Report - .  (2026-04-27)

## Corpus Check
- 113 files · ~51,322 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 605 nodes · 1432 edges · 19 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Tool Execution Core|Tool Execution Core]]
- [[_COMMUNITY_Logging and Debug|Logging and Debug]]
- [[_COMMUNITY_Tool Assembly|Tool Assembly]]
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_File Read Utils|File Read Utils]]
- [[_COMMUNITY_Shell and State|Shell and State]]
- [[_COMMUNITY_Bash and Edit Utils|Bash and Edit Utils]]
- [[_COMMUNITY_Filesystem Ops|Filesystem Ops]]
- [[_COMMUNITY_Platform and Ripgrep|Platform and Ripgrep]]
- [[_COMMUNITY_Permissions|Permissions]]
- [[_COMMUNITY_Slow Ops and Exec|Slow Ops and Exec]]
- [[_COMMUNITY_System Prompts|System Prompts]]
- [[_COMMUNITY_String Utils|String Utils]]
- [[_COMMUNITY_AGENTS.md Docs|AGENTS.md Docs]]
- [[_COMMUNITY_REPL Launcher|REPL Launcher]]
- [[_COMMUNITY_State Store|State Store]]
- [[_COMMUNITY_Tool Prompts|Tool Prompts]]
- [[_COMMUNITY_App Component|App Component]]
- [[_COMMUNITY_CLI Entry|CLI Entry]]

## God Nodes (most connected - your core abstractions)
1. `logForDebugging()` - 19 edges
2. `getSystemPrompt()` - 10 edges
3. `getCwd()` - 10 edges
4. `computeSimpleEnvInfo()` - 9 edges
5. `exec()` - 9 edges
6. `EndTruncatingAccumulator` - 9 edges
7. `getFsImplementation()` - 9 edges
8. `Claude Code CLI 复刻项目` - 9 edges
9. `getTools()` - 8 edges
10. `getPatchForEdits()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `createPlaceholderTool()` --calls--> `buildTool()`  [INFERRED]
  /Users/hank/tsproject/claude-code-annotated/src/tools.ts → /Users/hank/tsproject/claude-code-annotated/src/Tool.ts
- `getPatchForEdits()` --calls--> `convertLeadingTabsToSpaces()`  [INFERRED]
  /Users/hank/tsproject/claude-code-annotated/src/tools/FileEditTool/utils.ts → /Users/hank/tsproject/claude-code-annotated/src/utils/file.ts
- `getSnippetForPatch()` --calls--> `addLineNumbers()`  [INFERRED]
  /Users/hank/tsproject/claude-code-annotated/src/tools/FileEditTool/utils.ts → /Users/hank/tsproject/claude-code-annotated/src/utils/file.ts
- `normalizeFileEditInput()` --calls--> `expandPath()`  [INFERRED]
  /Users/hank/tsproject/claude-code-annotated/src/tools/FileEditTool/utils.ts → /Users/hank/tsproject/claude-code-annotated/src/utils/path.ts
- `normalizeFileEditInput()` --calls--> `readFileSync()`  [INFERRED]
  /Users/hank/tsproject/claude-code-annotated/src/tools/FileEditTool/utils.ts → /Users/hank/tsproject/claude-code-annotated/src/utils/fileRead.ts

## Hyperedges (group relationships)
- **技术栈组合** — agentsmd_bun, agentsmd_typescript, agentsmd_react_ink [EXTRACTED 1.00]
- **工具集组件** — agentsmd_file_read_tool, agentsmd_file_edit_tool, agentsmd_file_write_tool, agentsmd_glob_tool, agentsmd_bash_tool [EXTRACTED 1.00]
- **复刻原则要点** — agentsmd_source_truth, agentsmd_chinese_annotation [EXTRACTED 1.00]

## Communities

### Community 0 - "Tool Execution Core"
Cohesion: 0.07
Nodes (20): lastX(), next(), returnValue(), toArray(), createUserTextMessage(), executeUserInput(), handlePromptSubmit(), isWithheldMaxOutputTokens() (+12 more)

### Community 1 - "Logging and Debug"
Cohesion: 0.08
Nodes (36): registerCleanup(), runCleanupFunctions(), appendAsync(), enableDebugLogging(), flushDebugLogs(), getDebugLogPath(), getDebugWriter(), getHasFormattedOutput() (+28 more)

### Community 2 - "Tool Assembly"
Cohesion: 0.08
Nodes (31): embeddedSearchToolsBinaryPath(), hasEmbeddedSearchTools(), isEnvDefinedFalsy(), isEnvTruthy(), getToolUseSummary(), userFacingName(), checkReadPermissionForTool(), checkWritePermissionForTool() (+23 more)

### Community 3 - "API Client"
Cohesion: 0.07
Nodes (26): normalizeToolInput(), addCacheBreakpoints(), assistantMessageToMessageParam(), toAssistantMessage(), toolsToApiFormat(), updateUsage(), userMessageToMessageParam(), getAnthropicClient() (+18 more)

### Community 4 - "File Read Utils"
Cohesion: 0.08
Nodes (30): escapeForDiff(), getPatchForDisplay(), unescapeFromDiff(), addLineNumbers(), convertLeadingTabsToSpaces(), findSimilarFile(), getFileModificationTime(), getFileModificationTimeAsync() (+22 more)

### Community 5 - "Shell and State"
Cohesion: 0.09
Nodes (35): getCwd(), pwd(), runWithCwdOverride(), asAgentId(), asSessionId(), toAgentId(), main(), run() (+27 more)

### Community 6 - "Bash and Edit Utils"
Cohesion: 0.08
Nodes (33): isSearchOrReadBashCommand(), isSilentBashCommand(), DEFAULT_SEMANTIC(), extractBaseCommand(), heuristicallyExtractBaseCommand(), interpretCommandResult(), errorMessage(), getErrnoCode() (+25 more)

### Community 7 - "Filesystem Ops"
Cohesion: 0.12
Nodes (25): createBufferedWriter(), getProjectDir(), sanitizePath(), appendToLog(), _clearLogWritersForTesting(), createJsonlWriter(), extractServerMessage(), _flushLogWritersForTesting() (+17 more)

### Community 8 - "Platform and Ripgrep"
Cohesion: 0.13
Nodes (24): isInBundledMode(), isRunningWithBun(), execFileNoThrow(), execFileNoThrowWithCwd(), getErrorMessage(), addToInMemoryErrorLog(), attachErrorLogSink(), dateToFilename() (+16 more)

### Community 9 - "Permissions"
Cohesion: 0.15
Nodes (22): buildMcpToolName(), extractMcpToolDisplayName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), mcpInfoFromString(), normalizeNameForMCP(), escapeRuleContent() (+14 more)

### Community 10 - "Slow Ops and Exec"
Cohesion: 0.12
Nodes (15): execSyncWithDefaults_DEPRECATED(), execSync_DEPRECATED(), findExecutable(), AntSlowLogger, buildDescription(), callerFrame(), clone(), cloneDeep() (+7 more)

### Community 11 - "System Prompts"
Cohesion: 0.21
Nodes (18): getLocalISODate(), getSessionStartDate(), computeSimpleEnvInfo(), getActionsSection(), getHooksSection(), getKnowledgeCutoff(), getMarketingNameForModel(), getOutputEfficiencySection() (+10 more)

### Community 12 - "String Utils"
Cohesion: 0.15
Nodes (11): readFileForEdit(), capitalize(), countCharInString(), EndTruncatingAccumulator, escapeRegExp(), firstLineOf(), normalizeFullWidthDigits(), normalizeFullWidthSpace() (+3 more)

### Community 13 - "AGENTS.md Docs"
Cohesion: 0.13
Nodes (17): BashTool, 构建系统, Bun Runtime, 中文注释辅助学习, 开发命令, CLI入口点, FileEditTool, FileReadTool (+9 more)

### Community 14 - "REPL Launcher"
Cohesion: 0.23
Nodes (10): createRoot(), render(), exitWithError(), exitWithMessage(), getRenderContext(), gracefulShutdown(), gracefulShutdownSync(), renderAndRun() (+2 more)

### Community 15 - "State Store"
Cohesion: 0.32
Nodes (7): AppStateProvider(), useAppState(), useAppStateStore(), useAppStore(), useSetAppState(), getDefaultAppState(), createStore()

### Community 16 - "Tool Prompts"
Cohesion: 0.33
Nodes (6): getDefaultEditDescription(), getEditToolDescription(), getPreReadInstruction(), getWriteToolDescription(), isCompactLinePrefixEnabled(), renderPromptTemplate()

### Community 17 - "App Component"
Cohesion: 0.67
Nodes (1): App()

### Community 18 - "CLI Entry"
Cohesion: 0.67
Nodes (1): main()

## Knowledge Gaps
- **10 isolated node(s):** `TypeScript`, `Graphify知识图谱`, `开发命令`, `源码事实原则`, `中文注释辅助学习` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Component`** (3 nodes): `App()`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Entry`** (3 nodes): `main()`, `cli.tsx`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logForDebugging()` connect `Logging and Debug` to `Slow Ops and Exec`, `Filesystem Ops`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `readFileForEdit()` connect `String Utils` to `Tool Execution Core`, `Tool Assembly`, `Bash and Edit Utils`, `Filesystem Ops`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `logForDebugging()` (e.g. with `.[Symbol.dispose]()` and `initSentry()`) actually correct?**
  _`logForDebugging()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `getCwd()` (e.g. with `resetCwdIfOutsideProject()` and `computeSimpleEnvInfo()`) actually correct?**
  _`getCwd()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `exec()` (e.g. with `pwd()` and `getOriginalCwd()`) actually correct?**
  _`exec()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TypeScript`, `Graphify知识图谱`, `开发命令` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tool Execution Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._