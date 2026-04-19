/**
 * BashTool - Shell 命令执行工具
 *
 * 当前实现：简单版 — buildTool 定义 + call 主链路（exec → 返回结果）
 * 设计原因：
 * 1. BashTool 是核心链路上的必要功能（主功能，优先级 high）
 * 2. buildTool 统一工具创建，确保与其他工具一致的接口
 * 3. call 方法通过 exec() 执行命令，interpretCommandResult 解释退出码
 *
 * TODO: 后台任务（run_in_background）、sed 编辑模拟、sandbox、
 *       权限检查完整版、UI 渲染、输出持久化待后续补齐
 */

import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import type {
  ValidationResult,
  ToolUseContext,
} from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { ShellError } from '../../utils/errors.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { semanticNumber } from '../../utils/semanticNumber.js'
import { exec } from '../../utils/Shell.js'
import type { ExecResult } from '../../utils/ShellCommand.js'
import { interpretCommandResult } from './commandSemantics.js'
import {
  getDefaultTimeoutMs,
  getMaxTimeoutMs,
  getSimplePrompt,
} from './prompt.js'
import { BASH_TOOL_NAME } from './toolName.js'
import {
  stripEmptyLines,
  resetCwdIfOutsideProject,
  stdErrAppendShellResetMessage,
} from './utils.js'

const EOL = '\n'

// ============================================================================
// 命令分类 — 用于 UI 折叠显示和搜索/读取判断
// ============================================================================

// 搜索类命令
const BASH_SEARCH_COMMANDS = new Set([
  'find',
  'grep',
  'rg',
  'ag',
  'ack',
  'locate',
  'which',
  'whereis',
])

// 读取类命令
const BASH_READ_COMMANDS = new Set([
  'cat',
  'head',
  'tail',
  'less',
  'more',
  'wc',
  'stat',
  'file',
  'strings',
  'jq',
  'awk',
  'cut',
  'sort',
  'uniq',
  'tr',
])

// 列表类命令
const BASH_LIST_COMMANDS = new Set(['ls', 'tree', 'du'])

// 语义中性类命令
const BASH_SEMANTIC_NEUTRAL_COMMANDS = new Set([
  'echo',
  'printf',
  'true',
  'false',
  ':', // bash no-op
])

// 静默类命令
const BASH_SILENT_COMMANDS = new Set([
  'mv',
  'cp',
  'rm',
  'mkdir',
  'rmdir',
  'chmod',
  'chown',
  'chgrp',
  'touch',
  'ln',
  'cd',
  'export',
  'unset',
  'wait',
])

// 后台任务是否被禁用
const isBackgroundTasksDisabled =
  isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS)

// ============================================================================
// Input/Output Schema
// ============================================================================

const fullInputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().describe('The command to execute'),
    timeout: semanticNumber(z.number().optional()).describe(
      `Optional timeout in milliseconds (max ${getMaxTimeoutMs()})`,
    ),
    description: z
      .string()
      .optional()
      .describe(
        'Clear, concise description of what this command does in 5-10 words',
      ),
    run_in_background: z
      .boolean()
      .optional()
      .describe(
        'If true, run the command in the background rather than waiting for it to complete',
      ),
  }),
)

// 懒加载
const inputSchema = lazySchema(() =>
  isBackgroundTasksDisabled
    ? fullInputSchema().omit({
        run_in_background: true,
      })
    : fullInputSchema(),
)

export type BashToolInput = z.infer<ReturnType<typeof fullInputSchema>>

const outputSchema = lazySchema(() =>
  z.object({
    stdout: z.string().describe('The standard output of the command'),
    stderr: z.string().describe('The standard error output of the command'),
    interrupted: z.boolean().describe('Whether the command was interrupted'),
    exitCode: z.number().describe('The exit code of the command'),
  }),
)

export type Out = z.infer<ReturnType<typeof outputSchema>>

// ============================================================================
// 命令分类辅助函数
// ============================================================================

/**
 * 判断 bash 命令是否为搜索或读取操作
 * 对齐上游：用于 UI 折叠显示决策
 * 当前简化版：只看管道链中第一个命令的基础命令名
 * TODO: 完整版需用 splitCommandWithOperators 做复合命令分析
 */
export function isSearchOrReadBashCommand(command: string): {
  isSearch: boolean // 是否为搜索命令
  isRead: boolean // 是否为读取命令
  isList: boolean // 是否为列表命令
} {
  const baseCommand = command.trim().split(/\s+/)[0] || ''
  return {
    isSearch: BASH_SEARCH_COMMANDS.has(baseCommand), // 是否为搜索命令
    isRead: BASH_READ_COMMANDS.has(baseCommand), // 是否为读取命令
    isList: BASH_LIST_COMMANDS.has(baseCommand), // 是否为列表命令
  }
}

/**
 * 判断命令是否为静默命令（成功时通常无输出）
 */
function isSilentBashCommand(command: string): boolean {
  const baseCommand = command.trim().split(/\s+/)[0] || ''
  return BASH_SILENT_COMMANDS.has(baseCommand)
}

// ============================================================================
// BashTool 定义
// ============================================================================

