# 10.2 工具提示词设计

## 概览

工具提示词定义了每个工具的使用说明、约束条件和最佳实践，是模型正确使用工具的关键指导。每个工具通过独立的 `prompt.ts` 文件定义提示词。

## 提示词设计原则

1. **独立性**：每个工具的提示词独立维护，避免耦合
2. **先读后写**：文件编辑/写入前必须先读取
3. **约束明确**：失败条件、使用边界清晰
4. **最佳实践**：引导模型使用最优方案

## 核心模块

### FileReadTool/prompt.ts - 文件读取提示词

**常量**：
- `FILE_READ_TOOL_NAME = 'Read'`
- `MAX_LINES_TO_READ = 2000`
- `FILE_UNCHANGED_STUB`：文件未变更时的摘要文本

**提示词要点**：
- 文件路径必须是绝对路径
- 默认读取前 2000 行
- 行格式：`cat -n` 风格（行号: 内容）
- 支持图片、PDF、Jupyter notebook 读取
- 大文件可指定 offset/limit

**模板函数**：
```typescript
renderPromptTemplate(
  lineFormat,        // 行格式说明
  maxSizeInstruction,// 大小限制说明
  offsetInstruction  // 偏移量说明
)
```

### FileEditTool/prompt.ts - 文件编辑提示词

**关键约束**：
- **先读后写**：必须先用 Read 工具读取文件
- **精确匹配**：old_string 必须精确匹配（包括缩进）
- **唯一性**：old_string 必须唯一或使用 replace_all
- **最小匹配**：Ants 用户提示使用最小唯一字符串（2-4 行）

**行号前缀处理**：
```typescript
// 编辑时忽略行号前缀
// 前缀格式：spaces + line number + arrow 或 line number + tab
// 只匹配前缀后的实际内容
```

**提示词要点**：
- 保留精确缩进（不包含行号前缀）
- 优先编辑现有文件
- 不主动添加 emoji
- replace_all 用于变量重命名

### FileWriteTool/prompt.ts - 文件写入提示词

**常量**：
- `FILE_WRITE_TOOL_NAME = 'Write'`

**关键约束**：
- **先读后写**：现有文件必须先读取
- **完整覆盖**：写入会完全替换现有文件
- **优先 Edit**：修改现有文件优先使用 Edit 工具

**提示词要点**：
- 仅用于创建新文件或完全重写
- 不主动创建文档文件（*.md）
- 不主动使用 emoji
- 行尾策略：始终使用 LF

### BashTool/prompt.ts - 命令执行提示词

**常量**：
- `DEFAULT_TIMEOUT_MS = 120000`（2 分钟）
- `MAX_TIMEOUT_MS = 1800000`（30 分钟）

**提示词要点**：
- 独立命令可并行调用多个 Bash 工具
- 依赖命令用 `&&` 链接
- `;` 用于不在乎前序命令是否成功
- 路径含空格必须用双引号
- 尽量使用绝对路径，避免 `cd`

**并发策略**：
```
独立命令 → 多个 Bash 调用（并行）
依赖命令 → 单个 Bash 调用（&& 链接）
```

### GlobTool/prompt.ts - 文件模式匹配提示词

**常量**：
- `GLOB_TOOL_NAME = 'Glob'`

**提示词要点**：
- 快速文件模式匹配
- 支持 glob 模式：`**/*.js`、`src/**/*.ts`
- 结果按修改时间排序
- 开放式搜索使用 Task 工具

### GrepTool/prompt.ts - 内容搜索提示词

**常量**：
- `GREP_TOOL_NAME = 'Grep'`

**提示词要点**：
- 始终使用 GrepTool，不用 Bash 调用 grep/rg
- 支持完整正则语法
- 输出模式：content / files_with_matches / count
- 使用 ripgrep 语法（字面大括号需转义）
- 跨行匹配需设置 multiline: true

**过滤参数**：
- `glob`：`*.js`、`**/*.tsx`
- `type`：js、py、rust

## 提示词调用关系

```
工具构建阶段 (buildTool)
    ↓
从 prompt.ts 获取 DESCRIPTION
    ↓
构建 ToolDefinition
    ↓
传递给 API 调用
```

## 设计亮点

1. **独立维护**：每个工具提示词独立文件，便于更新
2. **先读后写**：强制读取防止盲目覆盖
3. **精确匹配**：避免编辑歧义
4. **并发引导**：指导模型最优执行策略
5. **权限正确**：使用专用工具而非 Bash 调用

## 相关文件

- `src/tools/FileReadTool/prompt.ts` - 文件读取提示词
- `src/tools/FileEditTool/prompt.ts` - 文件编辑提示词
- `src/tools/FileWriteTool/prompt.ts` - 文件写入提示词
- `src/tools/BashTool/prompt.ts` - 命令执行提示词
- `src/tools/GlobTool/prompt.ts` - glob 搜索提示词
- `src/tools/GrepTool/prompt.ts` - grep 搜索提示词
