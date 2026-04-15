# Graph Report - .  (2026-04-15)

## Corpus Check
- Corpus is ~14,675 words - fits in a single context window. You may not need a graph.

## Summary
- 103 nodes · 100 edges · 19 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Query Engine & Tool System|Query Engine & Tool System]]
- [[_COMMUNITY_State Management|State Management]]
- [[_COMMUNITY_Entry Points & Rendering|Entry Points & Rendering]]
- [[_COMMUNITY_Interactive Helpers|Interactive Helpers]]
- [[_COMMUNITY_REPL Screen|REPL Screen]]
- [[_COMMUNITY_API Client Layer|API Client Layer]]
- [[_COMMUNITY_Graphify Documentation|Graphify Documentation]]
- [[_COMMUNITY_Tool Execution|Tool Execution]]
- [[_COMMUNITY_Generator Utilities|Generator Utilities]]
- [[_COMMUNITY_ID Types|ID Types]]
- [[_COMMUNITY_Prompt Handling|Prompt Handling]]
- [[_COMMUNITY_Message Handling|Message Handling]]
- [[_COMMUNITY_App Component|App Component]]
- [[_COMMUNITY_CLI Entrypoint|CLI Entrypoint]]
- [[_COMMUNITY_Build Script|Build Script]]
- [[_COMMUNITY_Type Utils|Type Utils]]
- [[_COMMUNITY_Global Types|Global Types]]
- [[_COMMUNITY_Type Index|Type Index]]
- [[_COMMUNITY_Spinner Types|Spinner Types]]

## God Nodes (most connected - your core abstractions)
1. `AGENTS.md Configuration File` - 5 edges
2. `executeUserInput()` - 3 edges
3. `Knowledge Graph` - 3 edges
4. `Graph Report (God Nodes & Community Structure)` - 3 edges
5. `main()` - 2 edges
6. `run()` - 2 edges
7. `renderAndRun()` - 2 edges
8. `gracefulShutdown()` - 2 edges
9. `exitWithError()` - 2 edges
10. `exitWithMessage()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Query Engine & Tool System"
Cohesion: 0.12
Nodes (0): 

### Community 1 - "State Management"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 2 - "Entry Points & Rendering"
Cohesion: 0.29
Nodes (2): main(), run()

### Community 3 - "Interactive Helpers"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 4 - "REPL Screen"
Cohesion: 0.25
Nodes (0): 

### Community 5 - "API Client Layer"
Cohesion: 0.29
Nodes (2): normalizeContentFromAPI(), toAssistantMessage()

### Community 6 - "Graphify Documentation"
Cohesion: 0.32
Nodes (8): AGENTS.md Configuration File, Graph Report (God Nodes & Community Structure), Code Rebuild Function (graphify.watch), Community Structure Concept, God Nodes Concept, Graphify Knowledge Graph System, Knowledge Graph, Wiki Navigation Index

### Community 7 - "Tool Execution"
Cohesion: 0.33
Nodes (0): 

### Community 8 - "Generator Utilities"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 9 - "ID Types"
Cohesion: 0.5
Nodes (0): 

### Community 10 - "Prompt Handling"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 11 - "Message Handling"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "App Component"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "CLI Entrypoint"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Build Script"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Type Utils"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Global Types"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Type Index"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Spinner Types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **3 isolated node(s):** `Wiki Navigation Index`, `God Nodes Concept`, `Community Structure Concept`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Message Handling`** (2 nodes): `handleMessageFromStream()`, `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Component`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Entrypoint`** (2 nodes): `main()`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build Script`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Utils`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global Types`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `Graph Report (God Nodes & Community Structure)` (e.g. with `God Nodes Concept` and `Community Structure Concept`) actually correct?**
  _`Graph Report (God Nodes & Community Structure)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Wiki Navigation Index`, `God Nodes Concept`, `Community Structure Concept` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Query Engine & Tool System` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `State Management` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._