# Graph Report - .  (2026-04-13)

## Corpus Check
- Corpus is ~11,171 words - fits in a single context window. You may not need a graph.

## Summary
- 92 nodes · 77 edges · 30 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_state  getInitialState|state / getInitialState]]
- [[_COMMUNITY_REPLx  REPLx|REPLx / REPLx]]
- [[_COMMUNITY_interactiveHelpersx  exitWithError|interactiveHelpersx / exitWithError]]
- [[_COMMUNITY_executeUserInput  handlePromptSubmit|executeUserInput / handlePromptSubmit]]
- [[_COMMUNITY_generators  next|generators / next]]
- [[_COMMUNITY_ids  asAgentId|ids / asAgentId]]
- [[_COMMUNITY_toolOrchestration  getMaxToolUseConcurr|toolOrchestration / getMaxToolUseConcurr]]
- [[_COMMUNITY_claude  normalizeMessageRole|claude / normalizeMessageRole]]
- [[_COMMUNITY_mainx  main|mainx / main]]
- [[_COMMUNITY_Tool  findToolByName|Tool / findToolByName]]
- [[_COMMUNITY_ink  createRoot|ink / createRoot]]
- [[_COMMUNITY_replLauncherx  launchRepl|replLauncherx / launchRepl]]
- [[_COMMUNITY_query  isWithheldMaxOutputTokens|query / isWithheldMaxOutputTokens]]
- [[_COMMUNITY_systemPromptType  asSystemPrompt|systemPromptType / asSystemPrompt]]
- [[_COMMUNITY_Appx  App|Appx / App]]
- [[_COMMUNITY_clix  main|clix / main]]
- [[_COMMUNITY_deps  productionDeps|deps / productionDeps]]
- [[_COMMUNITY_toolExecution  createToolResultMessage|toolExecution / createToolResultMessage]]
- [[_COMMUNITY_client  getAnthropicClient|client / getAnthropicClient]]
- [[_COMMUNITY_handleMessageFromStream  messages|handleMessageFromStream / messages]]
- [[_COMMUNITY_build|build]]
- [[_COMMUNITY_utils|utils]]
- [[_COMMUNITY_message|message]]
- [[_COMMUNITY_tools|tools]]
- [[_COMMUNITY_global.d|global.d]]
- [[_COMMUNITY_index|index]]
- [[_COMMUNITY_querySource|querySource]]
- [[_COMMUNITY_useCanUseTool|useCanUseTool]]
- [[_COMMUNITY_transitions|transitions]]
- [[_COMMUNITY_types|types]]

## God Nodes (most connected - your core abstractions)
1. `executeUserInput()` - 4 edges
2. `createUserTextMessage()` - 3 edges
3. `handlePromptSubmit()` - 3 edges
4. `main()` - 2 edges
5. `run()` - 2 edges
6. `renderAndRun()` - 2 edges
7. `gracefulShutdown()` - 2 edges
8. `exitWithError()` - 2 edges
9. `exitWithMessage()` - 2 edges
10. `getInitialState()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "state / getInitialState"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 1 - "REPLx / REPLx"
Cohesion: 0.31
Nodes (6): createMessageUUID(), createReplToolUseContext(), formatMessageContent(), getMessageColor(), getMessageLabel(), isTerminalWithReason()

### Community 2 - "interactiveHelpersx / exitWithError"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 3 - "executeUserInput / handlePromptSubmit"
Cohesion: 0.8
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 4 - "generators / next"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 5 - "ids / asAgentId"
Cohesion: 0.5
Nodes (0): 

### Community 6 - "toolOrchestration / getMaxToolUseConcurr"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "claude / normalizeMessageRole"
Cohesion: 0.5
Nodes (0): 

### Community 8 - "mainx / main"
Cohesion: 1.0
Nodes (2): main(), run()

### Community 9 - "Tool / findToolByName"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "ink / createRoot"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "replLauncherx / launchRepl"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "query / isWithheldMaxOutputTokens"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "systemPromptType / asSystemPrompt"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Appx / App"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "clix / main"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "deps / productionDeps"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "toolExecution / createToolResultMessage"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "client / getAnthropicClient"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "handleMessageFromStream / messages"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "build"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "utils"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "message"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "tools"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "global.d"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "index"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "querySource"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "useCanUseTool"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "transitions"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `replLauncherx / launchRepl`** (2 nodes): `replLauncher.tsx`, `launchRepl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `query / isWithheldMaxOutputTokens`** (2 nodes): `query.ts`, `isWithheldMaxOutputTokens()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `systemPromptType / asSystemPrompt`** (2 nodes): `systemPromptType.ts`, `asSystemPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Appx / App`** (2 nodes): `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `clix / main`** (2 nodes): `cli.tsx`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `deps / productionDeps`** (2 nodes): `deps.ts`, `productionDeps()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `toolExecution / createToolResultMessage`** (2 nodes): `toolExecution.ts`, `createToolResultMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `client / getAnthropicClient`** (2 nodes): `client.ts`, `getAnthropicClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `handleMessageFromStream / messages`** (2 nodes): `handleMessageFromStream()`, `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `build`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `utils`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `message`** (1 nodes): `message.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tools`** (1 nodes): `tools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `global.d`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `querySource`** (1 nodes): `querySource.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useCanUseTool`** (1 nodes): `useCanUseTool.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `transitions`** (1 nodes): `transitions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `state / getInitialState` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._