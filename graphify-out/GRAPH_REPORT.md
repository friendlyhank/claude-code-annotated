# Graph Report - .  (2026-04-15)

## Corpus Check
- 30 files · ~12,383 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 91 nodes · 87 edges · 18 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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

## God Nodes (most connected - your core abstractions)
1. `executeUserInput()` - 3 edges
2. `main()` - 2 edges
3. `run()` - 2 edges
4. `renderAndRun()` - 2 edges
5. `gracefulShutdown()` - 2 edges
6. `exitWithError()` - 2 edges
7. `exitWithMessage()` - 2 edges
8. `getInitialState()` - 2 edges
9. `resetStateForTests_ONLY()` - 2 edges
10. `createUserTextMessage()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (2): getInitialState(), resetStateForTests_ONLY()

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (0): 

### Community 2 - "Community 2"
Cohesion: 0.32
Nodes (4): exitWithError(), exitWithMessage(), gracefulShutdown(), renderAndRun()

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (2): main(), run()

### Community 4 - "Community 4"
Cohesion: 0.25
Nodes (0): 

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (2): normalizeContentFromAPI(), toAssistantMessage()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): next(), returnValue()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.83
Nodes (3): createUserTextMessage(), executeUserInput(), handlePromptSubmit()

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 10`** (2 nodes): `handleMessageFromStream()`, `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `main()`, `cli.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `build.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._