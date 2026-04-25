## 项目

Claude Code CLI 源码复刻项目。基于 `~/tsproject/claude-code` 复刻，交互式 AI 编码助手终端工具。技术栈：Bun + TypeScript + React (Ink 终端 UI)。

## 命令

```bash
bun run dev                        # 开发模式运行 CLI（无需构建）
bun run dev --debug --debug-file=log/debug.log  # 调试模式，日志输出到文件
bun run build                      # 通过 build.ts 构建到 dist/（使用 Bun.build）
bun run typecheck                  # TypeScript 类型检查
bun test                           # 运行测试（bun 原生测试框架）
```

## 复刻原则

- **源码事实高于一切**：文件名、函数命名、代码实现等必须与目标源码一致
- **按已有功能复刻修复**：不得随意扩写功能，修复问题时若目标源码也存在问题，提示告知用户而非自行修复
- **中文注释辅助学习**：复刻时添加友好中文注释帮助学习
- **标注内容不可删除**：中文注释和特别说明（未按源码事实的部分）需保留

## 架构

- **入口**: `src/entrypoints/cli.tsx` → 动态导入 `src/main.tsx`
- **构建**: 自定义 `build.ts`，使用 `define: { 'MACRO.VERSION': '...' }` 在构建时注入版本号
- **工具**: `src/tools/` 包含 FileReadTool、FileEditTool、FileWriteTool、GlobTool、BashTool

## graphify 知识图谱

图谱位于 `graphify-out/`。回答架构问题前先读 `graphify-out/GRAPH_REPORT.md`。修改代码后需重建图谱：

```bash
python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
```
