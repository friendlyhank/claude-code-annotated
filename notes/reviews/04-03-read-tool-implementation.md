# 04-03. Read 工具实现

## 概述

FileReadTool 是系统中少数有完整实现的工具之一，暴露名为 `Read`。它将文件系统读取能力封装为统一的工具接口，支持文本按行范围读取、文件去重、多媒体扩展预留。核心设计围绕"安全、高效、省 token"三个目标展开。

## 关键源码

| 文件 | 职责 |
| --- | --- |
| `src/tools/FileReadTool/FileReadTool.ts` | 主工具定义：buildTool 工厂落地、输入验证、call/callInner 执行路由 |
| `src/tools/FileReadTool/prompt.ts` | 常量与提示模板：MAX_LINES_TO_READ、FILE_READ_TOOL_NAME |
| `src/tools/FileReadTool/limits.ts` | 读取限制配置：maxTokens/maxSizeBytes/环境变量覆盖 |
| `src/utils/readFileInRange.ts` | 文本文件按行范围读取：快速路径与流式路径 |
| `src/utils/lazySchema.ts` | 延迟 Schema 构建（详见 04 主文档 §7） |
| `src/utils/semanticNumber.ts` | 语义数字预处理：LLM 可能输出字符串形式的数字 |
| `src/utils/file.ts` | 文件工具函数：addLineNumbers、findSimilarFile、suggestPathUnderCwd |
| `src/utils/path.ts` | 路径工具函数：expandPath |
| `src/constants/files.ts` | BINARY_EXTENSIONS 集合 + hasBinaryExtension |
| `src/constants/apiLimits.ts` | PDF 相关限制常量 |

## 设计原理

### 1. lazySchema 延迟构建 + get 访问器桥接

FileReadTool 的 inputSchema 和 outputSchema 均通过 `lazySchema` 延迟构建，通过 `get` 访问器桥接到 `Tool` 接口的 `readonly inputSchema` 属性。这与 GlobTool 采用相同模式（详见 04 主文档 §7）。

**outputSchema 延迟构建的特殊原因**：FileReadTool 的输出是 6 分支判别联合（`z.discriminatedUnion`），包含嵌套对象和枚举类型，构建成本显著高于简单 schema，延迟构建避免启动时不必要的开销。

### 2. 多类型输出判别联合

输出 schema 以 `type` 字段为判别键，定义 6 种输出变体：

| type | 用途 | 关键字段 | 状态 |
| --- | --- | --- | --- |
| `text` | 普通文本文件 | filePath, content, numLines, startLine, totalLines | **已实现** |
| `image` | 图片文件 | base64, type(MIME), originalSize, dimensions? | TODO |
| `notebook` | Jupyter 笔记本 | filePath, cells[] | TODO |
| `pdf` | 小 PDF | base64, originalSize | TODO |
| `parts` | 大 PDF 分页提取 | originalSize, count, outputDir | TODO |
| `file_unchanged` | 文件未变更去重 | filePath | **已实现** |

### 3. 并发安全声明

```typescript
isConcurrencySafe(_input?) { return true }
```

FileReadTool 声明为并发安全，与 GlobTool 一起是系统中仅有的两个可并发执行的工具。读取操作无副作用，多个 Read 可安全并行。

### 4. 文件去重策略

同一文件在相同 offset/limit 范围内，若 mtimeMs 未变，返回 `{ type: 'file_unchanged' }` 并附带 `FILE_UNCHANGED_STUB` 提示，避免重复传输相同内容节省 token。

去重状态存储在 `readFileState` Map 中（工具级闭包），key 为 filePath，value 包含 content、mtimeMs、offset、limit。

## 实现原理

### 输入 Schema

```typescript
z.strictObject({
  file_path: z.string(),                          // 必填，绝对路径
  offset: semanticNumber(z.number().optional()),   // 可选，起始行号
  limit: semanticNumber(z.number().optional()),    // 可选，读取行数
  pages: z.string().optional(),                    // 可选，PDF 页码范围
})
```

`semanticNumber` 预处理器：将 LLM 输出的字符串数字（如 `"30"`）转为数字 `30`，处理模型有时输出字符串形式数字的情况。

### call() 执行流程

```
call(input, context, canUseTool, assistantMessage)
  │
  ├─ 1. 获取读取限制：maxSizeBytes(默认256KB)、maxTokens(默认25000)
  │
  ├─ 2. 路径展开：expandPath() 解析 ~ 和相对路径
  │
  ├─ 3. 去重检查：readFileState 中是否存在相同 filePath+offset+limit 且 mtimeMs 未变
  │     └─ 命中 → 返回 { type: 'file_unchanged', file: { filePath } }
  │
  ├─ 4. 委托 callInner() 执行实际读取
  │
  ├─ 5. ENOENT 容错：
  │     ├─ getAlternateScreenshotPath() 尝试 macOS 薄空格路径
  │     ├─ findSimilarFile() 搜索相似文件名
  │     └─ suggestPathUnderCwd() 建议可能的路径
  │
  └─ 6. 返回 ToolResult
```

### callInner() 文件类型路由

