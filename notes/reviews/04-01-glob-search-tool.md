# 4.1 Glob 搜索工具实现

## 概述

GlobTool 是第一个完整实现的工具，标志着工具系统从"类型框架完整，执行未满"进入"真实能力落地"阶段。它实现了文件名模式匹配搜索，只读且并发安全。

## 关键源码

| 文件 | 职责 |
| --- | --- |
| `src/tools/GlobTool/GlobTool.ts` | GlobTool 完整实现 |
| `src/tools/GlobTool/prompt.ts` | 名称与描述常量 |
| `src/utils/glob.ts` | glob 文件搜索核心函数 |
| `src/utils/lazySchema.ts` | 延迟 Schema 构建工厂 |
| `src/utils/path.ts` | expandPath / toRelativePath |
| `src/utils/cwd.ts` | getCwd / runWithCwdOverride |
| `src/utils/errors.ts` | isENOENT |
| `src/utils/file.ts` | suggestPathUnderCwd / FILE_NOT_FOUND_CWD_NOTE |
| `src/utils/fsOperations.ts` | getFsImplementation |
| `src/utils/permissions/filesystem.ts` | checkReadPermissionForTool |
| `src/utils/permissions/shellRuleMatching.ts` | matchWildcardPattern |

## 设计原理

### 1. buildTool 工厂模式的完整落地

GlobTool 通过 `buildTool()` 完整实现了 Tool 接口的所有关键方法：

| 方法 | 实现 | 设计意图 |
| --- | --- | --- |
| `call()` | 执行 glob 搜索 | 核心业务逻辑 |
| `validateInput()` | 验证路径存在且为目录 | 边界防护，避免无效调用 |
| `checkPermissions()` | 委托 `checkReadPermissionForTool` | 只读工具统一权限入口 |
| `getPath()` | 路径展开 | 统一路径处理入口 |
| `preparePermissionMatcher()` | 通配符模式匹配 | 支持 `Bash(prefix:*)` 类规则 |

GlobTool 同时覆盖了 `isConcurrencySafe() → true`、`isReadOnly() → true`、`isSearchOrReadCommand() → { isSearch: true }`、`toAutoClassifierInput()`、`extractSearchText()` 等行为标记方法，是 buildTool 工厂模式的参考实现。

### 2. 延迟 Schema 构建

`lazySchema()` 延迟 Zod schema 构建（`src/utils/lazySchema.ts:6`）：

```typescript
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
```

优势：
- 避免模块初始化时的 schema 构建开销
- 支持按需加载，减少启动时间
- 与 buildTool 工厂模式配合，确保 schema 只在首次访问时构建

GlobTool 的 `inputSchema` 和 `outputSchema` 均通过 `lazySchema()` 包装。

### 3. 路径相对化策略

`toRelativePath()`（`src/utils/path.ts:58`）将绝对路径转为相对路径：
- 基于 `getCwd()` 计算相对路径
- 若路径不在 cwd 下（`relative()` 结果以 `..` 开头或为绝对路径），返回原始绝对路径
- 目的：节省 token（相对路径比绝对路径短）

`expandPath()`（`src/utils/path.ts:23`）展开路径：
- `~` 和 `~/...` 展开为家目录
- 相对路径基于 `baseDir ?? getCwd()` 解析
- 输出始终为绝对路径，经过 `normalize()` + `NFC` 规范化

### 4. 工作目录管理

`getCwd()`（`src/utils/cwd.ts:34`）支持 `AsyncLocalStorage` 覆盖：
- `cwdOverrideStorage` 存储覆盖值
- `pwd()` 优先取 `AsyncLocalStorage` 中的值，其次取全局状态
- `runWithCwdOverride()` 在覆盖 cwd 下运行函数（多代理场景）

## 输入验证：三层边界防护

`validateInput()`（`src/tools/GlobTool/GlobTool.ts:145`）实现三层防护：

1. **UNC 路径安全检查**：路径以 `\\` 或 `//` 开头时直接返回 `{ result: true }`，跳过文件系统操作，防止 NTLM 凭据泄露
2. **目录存在性检查**：`fs.stat()` 失败 + `isENOENT()` 为真时，返回错误信息 + `suggestPathUnderCwd()` 建议路径
3. **目录类型检查**：`stats.isDirectory()` 为假时返回 `{ result: false, message, errorCode: 2 }`

