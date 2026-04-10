import { randomUUID, type UUID } from 'crypto'
import type { ToolResultBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import { findToolByName, type ToolUseContext } from '../../Tool.js'
import type { AssistantMessage, Message, UserMessage } from '../../types/message.js'

export type ContextModifier = {
  toolUseID: string
  modifyContext: (context: ToolUseContext) => ToolUseContext
}

//  懒加载消息更新类型定义
export type MessageUpdateLazy = {
  message?: Message
  contextModifier?: ContextModifier
}

// 创建工具执行消息,消息为用户消息
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

// 对齐上游文件边界：真实工具执行会在该模块落地。
// 当前闭环只补到 query -> runTools -> tool_result 的最小主链路，
// 具体工具调用、权限与进度流后续继续按上游拆分补齐。
export async function* runToolUse(
  toolUse: ToolUseBlock,
  _assistantMessage: AssistantMessage,
  _canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdateLazy, void> {
  const tool = findToolByName(toolUseContext.options.tools, toolUse.name)

  if (!tool) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `Tool "${toolUse.name}" is not available in the replicated tool registry yet.`,
        true,
      ),
    }
    return
  }

  const parsedInput = tool.inputSchema.safeParse(toolUse.input)
  if (!parsedInput.success) {
    yield {
      message: createToolResultMessage(
        toolUse,
        `Tool "${toolUse.name}" input validation failed in the current replica stub.`,
        true,
      ),
    }
    return
  }

  yield {
    message: createToolResultMessage(
      toolUse,
      `Tool "${toolUse.name}" was scheduled successfully, but concrete execution is still TODO in this replica.`,
      true,
    ),
  }
}
