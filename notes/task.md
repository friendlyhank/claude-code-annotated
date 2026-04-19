# 待办任务

> 最后更新：2026-04-19

## 任务列表

### 任务 1：FileEditTool 实现（优先级：high）

- **状态**：`done`
- **源码位置**：`claude-code/src/tools/FileEditTool/FileEditTool.ts`
- **完成标准**：能精确替换文件中的字符串
- **验证方式**：替换 "old" 为 "new"，验证文件内容更新
- **当前进度**：核心实现完成（validateInput + call 主链路 + utils 全量），82% 覆盖率
- **待补齐**：UI.tsx 渲染、src/ 子目录、LSP/日志等次要依赖

### 任务 2：FileWriteTool 实现（优先级：high）

- **状态**：`done`
- **源码位置**：`claude-code/src/tools/FileWriteTool/FileWriteTool.ts`
- **完成标准**：能创建或覆盖写入文件
- **验证方式**：写入内容，验证文件创建成功
- **当前进度**：核心实现完成（validateInput + call 主链路），77% 覆盖率
- **待补齐**：UI.tsx 渲染、LSP 通知、VSCode 通知、fileHistory、skill 发现

### 任务 3：BashTool 核心实现（优先级：high）

- **状态**：`doing`
- **源码位置**：`claude-code/src/tools/BashTool/BashTool.tsx`
- **完成标准**：能执行简单 bash 命令并返回结果
- **验证方式**：输入 `command: "echo hello"`，输出 "hello"
- **当前进度**：简单版已实现（call 主链路 + exec + ShellCommand），16% 覆盖率
- **待补齐**：权限检查、后台任务、sandbox、sed 编辑、UI 渲染

### 任务 4：ripgrep 集成（优先级：high）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/ripgrep.ts`
- **完成标准**：GlobTool 和 GrepTool 使用 ripgrep 进行搜索
- **验证方式**：对比 ripgrep 和 fs 实现的搜索结果一致性

### 任务 5：QueryEngine 类实现（优先级：high）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/QueryEngine.ts`
- **完成标准**：QueryEngine 能替代 query() 函数的核心功能
- **验证方式**：通过 QueryEngine 完成一次完整的查询循环

### 任务 6：FileReadTool 图片/PDF/Notebook 补齐（优先级：medium）

- **状态**：`planned`
- **源码位置**：`claude-code/src/tools/FileReadTool/FileReadTool.ts`
- **完成标准**：FileReadTool 能读取图片和 PDF 文件
- **验证方式**：输入图片路径，输出 base64 编码；输入 PDF 路径，输出内容
- **目标文件映射**：
  - `claude-code/src/utils/imageResizer.ts` → `src/utils/imageResizer.ts`
  - `claude-code/src/utils/pdf.ts` → `src/utils/pdf.ts`
  - `claude-code/src/utils/pdfUtils.ts` → `src/utils/pdfUtils.ts`
  - `claude-code/src/utils/notebook.ts` → `src/utils/notebook.ts`

### 任务 7：完善 file.ts 工具函数（优先级：medium）

- **状态**：`planned`
- **源码位置**：`claude-code/src/utils/file.ts`
- **完成标准**：FileReadTool 能正确处理文件不存在等边界情况
- **验证方式**：输入不存在的路径，返回带建议的错误消息

### 任务 8：GrepTool 实现（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/tools/GrepTool/GrepTool.ts`
- **完成标准**：能搜索文件内容并返回匹配行
- **验证方式**：输入 `pattern: "TODO"`，输出包含 TODO 的文件和行

### 任务 9：权限检查完善（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/permissions/filesystem.ts`
- **完成标准**：能正确检查 allowedDirectories 和 deny rules
- **验证方式**：设置 deny 规则，验证工具调用被拒绝

### 任务 10：消息预处理 compact（优先级：medium）

- **状态**：`backlog`
- **源码位置**：`claude-code/src/utils/messages.ts`（compact 相关函数）
- **完成标准**：超出 token 限制时自动压缩历史消息
- **验证方式**：发送超长对话，验证消息被正确压缩
