# 12.2 平台检测与环境适配

## 概览

平台检测与环境适配模块提供跨平台兼容性支持，包括平台检测、运行时检测、可执行文件查找等功能。

## 核心模块

### platform.ts - 平台检测

**职责**：检测当前运行平台和系统特性

**支持平台**：
- macOS
- Windows
- WSL (Windows Subsystem for Linux)
- Linux

**检测能力**：
- `getPlatform()`：返回平台标识
- WSL 版本检测（WSL 1/WSL 2）
- Linux 发行版信息（Ubuntu/Debian/CentOS 等）

### bundledMode.ts - Bundled 模式检测

**职责**：检测是否在 Bun 编译的独立可执行文件中运行

**检测函数**：
- `isRunningWithBun()`：检测当前运行时是否为 Bun
- `isInBundledMode()`：检测是否在编译后的二进制中运行

**判断依据**：
```typescript
// Bun 运行时检测
process.versions.bun !== undefined

// Bundled 模式检测
Bun.embeddedFiles.length > 0
```

### embeddedTools.ts - 嵌入式搜索工具

**职责**：检测 bfs/ugrep 是否嵌入在 bun 二进制中（ant-native 专用）

**检测函数**：
- `hasEmbeddedSearchTools()`：是否嵌入搜索工具
- `embeddedSearchToolsBinaryPath()`：嵌入工具二进制路径

**影响**：
- 嵌入时：find/grep 被 shell 函数覆盖
- 嵌入时：Glob/Grep 工具从工具注册表中移除
- 嵌入时：系统提示词省略 find/grep 引导

### which.ts - 可执行文件查找

**职责**：查找系统 PATH 中的可执行文件

**实现优先级**：
1. `Bun.which()`（Bun 原生实现）
2. 回退到自定义实现

**导出函数**：
- `which()`：异步查找
- `whichSync()`：同步查找

### findExecutable.ts - 可执行文件查找替代

**职责**：替代 spawn-rx 的 findExecutable 实现

**用途**：查找 shell 等可执行文件

### envUtils.ts - 环境变量工具

**职责**：布尔环境变量解析

**导出函数**：
- `isEnvTruthy(value)`：判断环境变量为真
- `isEnvFalsy(value)`：判断环境变量为假

**真值判断**：
- `"true"`, `"1"`, `"yes"` → true
- `"false"`, `"0"`, `"no"` → false

## 调用关系

```
各模块
    ↓
platform.ts (平台检测)
    ↓
bundledMode.ts (运行时检测)
    ↓
which.ts / findExecutable.ts (可执行文件查找)
```

## 设计亮点

1. **渐进检测**：从环境变量 → 系统特性 → 运行时特性
2. **Bun 优先**：优先使用 Bun 原生能力
3. **WSL 特殊处理**：识别 WSL 并调整行为
4. **嵌入式优化**：ant-native 构建时嵌入工具减少外部依赖

## 相关文件

- `src/utils/platform.ts` - 平台检测
- `src/utils/bundledMode.ts` - Bundled 模式检测
- `src/utils/embeddedTools.ts` - 嵌入式工具检测
- `src/utils/which.ts` - 可执行文件查找
- `src/utils/findExecutable.ts` - 可执行文件查找替代
- `src/utils/envUtils.ts` - 环境变量工具
