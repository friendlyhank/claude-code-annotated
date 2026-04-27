# 12.4 进程与执行引擎

## 概览

进程与执行引擎模块提供跨平台执行能力和进程生命周期管理，包括子进程执行、输出处理、清理注册等。

## 核心模块

### execFileNoThrow.ts - 跨平台执行工具

**职责**：提供始终 resolve 的子进程执行

**设计原则**：
- 始终 resolve（不 reject）
- 错误通过返回值传递
- 便于链式调用

**导出函数**：
- `execFileNoThrow()`：异步执行
- `execFileSyncNoThrow()`：同步执行

### execFileNoThrowPortable.ts - 可移植执行工具

**职责**：提供跨平台兼容的执行实现

**用途**：处理不同平台的 exec 差异

### execSyncWrapper.ts - 同步执行包装

**职责**：包装 Node.js 同步执行 API

**导出函数**：
- `execSyncWithDefaults_DEPRECATED()`：已废弃，保留兼容

### process.ts - 进程输出工具

**职责**：安全写入 stdout/stderr，处理 EPIPE 错误

**导出函数**：
- `registerProcessOutputErrorHandlers()`：注册错误处理
- `writeToStdout()`：安全写入 stdout
- `writeToStderr()`：安全写入 stderr
- `exitWithError()`：错误退出
- `peekForStdinData()`：检查标准输入

**EPIPE 处理**：
```typescript
// 管道断裂时销毁流而非抛错
if (err.code === 'EPIPE') {
  stream.destroy()
}
```

### cleanupRegistry.ts - 清理注册表

**职责**：管理进程退出时的清理操作

**导出函数**：
- `registerCleanup()`：注册清理函数
- `runCleanupFunctions()`：执行所有清理函数

**使用场景**：
- 刷新日志缓冲
- 关闭数据库连接
- 清理临时文件

**注册机制**：
```typescript
const unregister = registerCleanup(async () => {
  await flushLogBuffer()
})
// 可选：取消注册
unregister()
```

## 执行模型对比

### execFileNoThrow vs 原生 exec

| 特性 | execFileNoThrow | 原生 exec |
|------|----------------|-----------|
| 错误处理 | 始终 resolve | 可能 reject |
| 返回值 | `{ stdout, stderr, error }` | `stdout` 或抛错 |
| 适用场景 | 链式调用、批量执行 | 简单场景 |

## 进程生命周期

```
进程启动
    ↓
执行子进程 (execFileNoThrow)
    ↓
收集输出 (stdout/stderr)
    ↓
进程退出
    ↓
runCleanupFunctions (执行清理)
```

## 调用关系

```
工具层 / Shell 执行
    ↓
execFileNoThrow.ts (子进程执行)
    ↓
process.ts (输出处理)
    ↓
cleanupRegistry.ts (清理注册)
```

## 设计亮点

1. **容错执行**：始终 resolve，错误通过返回值传递
2. **EPIPE 处理**：优雅处理管道断裂
3. **清理注册**：统一管理进程退出清理
4. **可取消注册**：支持动态移除清理函数

## 相关文件

- `src/utils/execFileNoThrow.ts` - 跨平台执行工具
- `src/utils/execFileNoThrowPortable.ts` - 可移植执行工具
- `src/utils/execSyncWrapper.ts` - 同步执行包装
- `src/utils/process.ts` - 进程输出工具
- `src/utils/cleanupRegistry.ts` - 清理注册表
