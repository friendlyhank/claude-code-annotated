
// ============================================================================
// toolExecution.ts
// ============================================================================
// 工具执行层，负责“单个工具调用”，不负责分批、调度、汇总等。
// 当前仅实现核心链路，其余功能标记为 TODO

import { randomUUID, type UUID } from 'crypto'
import type { ToolResultBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import { findToolByName, type ToolUseContext } from '../../Tool.js'
import type { AssistantMessage, Message, UserMessage } from '../../types/message.js'

// 上下文修改器
export type ContextModifier = {
  toolUseID: string
  modifyContext: (context: ToolUseContext) => ToolUseContext
}

// 懒加载消息更新类型定义
export type MessageUpdateLazy<M extends Message = Message> = {
  message: M
  contextModifier?: ContextModifier
}

// 创建工具结果消息
function createToolResultMessage(
  toolUse: ToolUseBlock,
  content: string,
  isError: boolean,
): UserMessage {
  const toolResult: ToolResultBlockParam = {
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content,
    is_error: isError,
  }

  return {
    type: 'user',
    uuid: randomUUID() as UUID,
    toolUseResult: content,
    message: {
      role: 'user',
      content: [toolResult],
    },
  }
}

/**
 * 执行单个工具调用
 *
 *
 * 处理流程：
 * 1. 查找工具
 * 2. 校验输入
 * 3. 检查权限
 * 4. 调用 tool.call()
 * 5. 映射结果
 *
 * TODO: hooks 系统
 * TODO: telemetry 日志
 * TODO: MCP 工具处理
 * TODO: 进度报告
 */
export async function* runToolUse(
  toolUse: ToolUseBlock,
  assistantMessage: AssistantMessage,
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdateLazy, void> {
  const toolName = toolUse.name

  // 查找工具
  let tool = findToolByName(toolUseContext.options.tools, toolName)

  // 边界处理：工具未注册
  if (!tool) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>Error: No such tool available: ${toolName}</tool_use_error>`,
        true,
      ),
    }
    return
  }

  // 检查中断信号
  if (toolUseContext.abortController.signal.aborted) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>Tool execution cancelled</tool_use_error>`,
        true,
      ),
    }
    return
  }

  const toolInput = toolUse.input as { [key: string]: unknown }

  // 输入校验
  const parsedInput = tool.inputSchema.safeParse(toolInput)
  if (!parsedInput.success) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>InputValidationError: ${parsedInput.error.message}</tool_use_error>`,
        true,
      ),
    }
    return
  }

  // 边界处理：输入验证（validateInput）
  // 对齐上游实现：每个工具有自己的验证逻辑
  const isValidCall = await tool.validateInput?.(
    parsedInput.data,
    toolUseContext,
  )
  if (isValidCall?.result === false) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>${isValidCall.message}</tool_use_error>`,
        true,
      ),
    }
    return
  }

  // 权限检查
  const permissionResult = await canUseTool(tool, parsedInput.data, toolUseContext)
  if (!permissionResult.result) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>Permission denied: ${permissionResult.message}</tool_use_error>`,
        true,
      ),
    }
    return
  }

  // 真正调用工具
  try {
    const result = await tool.call(
      parsedInput.data,
      toolUseContext,
      canUseTool,
      assistantMessage,
    )

    // 映射结果为 API 格式
    const toolResultBlock = tool.mapToolResultToToolResultBlockParam(
      result.data,
      toolUse.id,
    )

    // 一起 yield message 和 contextModifier（如有）
    yield {
      message: createToolResultMessage(
        toolUse,
        typeof toolResultBlock.content === 'string'
          ? toolResultBlock.content
          : JSON.stringify(toolResultBlock.content),
        false,
      ),
      ...(result.contextModifier && {
        contextModifier: {
          toolUseID: toolUse.id,
          modifyContext: result.contextModifier,
        },
      }),
    }
  } catch (error) {
    // 边界处理：工具执行异常
    const errorMessage = error instanceof Error ? error.message : String(error)
    const toolInfo = tool ? ` (${tool.name})` : ''
    const detailedError = `Error calling tool${toolInfo}: ${errorMessage}`

    yield {
      message: createToolResultMessage(
        toolUse,
        `<tool_use_error>${detailedError}</tool_use_error>`,
        true,
      ),
    }
  }
}