`isENOENT()`（`src/utils/errors.ts:24`）从错误对象提取 errno code 并判断是否为 `ENOENT`。

`suggestPathUnderCwd()`（`src/utils/file.ts:63`）当前返回 `null`（TODO：待完整模糊匹配实现）。

## 搜索核心实现

### glob() 函数

`glob()`（`src/utils/glob.ts:27`）当前为简化实现，签名：

```typescript
async function glob(
  filePattern: string,
  cwd: string,
  { limit, offset }: { limit: number; offset: number },
  _abortSignal: AbortSignal,
  _toolPermissionContext: ToolPermissionContext,
): Promise<{ files: string[]; truncated: boolean }>
```

实现逻辑：
1. `globToRegex()` 将 glob 模式转为正则
2. `walk()` 递归遍历目录：
   - 跳过 `.git` 和 `node_modules` 目录
   - 计算相对路径用于模式匹配
   - 匹配文件加入结果列表
   - 结果超过 `offset + limit + 100` 时提前停止
3. 截断：`allFiles.length > offset + limit` 时 `truncated = true`
4. 返回 `allFiles.slice(offset, offset + limit)`

### globToRegex() 模式转换

`globToRegex()`（`src/utils/glob.ts:88`）规则：
- `**` → `.*`（匹配任意路径，包括分隔符）
- `*` → `[^/]*`（匹配非路径分隔符）
- `?` → `[^/]`（匹配单个非路径分隔符）
- 大小写不敏感（`'i'` flag）

## 结果映射

### call() 执行流程

`call()`（`src/tools/GlobTool/GlobTool.ts:207`）：

1. 记录开始时间
2. 从 `globLimits?.maxResults ?? 100` 获取 limit
3. 调用 `glob()` 获取 `{ files, truncated }`
4. `files.map(toRelativePath)` 路径相对化
5. 构造 `Output`：`{ filenames, durationMs, numFiles, truncated }`
6. 返回 `{ data: output }`

### mapToolResultToToolResultBlockParam()

（`src/tools/GlobTool/GlobTool.ts:230`）：
- 无匹配文件时返回 `'No files found'`
- 有匹配时拼接文件路径（每行一个）
- `truncated` 为真时追加 `'(Results are truncated. Consider using a more specific path or pattern.)'`

### extractSearchText()

`extractSearchText()` 返回 `filenames.join('\n')`，供搜索索引使用。

## 权限检查

`checkPermissions()`（`src/tools/GlobTool/GlobTool.ts:188`）委托 `checkReadPermissionForTool()`：

```typescript
async checkPermissions(input, context): Promise<PermissionResult> {
  const appState = context.getAppState() as { toolPermissionContext: ToolPermissionContext }
  return checkReadPermissionForTool(GlobTool, input, appState.toolPermissionContext)
}
```

`checkReadPermissionForTool()`（`src/utils/permissions/filesystem.ts:23`）当前默认返回 `{ behavior: 'allow', updatedInput: input }`，完整实现需检查 allowedDirectories 和 deny rules。

`preparePermissionMatcher()` 支持 hook 条件中的通配符匹配，委托 `matchWildcardPattern()`。

## 文件系统抽象

`getFsImplementation()`（`src/utils/fsOperations.ts:29`）返回统一的 `FsImplementation` 接口：
- `stat()` — 异步文件状态
- `readFile()` — 异步文件读取
- `readFileSync()` — 同步文件读取（懒加载 `require('fs')`）
- `cwd()` — 当前工作目录

设计原因：抽象文件系统操作，便于测试和平台适配。

## 当前局限

1. **glob 实现简化**：使用 Node.js fs 递归遍历，待 ripgrep 集成后替换
2. **.gitignore 未完全支持**：仅跳过 `.git` 和 `node_modules` 目录，未读取 `.gitignore` 规则
3. **权限检查简化**：`checkReadPermissionForTool()` 当前默认允许
4. **suggestPathUnderCwd 未实现**：当前返回 `null`，待模糊匹配实现
5. **UI 渲染占位**：`renderToolUseMessage()` 返回 `null`，待 React 组件依赖就绪