```
callInner(filePath, input, ...)
  │
  ├─ .ipynb → throw 'Notebook reading is not yet implemented'
  ├─ .png/.jpg/.jpeg/.gif/.webp → throw 'Image reading is not yet implemented'
  ├─ .pdf → throw 'PDF reading is not yet implemented'
  └─ 其他（文本文件）→ readFileInRange()  ← 唯一已实现路径
       │
       ├─ offset 转换：1-based → 0-based (offset === 0 ? 0 : offset - 1)
       ├─ 调用 readFileInRange(resolvedPath, lineOffset, limit, maxSizeBytes, signal)
       ├─ 更新 readFileState（content, mtimeMs, offset, limit）
       ├─ 通知 fileReadListeners（快照后迭代，安全处理取消订阅）
       └─ 返回 { type: 'text', file: { filePath, content, numLines, startLine, totalLines } }
```

### 文本文件按行范围读取

`readFileInRange()` 根据文件特征选择两条路径：

| 条件 | 路径 | 实现 | 特点 |
| --- | --- | --- | --- |
| < 10MB 且为常规文件 | 快速路径 `readFileInRangeFast()` | 整文件读入内存，按 `\n` 位置切行 | 去除 UTF-8 BOM，处理 CRLF |
| >= 10MB 或管道/设备 | 流式路径 `readFileInRangeStreaming()` | `createReadStream` + 512KB highWaterMark 增量扫描 | 仅缓冲目标行范围内的数据，支持 AbortSignal |

**快速路径流程**：
1. `readFile()` 读取全部内容
2. 去除 UTF-8 BOM（`\xEF\xBB\xBF`）
3. 遍历 `\n` 位置，提取 `[offset, offset+maxLines)` 范围的行
4. 处理 CRLF（剥离尾部 `\r`）
5. 支持 `truncateAtBytes` 按字节截断

**流式路径流程**：
1. `open()` 获取 fd，`fstat()` 获取 mtimeMs（无需额外 `open()` 调用）
2. `createReadStream(fd, { highWaterMark: 512KB })`
3. 逐 chunk 扫描 `\n`，范围外行只计数不缓冲
4. 支持 AbortSignal 中断
5. 超过 maxBytes 时抛出 `FileTooLargeError`

**返回结构**：
```typescript
{
  content: string,           // 选中行内容
  lineCount: number,         // 返回行数
  totalLines: number,        // 文件总行数
  totalBytes: number,        // 文件总字节
  readBytes: number,         // 返回内容字节
  mtimeMs: number,           // 文件修改时间戳
  truncatedByBytes?: boolean // 是否因字节限制截断
}
```

## 安全防护

### validateInput() 输入校验

1. **二进制扩展名拒绝**：`hasBinaryExtension()` 检查 80+ 扩展名集合（`BINARY_EXTENSIONS`），图片扩展名除外（由 callInner 单独处理）
2. **设备文件黑名单**：`isBlockedDevicePath()` 拒绝危险设备路径

### 设备文件黑名单（BLOCKED_DEVICE_PATHS）

| 类型 | 路径 | 风险 |
| --- | --- | --- |
| 无限输出 | `/dev/zero`, `/dev/random`, `/dev/urandom`, `/dev/full` | 进程挂起或 OOM |
| 阻塞输入 | `/dev/stdin`, `/dev/tty`, `/dev/console` | 读取阻塞 |
| 无意义 | `/dev/stdout`, `/dev/stderr` | 无内容 |
| FD 别名 | `/dev/fd/0-2` | 同 stdin/stdout/stderr |
| Linux proc | `/proc/<pid>/fd/0-2` | 模式匹配 |

### 其他安全措施

- **UNC 路径**：允许但标记，不阻止（Windows 网络路径场景）
- **二进制文件安全风险提示**：`CYBER_RISK_MITIGATION_REMINDER` 在每次文本读取结果后追加安全提醒，当前无条件包含（`shouldIncludeFileReadMitigation()` 返回 `true`），TODO 计划按模型类型门控

## macOS 特殊处理

`getAlternateScreenshotPath()`：macOS 截图文件名中 AM/PM 前可能使用薄不间断空格（U+202F）而非普通空格。当主路径 ENOENT 时，自动尝试替换后的替代路径。

## 读取限制配置

| 参数 | 默认值 | 覆盖方式 |
| --- | --- | --- |
| maxTokens | 25,000 | `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` 环境变量 |
| maxSizeBytes | 256KB (262,144) | ToolUseContext 传入 |
| MAX_LINES_TO_READ | 2,000 | 硬编码常量 |

PDF 相关限制（预留）：

| 常量 | 值 | 用途 |
| --- | --- | --- |
| PDF_TARGET_RAW_SIZE | 20MB | API 发送最大 PDF 原始大小 |
| PDF_EXTRACT_SIZE_THRESHOLD | 3MB | 超过则提取为分页图片 |
| PDF_MAX_PAGES_PER_READ | 20 | 单次读取最大页数 |
| PDF_AT_MENTION_INLINE_THRESHOLD | 10 | @mention 内联阈值 |

## 当前局限

- 图片读取未实现，依赖 `imageResizer` 模块
- PDF 读取未实现，依赖 `pdfUtils` 模块
- Notebook 读取未实现，依赖 `notebook.ts` 模块
- `checkPermissions()` 当前直接返回 `{ behavior: 'allow' }`，完整权限检查待实现
- `shouldIncludeFileReadMitigation()` 当前始终返回 `true`，应按模型类型门控
