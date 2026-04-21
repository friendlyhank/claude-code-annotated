# Graph Report - .  (2026-04-21)

## Corpus Check
- Corpus is ~40,962 words - fits in a single context window. You may not need a graph.

## Summary
- 375 nodes · 437 edges · 49 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.7)
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
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `getTools()` - 6 edges
2. `getPatchForEdits()` - 5 edges
3. `getLogWriter()` - 5 edges
4. `permissionRuleValueFromString()` - 5 edges
5. `getAllBaseTools()` - 4 edges
6. `getPreReadInstruction()` - 4 edges
7. `getDefaultEditDescription()` - 4 edges
8. `readFileSyncWithMetadata()` - 4 edges
9. `logErrorImpl()` - 4 edges
10. `logForDebugging()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Graph Report (God Nodes and Community Structure)` --conceptually_related_to--> `Wiki Navigation Index`  [INFERRED]
  graphify-out/GRAPH_REPORT.md → graphify-out/wiki/index.md
- `getPreReadInstruction()` --calls--> `getWriteToolDescription()`  [EXTRACTED]
  src/tools/FileEditTool/prompt.ts → src/tools/FileWriteTool/prompt.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (8): getCwd(), pwd(), escapeForDiff(), getPatchForDisplay(), detectEncodingForResolvedPath(), detectLineEndingsForString(), readFileSync(), readFileSyncWithMetadata()

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (13): applyCurlyDoubleQuotes(), applyCurlySingleQuotes(), applyEditToFile(), areFileEditsEquivalent(), areFileEditsInputsEquivalent(), findActualString(), getPatchForEdit(), getPatchForEdits() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (11): getProjectDir(), sanitizePath(), appendToLog(), createJsonlWriter(), extractServerMessage(), getErrorsPath(), getLogWriter(), getMCPLogsPath() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (7): getDebugWriter(), logAntError(), logForDebugging(), shouldLogDebugMessage(), extractDebugCategories(), shouldShowDebugCategories(), shouldShowDebugMessage()

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (7): assembleToolPool(), createPlaceholderTool(), filterToolsByDenyRules(), getAllBaseTools(), getMergedTools(), getTools(), getToolsForDefaultPreset()

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (4): main(), run(), getInitialState(), resetStateForTests_ONLY()

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (3): extractBaseCommand(), heuristicallyExtractBaseCommand(), interpretCommandResult()

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (12): escapeRuleContent(), findFirstUnescapedChar(), findLastUnescapedChar(), normalizeLegacyToolName(), permissionRuleValueFromString(), permissionRuleValueToString(), unescapeRuleContent(), getAskRuleForTool() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (2): getErrorMessage(), logAPIError()

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (3): MaxFileReadTokenExceededError, getDefaultFileReadingLimits(), getEnvMaxTokens()

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (4): ensureNonEmptyAssistantContent(), filterTrailingThinkingFromLastAssistant(), isThinkingBlock(), normalizeMessagesForAPI()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (4): FileTooLargeError, readFileInRange(), readFileInRangeFast(), readFileInRangeStreaming()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (5): getDefaultEditDescription(), getEditToolDescription(), getPreReadInstruction(), getWriteToolDescription(), isCompactLinePrefixEnabled()

### Community 14 - "Community 14"
Cohesion: 0.31
Nodes (6): addToInMemoryErrorLog(), attachErrorLogSink(), logError(), logMCPDebug(), logMCPError(), toError()

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (3): exec(), findSuitableShell(), getShellConfig()

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (2): createDefaultPermissionContext(), createReplToolUseContext()

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (5): handleEPIPE(), registerProcessOutputErrorHandlers(), writeOut(), writeToStderr(), writeToStdout()

### Community 19 - "Community 19"
Cohesion: 0.43
Nodes (5): buildMcpToolName(), getMcpDisplayName(), getMcpPrefix(), getToolNameForPermissionCheck(), normalizeNameForMCP()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (3): getErrnoCode(), isENOENT(), ShellError

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): glob(), globToRegex()

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

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): Graphify Knowledge Graph System, Graphify Output Directory

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): Graph Report (God Nodes and Community Structure), Wiki Navigation Index

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **3 isolated node(s):** `Graphify Knowledge Graph System`, `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 27`** (2 nodes): `replLauncher.tsx`, `launchRepl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `hasBinaryExtension()`, `files.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `semanticNumber()`, `semanticNumber.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `semanticBoolean()`, `semanticBoolean.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `lazySchema()`, `lazySchema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `systemPromptType.ts`, `asSystemPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `matchWildcardPattern()`, `shellRuleMatching.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `cli.tsx`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `Graphify Knowledge Graph System`, `Graphify Output Directory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `tools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `querySource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `apiLimits.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `sdkUtilityTypes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `transitions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Graphify Knowledge Graph System`, `Graph Report (God Nodes and Community Structure)`, `Wiki Navigation Index` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._