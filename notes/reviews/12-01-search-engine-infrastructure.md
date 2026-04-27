# 12.1 搜索引擎基础设施

## 概览

搜索引擎基础设施为 Glob/Grep 工具提供高性能文件搜索和内容搜索能力。核心是 ripgrep 集成，通过三种模式自动选择最佳实现。

## 核心模块

### ripgrep.ts - 搜索引擎集成

**职责**：提供高性能文件搜索和内容搜索能力

**三种模式**：
1. **system**：使用系统安装的 `rg` 命令
2. **builtin**：使用 vendor 目录下的预编译 ripgrep
3. **embedded**：使用 Bun 编译时嵌入的 ripgrep

**选择策略**：
```
环境变量 CLAUDE_CODE_RIPGREP_MODE → 
  检测系统 rg 可用性 → 
    使用 builtin 或 embedded
```

## 关键能力

### 高性能文件搜索

- **性能优势**：比 Node.js 原生方法快得多
- **规模支持**：支持大型 monorepo（200k+ 文件）
- **并发优化**：多线程搜索（可降级为单线程）

### 超时与重试机制

**平台自适应超时**：
- WSL：60 秒（WSL 文件系统较慢）
- 其他平台：20 秒

**重试策略**：
1. 检测 EAGAIN 错误（资源临时不可用）
2. 单线程降级重试
3. 超时后升级为 SIGKILL

### 流式处理

**ripGrepStream**：
- 增量返回结果
- 支持 fzf change:reload 模式
- 避免大结果集内存爆炸

**ripGrepFileCount**：
- 仅计数换行符
- 内存优化（不加载文件内容）

### 进程生命周期管理

**spawn 包装**：
- stdout/stderr 截断（防止无限输出）
- 超时升级 SIGKILL
- AbortSignal 响应（支持取消）

### macOS 代码签名

**问题**：macOS quarantine 机制阻止未签名二进制执行

**解决方案**：
1. `codesignRipgrepIfNecessary` 检测并签名
2. `xattr` 清除隔离属性

### 结果归一化

**退出码语义**：
- `0`：找到匹配
- `1`：无匹配
- `2`：用法错误

**部分结果处理**：
- 超时仍返回已收集结果
- 区分超时错误和执行错误

## 调用关系

```
GlobTool / GrepTool
    ↓
ripgrep.ts (ripGrepStream / ripGrepFileCount)
    ↓
spawn (子进程执行)
    ↓
结果归一化处理
```

## 设计亮点

1. **渐进降级**：system → builtin → embedded，确保可用性
2. **平台适配**：WSL 特殊处理、macOS 签名处理
3. **流式优先**：避免大结果集内存问题
4. **容错设计**：超时返回部分结果、EAGAIN 自动重试

## 相关文件

- `src/utils/ripgrep.ts` - ripgrep 集成实现
- `src/tools/GlobTool.ts` - glob 搜索工具（调用 ripgrep）
- `src/tools/GrepTool.ts` - grep 搜索工具（调用 ripgrep）
