
// ============================================================================
// claude.ts
// ============================================================================
// Claude 模型 API 调用层，负责与 Anthropic 模型交互。


import { randomUUID, type UUID } from 'crypto'
import type {
  Message as AnthropicMessage,
  MessageParam,
} from '@anthropic-ai/sdk/resources/messages/messages.mjs'
import { getAnthropicClient } from './client.js'
import type { AssistantMessage, Message, StreamEvent } from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'

type Options = {
  model: string
  isNonInteractiveSession: boolean // 是否为非交互式会话
   [key: string]: unknown
}

// 将消息角色归一化以符合 Anthropic API 要求
function normalizeMessageRole(message: Message): 'user' | 'assistant' | null {
  if (message.message?.role === 'user' || message.type === 'user') {
    return 'user'
  }

  if (message.message?.role === 'assistant' || message.type === 'assistant') {
    return 'assistant'
  }

  return null
}

// 将消息归一化为符合 Anthropic API 要求的格式
function normalizeMessagesForApi(messages: Message[]): MessageParam[] {
    // 遍历消息数组中的每个元素，过滤无效消息并合并为新的 API 消息数组
    return messages.flatMap(message => {
    // 只处理user和assistant角色
    const role = normalizeMessageRole(message)
    if (!role) {
      return []
    }

    // 取出消息正文
    const content = message.message?.content
    if (typeof content === 'string') {
      return [{ role, content }]
    }

    if (Array.isArray(content)) {
      return [
        {
          role,
          content: content as MessageParam['content'],
        },
      ]
    }

    return []
  })
}

// 将 Anthropic 模型响应转换为 Claude 格式的消息
function toAssistantMessage(message: AnthropicMessage): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID() as UUID,
    timestamp: new Date().toISOString(),
    message: {
      id: message.id,
      role: message.role,
      content: message.content,
      usage: message.usage as unknown as Record<string, unknown>,
      model: message.model,
      stop_reason: message.stop_reason,
      stop_sequence: message.stop_sequence,
    },
  } as AssistantMessage
}

// 调用 Anthropic 模型并返回流式响应
export async function* queryModelWithStreaming({
  messages,
  systemPrompt,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig?: unknown
  tools?: unknown
  signal: AbortSignal
  options: Options
}): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  const anthropic = await getAnthropicClient({
    maxRetries: 0,
  })

  const response = await anthropic.messages.create(
    {
      model: options.model,
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || '4096', 10),
      messages: normalizeMessagesForApi(messages), // 归一化消息
      ...(systemPrompt.length > 0
        ? {
            system: systemPrompt.join('\n\n'),
          }
        : {}),
    },
    {
      signal,
    },
  )

  yield toAssistantMessage(response)
}
