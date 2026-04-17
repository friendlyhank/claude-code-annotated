# 待办任务

> 最后更新：2026-04-17

## 已完成

### ✅ GlobTool 核心实现

- **状态**：`done`
- **源码位置**：`claude-code/src/tools/GlobTool/`
- **完成时间**：2026-04-16
- **验证方式**：`bun run test-glob.ts "src/**/*.ts"` 返回文件列表

### ✅ toolExecution.ts 核心链路

- **状态**：`done`
- **源码位置**：`claude-code/src/services/tools/toolExecution.ts`
- **完成时间**：2026-04-16
- **验证方式**：runToolUse(GlobTool) 返回正确结果

### ✅ FileReadTool 文本读取核心实现

- **状态**：`done`
- **源码位置**：`claude-code/src/tools/FileReadTool/`
- **完成时间**：2026-04-17
- **验证方式**：输入 `file_path: "src/Tool.ts"`，触发 FileReadTool.call()，输出带行号的文件内容
- **覆盖范围**：文本文件读取主链路、readFileInRange、schema、validateInput、ENOENT 处理

## 任务列表

### 任务 1：FileReadTool 图片/PDF/Notebook 补齐（优先级：high）

- **状态**：`planned`
- **源码位置**：`claude-code/src/tools/FileReadTool/FileReadTool.ts`
- **计划时长**：1 天
- **今日目标**：实现图片读取（readImageWithTokenBudget）和 PDF 读取
- **完成标准**：FileReadTool 能读取图片和 PDF 文件
- **验证方式**：输入图片路径，输出 base64 编码；输入 PDF 路径，输出内容
- **目标文件映射**：
  - `claude-code/src/utils/imageResizer.ts` → `src/utils/imageResizer.ts`
  - `claude-code/src/utils/pdf.ts` → `src/utils/pdf.ts`
  - `claude-code/src/utils/pdfUtils.ts` → `src/utils/pdfUtils.ts`
  - `claude-code/src/utils/notebook.ts` → `src/utils/notebook.ts`

### 任务 2：完善 file.ts 工具函数（优先级：high）

- **状态**：`planned`
- **源码位置**：`claude-code/src/utils/file.ts`
- **计划时长**：0.5 天
- **今日目标**：实现 suggestPathUnderCwd、getDisplayPath 等函数
- **完成标准**：FileReadTool 能正确处理文件不存在等边界情况
- **验证方式**：输入不存在的路径，返回带建议的错误消息

### 任务 3：BashTool 核心实现（优先级：high）

- **状态**：`planned`
- **源码位置**：`claude-code/src/tools/BashTool/BashTool.tsx`
- **计划时长**：1 天
- **今日目标**：实现 BashTool 的输入 schema 和 call() 框架
- **完成标准**：能执行简单 bash 命令并返回结果
- **验证方式**：输入 `command: "echo hello"`，输出 "hello"

### 任务 4：GrepTool 实现（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/tools/GrepTool/GrepTool.ts`
- **计划时长**：1 天
- **今日目标**：实现 GrepTool 的核心搜索逻辑
- **完成标准**：能搜索文件内容并返回匹配行
- **验证方式**：输入 `pattern: "TODO"`，输出包含 TODO 的文件和行

### 任务 5：FileEditTool 实现（优先级：high）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/tools/FileEditTool/FileEditTool.ts`
- **计划时长**：1 天
- **今日目标**：实现文件编辑的精确字符串替换
- **完成标准**：能精确替换文件中的字符串
- **验证方式**：替换 "old" 为 "new"，验证文件内容更新

### 任务 6：FileWriteTool 实现（优先级：high）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/tools/FileWriteTool/FileWriteTool.ts`
- **计划时长**：0.5 天
- **今日目标**：实现文件写入功能
- **完成标准**：能创建或覆盖写入文件
- **验证方式**：写入内容，验证文件创建成功

### 任务 7：ripgrep 集成（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/ripgrep.ts`
- **计划时长**：1 天
- **今日目标**：实现 ripGrep() 函数，替换 Node.js fs 简化实现
- **完成标准**：GlobTool 和 GrepTool 使用 ripgrep 进行搜索
- **验证方式**：对比 ripgrep 和 fs 实现的搜索结果一致性

### 任务 8：QueryEngine 类实现（优先级：high）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/QueryEngine.ts`
- **计划时长**：1 天
- **今日目标**：实现 QueryEngine 类框架
- **完成标准**：QueryEngine 能替代 query() 函数的核心功能
- **验证方式**：通过 QueryEngine 完成一次完整的查询循环

### 任务 9：权限检查完善（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/permissions/filesystem.ts`
- **计划时长**：0.5 天
- **今日目标**：完善 checkReadPermissionForTool 的完整逻辑
- **完成标准**：能正确检查 allowedDirectories 和 deny rules
- **验证方式**：设置 deny 规则，验证工具调用被拒绝

### 任务 10：消息预处理 compact（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/messages.ts`（compact 相关函数）
- **计划时长**：1 天
- **今日目标**：实现消息压缩和 token 预算管理
- **完成标准**：超出 token 限制时自动压缩历史消息
- **验证方式**：发送超长对话，验证消息被正确压缩
