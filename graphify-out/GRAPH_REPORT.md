# Graph Report - claude-code-annotated  (2026-04-27)

## Corpus Check
- 112 files · ~51,322 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 480 nodes · 820 edges · 18 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `logForDebugging()` - 18 edges
2. `getSystemPrompt()` - 9 edges
3. `getCwd()` - 9 edges
4. `computeSimpleEnvInfo()` - 8 edges
5. `exec()` - 8 edges
6. `EndTruncatingAccumulator` - 8 edges
7. `getFsImplementation()` - 8 edges
8. `getTools()` - 7 edges
9. `getPatchForEdits()` - 6 edges
10. `prependBullets()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `jsonStringify()` --calls--> `logForDebugging()`  [INFERRED]
  src/utils/slowOperations.ts → src/utils/debug.ts
- `getFileModificationTimeAsync()` --calls--> `getFsImplementation()`  [INFERRED]
  src/utils/file.ts → src/utils/fsOperations.ts
- `detectVcs()` --calls--> `getFsImplementation()`  [INFERRED]
  src/utils/platform.ts → src/utils/fsOperations.ts
- `buildTool()` --calls--> `createPlaceholderTool()`  [INFERRED]
  src/Tool.ts → src/tools.ts
- `normalizeFileEditInput()` --calls--> `expandPath()`  [INFERRED]
  src/tools/FileEditTool/utils.ts → src/utils/path.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (12): toAssistantMessage(), createUserTextMessage(), executeUserInput(), handlePromptSubmit(), ensureNonEmptyAssistantContent(), filterTrailingThinkingFromLastAssistant(), isThinkingBlock(), normalizeContentFromAPI() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (26): extractBaseCommand(), heuristicallyExtractBaseCommand(), interpretCommandResult(), getCwd(), pwd(), runWithCwdOverride(), execSyncWithDefaults_DEPRECATED(), main() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (33): createBufferedWriter(), registerCleanup(), getDebugLogPath(), getDebugWriter(), logAntError(), logForDebugging(), shouldLogDebugMessage(), extractDebugCategories() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): escapeForDiff(), getPatchForDisplay(), errorMessage(), getErrnoCode(), isENOENT(), ShellError, addLineNumbers(), convertLeadingTabsToSpaces() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (11): getProjectDir(), sanitizePath(), enableDebugLogging(), _clearLogWritersForTesting(), readFileForEdit(), detectEncodingForResolvedPath(), detectLineEndingsForString(), readFileSync() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (16): execFileNoThrow(), execFileNoThrowWithCwd(), addToInMemoryErrorLog(), attachErrorLogSink(), logError(), logMCPDebug(), logMCPError(), toError() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (9): callInner(), MaxFileReadTokenExceededError, formatFileSize(), getDefaultFileReadingLimits(), getEnvMaxTokens(), FileTooLargeError, readFileInRange(), readFileInRangeFast() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (12): AppStateProvider(), useAppState(), useAppStateStore(), useAppStore(), useSetAppState(), getDefaultAppState(), getFileReadIgnorePatterns(), normalizePatternsToPath() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (19): buildMcpToolName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), mcpInfoFromString(), normalizeNameForMCP(), escapeRuleContent(), findFirstUnescapedChar() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (15): computeSimpleEnvInfo(), getActionsSection(), getHooksSection(), getKnowledgeCutoff(), getMarketingNameForModel(), getOutputEfficiencySection(), getShellInfoLine(), getSimpleDoingTasksSection() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (7): execSync_DEPRECATED(), AntSlowLogger, buildDescription(), callerFrame(), jsonStringify(), addSlowOperation(), whichNodeSync()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (9): hasEmbeddedSearchTools(), isEnvTruthy(), assembleToolPool(), createPlaceholderTool(), filterToolsByDenyRules(), getAllBaseTools(), getMergedTools(), getTools() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (6): render(), exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun(), launchRepl()

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (5): getDefaultEditDescription(), getEditToolDescription(), getPreReadInstruction(), getWriteToolDescription(), isCompactLinePrefixEnabled()

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (5): handleEPIPE(), registerProcessOutputErrorHandlers(), writeOut(), writeToStderr(), writeToStdout()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (2): Graphify Knowledge Graph System, Graphify Output Directory

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

## Knowledge Gaps
- **3 isolated node(s):** `Graphify Knowledge Graph System`, `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (5 nodes): `lastX()`, `next()`, `returnValue()`, `toArray()`, `generators.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Graphify Knowledge Graph System`, `Graphify Output Directory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logForDebugging()` connect `Community 2` to `Community 10`, `Community 14`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `readFileForEdit()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `logForDebugging()` (e.g. with `.[Symbol.dispose]()` and `initSentry()`) actually correct?**
  _`logForDebugging()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `getCwd()` (e.g. with `resetCwdIfOutsideProject()` and `computeSimpleEnvInfo()`) actually correct?**
  _`getCwd()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `exec()` (e.g. with `pwd()` and `getOriginalCwd()`) actually correct?**
  _`exec()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify Knowledge Graph System`, `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._