export const BashTool = buildTool({
  name: BASH_TOOL_NAME,
  searchHint: 'execute shell commands',
  maxResultSizeChars: 30_000, // 最大输出字符数
  strict: true, // 严格模式
  async description({ description }) {
    return description || 'Run shell command'
  },
  async prompt() {
    return getSimplePrompt()
  },
  isConcurrencySafe(input) {
    // 只读命令可以并发执行
    return this.isReadOnly?.(input) ?? false
  },
  isReadOnly(input) {
    // 对齐上游：搜索/读取/列表命令为只读
    const { isSearch, isRead, isList } = isSearchOrReadBashCommand(
      input.command,
    )
    return isSearch || isRead || isList
  },
  // 自动分类输入
  toAutoClassifierInput(input) {
    return input.command
  },
  // 判断命令是否为搜索或读取操作
  isSearchOrReadCommand(input) {
    const parsed = inputSchema().safeParse(input)
    if (!parsed.success)
      return { isSearch: false, isRead: false, isList: false }
    return isSearchOrReadBashCommand(parsed.data.command)
  },
  get inputSchema() {
    return inputSchema()
  },
  get outputSchema() {
    return outputSchema()
  },
  // 用户可见名称
  userFacingName(_input) {
    return 'Bash'
  },
  // 获取工具使用摘要
  getToolUseSummary(input) {
    if (!input?.command) {
      return null
    }
    const { command, description } = input
    if (description) {
      return description
    }
    // 截断长命令
    return command.length > 80 ? command.slice(0, 77) + '...' : command
  },
  // 获取活动描述
  getActivityDescription(input) {
    if (!input?.command) {
      return 'Running command'
    }
    const desc = input.description ?? input.command
    return `Running ${desc}`
  },
  // 验证输入
  async validateInput(_input: BashToolInput): Promise<ValidationResult> {
    // 简单版：不做额外验证
    // TODO: 完整版包含 sleep 模式检测、MONITOR_TOOL 特性标志检查
    return { result: true }
  },
  // 检查权限
  async checkPermissions(_input, _context) {
    // 简单版：默认允许
    // TODO: 完整版调用 bashToolHasPermission
    return { behavior: 'allow' as const, updatedInput: _input }
  },
  // 渲染工具使用消息
  renderToolUseMessage: () => null,
  // 提取搜索文本
  extractSearchText({ stdout, stderr }) {
    return stderr ? `${stdout}\n${stderr}` : stdout
  },
  // 映射工具结果到工具结果块参数
   mapToolResultToToolResultBlockParam(
    {
      interrupted, // 是否被中断
      stdout, // 标准输出
      stderr, // 错误输出
    }: {
      interrupted: boolean // 是否被中断
      stdout: string // 标准输出
      stderr: string // 错误输出
      isImage?: boolean // 是否为图片
      backgroundTaskId?: string // 背景任务 ID
      backgroundedByUser?: boolean // 是否由用户触发背景任务
      assistantAutoBackgrounded?: boolean // 是否由助手自动触发背景任务
      persistedOutputPath?: string // 持久化输出路径
      persistedOutputSize?: number // 持久化输出大小
    },
    toolUseID: string, // 工具使用 ID
  ): ToolResultBlockParam {
    let processedStdout = stdout
    if (stdout) {
      // 去除前导空白行
      processedStdout = stdout.replace(/^(\s*\n)+/, '')
      processedStdout = processedStdout.trimEnd()
    }

    let errorMessage = stderr.trim()
    if (interrupted) {
      if (stderr) errorMessage += EOL
      errorMessage += '<error>Command was aborted before completion</error>'
    }

    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [processedStdout, errorMessage].filter(Boolean).join('\n'),
      is_error: interrupted,
    }
  },
  async call(
    input: BashToolInput, // 输入参数
    toolUseContext: ToolUseContext, // 工具使用上下文
  ) {
    const { abortController } = toolUseContext

    let result: ExecResult
    let wasInterrupted = false
    let stderrForShellReset = ''

    try {
      // 执行 shell 命令
      const shellCommand = await exec(
        input.command, // 命令
        abortController.signal, // 中断信号
        'bash', // shell 类型
        {
          timeout: input.timeout || getDefaultTimeoutMs(),
        },
      )

      // 等待命令完成
      result = await shellCommand.result

      // 清理
      shellCommand.cleanup()

      // 检查是否被中断
      const isInterrupt =
        result.interrupted && abortController.signal.reason === 'interrupt'

      // 解释命令结果
      const interpretationResult = interpretCommandResult(
        input.command,
        result.code,
        result.stdout || '',
        '',
      )

      // CWD 恢复检查
      // TODO: 完整版需要 preventCwdChanges 和 ToolPermissionContext
      if (resetCwdIfOutsideProject()) {
        stderrForShellReset = stdErrAppendShellResetMessage('')
      }

      if (result.preSpawnError) {
        throw new Error(result.preSpawnError)
      }

      if (interpretationResult.isError && !isInterrupt) {
        throw new ShellError(
          '',
          result.stdout || '',
          result.code,
          result.interrupted,
        )
      }

      wasInterrupted = result.interrupted
    } catch (error) {
      if (error instanceof ShellError) {
        // ShellError 携带退出码和输出，转换为 ToolResult
        return {
          data: {
            stdout: error.stderr || '',
            stderr: '',
            interrupted: error.interrupted,
            exitCode: error.code ?? 1,
          },
        }
      }
      // 其他错误
      return {
        data: {
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          interrupted: false,
          exitCode: 1,
        },
      }
    }

    // 格式化输出
    let stdout = stripEmptyLines(result.stdout || '')
    if (result.code !== 0 && !wasInterrupted) {
      stdout += `${stdout ? EOL : ''}Exit code ${result.code}`
    }

    return {
      data: {
        stdout,
        stderr: stderrForShellReset || result.stderr || '',
        interrupted: wasInterrupted,
        exitCode: result.code,
      },
    }
  },
})
