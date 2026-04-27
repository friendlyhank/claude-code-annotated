# 10.1 系统提示词构建

## 概览

系统提示词是 Claude Code 与 Claude 模型交互的核心界面，定义了助手的身份、能力边界、行为准则和上下文信息。

## 核心模块

### systemPrompt.ts - 系统提示词构建器

**职责**：根据优先级构建有效系统提示词

**构建优先级**：
1. **overrideSystemPrompt**：完全重写系统提示词
2. **agentSystemPrompt**：agent 定义的系统提示词
3. **customSystemPrompt**：`--system-prompt` 指定的自定义提示词
4. **defaultSystemPrompt**：默认系统提示词
5. **appendSystemPrompt**：始终追加的提示词

**构建逻辑**：
```typescript
if (overrideSystemPrompt) {
  return [overrideSystemPrompt]
}

return [
  ...(agentSystemPrompt ?? customSystemPrompt ?? defaultSystemPrompt),
  ...(appendSystemPrompt ? [appendSystemPrompt] : [])
]
```

### systemPromptType.ts - 系统提示词类型

**职责**：定义系统提示词类型和安全断言

**类型定义**：
```typescript
type SystemPrompt = string[]

function asSystemPrompt(prompts: string[]): SystemPrompt
```

**设计原因**：类型断言确保系统提示词始终是字符串数组，避免类型混淆

## 系统提示词分层结构

### 默认系统提示词组成

```
1. 简单介绍
   - 身份：Claude Code CLI 交互式编码助手
   - 能力概述：代码理解、编辑、测试、调试

2. 系统配置
   - 工作目录
   - Git 状态
   - 平台信息
   - Shell 类型

3. 任务
   - 主要任务类型
   - 预期行为

4. 操作
   - 允许的操作
   - 禁止的操作

5. 使用工具
   - 工具列表
   - 工具使用指南

6. 语气风格
   - 简洁直接
   - 避免冗余

7. 输出效率
   - token 使用优化
   - 响应速度

8. 环境信息
   - 动态计算的上下文
```

## 环境信息计算

### 动态信息

**工作目录**：
- `getCwd()` 获取当前工作目录

**Git 状态**：
- 当前分支
- 未提交的更改
- 远程仓库信息

**平台信息**：
- macOS / Windows / WSL / Linux
- OS 版本

**Shell 信息**：
- 可用 Shell 列表
- 当前 Shell 类型

### 模型信息

**营销名称映射**：
```typescript
Opus → claude-3-opus-20240229
Sonnet → claude-3-5-sonnet-20241022
Haiku → claude-3-5-haiku-20241022
```

**知识截止日期**：
- Opus: 2023-08
- Sonnet: 2024-04
- Haiku: 2024-07

## 调用关系

```
查询准备阶段
    ↓
buildEffectiveSystemPrompt
    ↓
优先级判断 (override → agent → custom → default)
    ↓
追加 appendSystemPrompt
    ↓
返回 SystemPrompt (string[])
```

## 设计亮点

1. **优先级清晰**：明确的重写和追加机制
2. **类型安全**：asSystemPrompt 断言确保类型正确
3. **动态信息**：环境信息实时计算
4. **模型适配**：不同模型不同知识截止日期

## 相关文件

- `src/utils/systemPrompt.ts` - 系统提示词构建器
- `src/utils/systemPromptType.ts` - 系统提示词类型
- `src/constants/prompts.ts` - 默认提示词常量
