import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ThinkingBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages/messages.mjs'
import type {
  Message,
  RequestStartEvent,
  StreamEvent,
  TombstoneMessage,
  ToolUseSummaryMessage,
  UserMessage,
  AssistantMessage,
} from '../types/message.js'
import type { SpinnerMode } from '../components/Spinner/types.js'
import type { Tools } from '../Tool.js'
// 对齐上游实现：按 claude-code/src/utils/messages.ts:16
import isObject from 'lodash-es/isObject.js'
// 对齐上游实现：按 claude-code/src/utils/messages.ts:148
import { normalizeToolInput } from './api.js'
// 对齐上游实现：按 claude-code/src/utils/messages.ts:155
import { safeParseJSON } from './json.js'
import { findToolByName } from '../Tool.js'
// 对齐上游实现：按 claude-code/src/utils/messages.ts:25
import { NO_CONTENT_MESSAGE } from '../constants/messages.js'

// 流式工具调用 - 用于表示模型在流式输出中调用的工具
export type StreamingToolUse = {
  index: number // 工具调用在流式输出中的索引
  contentBlock: BetaToolUseBlock // 工具调用的块内容
  unparsedToolInput: string // 未解析的工具输入参数
}

export type StreamingThinking = {
  thinking: string
  isStreaming: boolean
  streamingEndedAt?: number
}

// 对齐上游实现：保持 handleMessageFromStream 的分支结构与调用协议，避免在 REPL 层重写事件判定。
export function handleMessageFromStream(
  message:
    | Message
    | TombstoneMessage
    | StreamEvent
    | RequestStartEvent
    | ToolUseSummaryMessage,
  onMessage: (message: Message) => void,
  onUpdateLength: (newContent: string) => void, // 更新流式输出长度
  onSetStreamMode: (mode: SpinnerMode) => void, // 设置流式输出模式
  onStreamingToolUses: (
    f: (streamingToolUse: StreamingToolUse[]) => StreamingToolUse[], // 处理流式工具调用
  ) => void,
  onTombstone?: (message: Message) => void, // 处理流式消息中的 Tombstone 消息
  onStreamingThinking?: (
    f: (current: StreamingThinking | null) => StreamingThinking | null, // 处理流式思考
  ) => void,
  onApiMetrics?: (metrics: { ttftMs: number }) => void, // 处理流式 API 指标
  onStreamingText?: (f: (current: string | null) => string | null) => void, // 处理流式文本
): void {

  // 处理非流式事件
  if (message.type !== 'stream_event' && message.type !== 'stream_request_start') {
    if (message.type === 'tombstone') {
      const tombstoned = (message as { message?: Message }).message
      if (tombstoned) {
        onTombstone?.(tombstoned)
      }
      return
    }
    if (message.type === 'tool_use_summary') {
      return
    }
    if (message.type === 'assistant') {
      const assistMsg = message as Message
      const contentArr = Array.isArray(assistMsg.message?.content)
        ? assistMsg.message.content
        : []
      const thinkingBlock = contentArr.find(
        block =>
          typeof block !== 'string' &&
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'thinking' &&
          'thinking' in block &&
          typeof block.thinking === 'string',
      ) as { thinking?: string } | undefined
      if (thinkingBlock?.thinking) {
        const tb = thinkingBlock as ThinkingBlock
        onStreamingThinking?.(() => ({
          thinking: tb.thinking,
          isStreaming: false,
          streamingEndedAt: Date.now(),
        }))
      }
    }
    onStreamingText?.(() => null)
    onMessage(message as Message)
    return
  }

  // 处理流式事件
  if (message.type === 'stream_request_start') {
    onSetStreamMode('requesting')
    return
  }

  // 处理流式事件
  const streamMsg = message as {
    type: string
    event: {
      type: string
      content_block: {
        type: string
        id?: string
        name?: string
        input?: Record<string, unknown>
      }
      index: number
      delta: { type: string; text: string; partial_json: string; thinking: string }
      [key: string]: unknown
    }
    ttftMs?: number
    [key: string]: unknown
  }

  if (streamMsg.event.type === 'message_start' && streamMsg.ttftMs != null) {
    onApiMetrics?.({ ttftMs: streamMsg.ttftMs })
  }

  if (streamMsg.event.type === 'message_stop') {
    onSetStreamMode('tool-use') 
    onStreamingToolUses(() => [])
    return
  }

  switch (streamMsg.event.type) {
    // 处理流式事件块开始
    case 'content_block_start': {
      onStreamingText?.(() => null)
      // TODO: 上游这里有 CONNECTOR_TEXT + isConnectorTextBlock 分支；
      // 当前仓尚未复刻对应特性开关与类型工具，待相关模块落地后按源码原样接入。
      switch (streamMsg.event.content_block.type) {
        case 'thinking':
        case 'redacted_thinking':
          onSetStreamMode('thinking')
          return
        case 'text':
          onSetStreamMode('responding')
          return
        case 'tool_use': {
          onSetStreamMode('tool-input')
          const contentBlock = streamMsg.event.content_block as BetaToolUseBlock
          const index = streamMsg.event.index
          onStreamingToolUses(_ => [
            ..._,
            {
              index,
              contentBlock,
              unparsedToolInput: '',
            },
          ])
          return
        }
        case 'server_tool_use': // 服务器工具调用
        case 'web_search_tool_result': // 网络搜索工具结果
        case 'code_execution_tool_result': // 代码执行工具结果
        case 'mcp_tool_use': // MCP 工具调用
        case 'mcp_tool_result': // MCP 工具结果
        case 'container_upload': // 容器上传
        case 'web_fetch_tool_result': // 网络获取工具结果
        case 'bash_code_execution_tool_result': // Bash 代码执行工具结果
        case 'text_editor_code_execution_tool_result': // 文本编辑器代码执行工具结果
        case 'tool_search_tool_result': // 工具搜索工具结果
        case 'compaction': // 压缩
          onSetStreamMode('tool-input')
          return
        default:
          return
      }
    }
    // 处理流式事件块增量
    case 'content_block_delta': {
      switch (streamMsg.event.delta.type) {
        // 处理流式事件块增量文本
        case 'text_delta': {
          const deltaText = streamMsg.event.delta.text
          onUpdateLength(deltaText)
          onStreamingText?.(text => (text ?? '') + deltaText)
          return
        }
        // 处理流式事件块增量输入 JSON
        case 'input_json_delta': {
          const delta = streamMsg.event.delta.partial_json
          const index = streamMsg.event.index
          onUpdateLength(delta)
          onStreamingToolUses(_ => {
            const element = _.find(item => item.index === index)
            if (!element) {
              return _
            }
            return [
              ..._.filter(item => item !== element),
              {
                ...element,
                unparsedToolInput: element.unparsedToolInput + delta,
              },
            ]
          })
          return
        }
        // 处理流式事件块增量思考
        case 'thinking_delta': {
          onUpdateLength(streamMsg.event.delta.thinking)
          return
        }
        // 处理流式事件块增量签名
        case 'signature_delta':
          return
        default:
          return
      }
    }
    // 处理流式事件块结束
    case 'content_block_stop':
      return
    // 处理流式事件增量
    case 'message_delta':
      onSetStreamMode('responding')
      return
    default:
      onSetStreamMode('responding')
      return
  }
}

/**
 * Check if a block is a thinking block. 判断是否为思考块
 */
function isThinkingBlock(block: { type: string }): boolean {
  return block.type === 'thinking' || block.type === 'redacted_thinking'
}

/**
 * Filter trailing thinking blocks from the last message if it's an assistant message.
 * The API doesn't allow assistant messages to end with thinking/redacted_thinking blocks.
 */
// 过滤最后一条 assistant 消息尾部尾部 thinking blocks
function filterTrailingThinkingFromLastAssistant(
  messages: (UserMessage | AssistantMessage)[],
): (UserMessage | AssistantMessage)[] {
  const lastMessage = messages.at(-1)
  // 如果最后一条消息不是 assistant 消息，直接返回么，不允许最后一条消息是 thinking blocks
  if (!lastMessage || lastMessage.type !== 'assistant') {
     // Last message is not assistant, nothing to filter
    return messages
  }

  const content = lastMessage.message?.content
  // 如果最后一条消息内容不是数组，直接返回, thinking blocks只存在于数组中
  if (!Array.isArray(content)) return messages
  // Content中获取最后一个Block
  const lastBlock = content.at(-1)
  if (!lastBlock || typeof lastBlock === 'string' || !isThinkingBlock(lastBlock)) {
    return messages
  }

  // Find last non-thinking block
  let lastValidIndex = content.length - 1
  // 从后往前遍历，找到第一个不是思考块的块
  while (lastValidIndex >= 0) {
    const block = content[lastValidIndex]
    if (!block || typeof block === 'string' || !isThinkingBlock(block)) {
      break
    }
    lastValidIndex--
  }

  // Insert placeholder if all blocks were thinking
  // 如果lastValidIndex小于0，说明所有块都是思考块，直接插入占位符No message content
  // 否则，从数组开头到lastValidIndex+1的块
  const filteredContent =
    lastValidIndex < 0
      ? [{ type: 'text' as const, text: '[No message content]', citations: [] }]
      : content.slice(0, lastValidIndex + 1)

  const result = [...messages]
  result[messages.length - 1] = {
    ...lastMessage,
    message: {
      ...lastMessage.message,
      content: filteredContent,
    },
  }
  return result
}

/**
 * Ensure all non-final assistant messages have non-empty content.
 *
 * The API requires "all messages must have non-empty content except for the
 * optional final assistant message". This can happen when the model returns
 * an empty content array.
 *
 * For non-final assistant messages with empty content, we insert a placeholder.
 * The final assistant message is left as-is since it's allowed to be empty (for prefill).
 *
 * Note: Whitespace-only text content is handled separately by filterWhitespaceOnlyAssistantMessages.
 */
// 确保所有非最后一条 assistant 消息有非空 content
// 设计原因：Anthropic API 允许最后一条 assistant 消息为空（用于 prefill）
function ensureNonEmptyAssistantContent(
  messages: (UserMessage | AssistantMessage)[],
): (UserMessage | AssistantMessage)[] {
  if (messages.length === 0) {
    return messages
  }

  let hasChanges = false
  const result = messages.map((message, index) => {
    // Skip non-assistant messages
    if (message.type !== 'assistant') {
      return message
    }

    // Skip the final message (allowed to be empty for prefill)
    if (index === messages.length - 1) {
      return message
    }

    // Check if content is empty
    const content = message.message?.content
    if (Array.isArray(content) && content.length === 0) {
      hasChanges = true
      return {
        ...message,
        message: {
          ...message.message,
          content: [
            { type: 'text' as const, text: NO_CONTENT_MESSAGE, citations: [] },
          ],
        },
      }
    }

    return message
  })

  return hasChanges ? result : messages
}

// ============================================================================
// normalizeMessagesForAPI
// 设计原因：将消息归一化为符合 Anthropic API 要求的格式

export function normalizeMessagesForAPI(
  messages: Message[],
  _tools: Tools = [],
): (UserMessage | AssistantMessage)[] {
  const result: (UserMessage | AssistantMessage)[] = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // 只处理 user 和 assistant 角色
    if (message.type === 'user') {
      // content 处理：确保 user 消息有 content
      const content = message.message?.content
      if (content === undefined || content === null) {
        continue
      }
      result.push(message as UserMessage)
      continue
    }

    if (message.type === 'assistant') {
      // 对齐上游实现：按 claude-code/src/utils/messages.ts:2226-2264 原样复刻
      // 设计原因：确保 content 始终是数组，且是数组类型
      const content = message.message?.content
      result.push({
        ...message,
        message: {
          ...message.message,
          content: Array.isArray(content) ? content : [],
        },
      } as AssistantMessage)
      continue
    }
  }

  // 对齐上游实现：先过滤尾部 thinking blocks，再确保非空 content
  const withFilteredThinking = filterTrailingThinkingFromLastAssistant(result)
  return ensureNonEmptyAssistantContent(withFilteredThinking)
}

// ============================================================================
// normalizeContentFromAPI
// 对齐上游实现：按 claude-code/src/utils/messages.ts:2675-2800 原样复刻
// 设计原因：流式处理中 tool_use.input 是字符串，需要解析为对象

export function normalizeContentFromAPI(
  contentBlocks: BetaContentBlock[], // 流式事件块数组
  tools: Tools, // 工具配置
): ContentBlock[] {
  if (!contentBlocks) {
    return []
  }

  return contentBlocks.map(contentBlock => {
    switch (contentBlock.type) {
      case 'tool_use': {
        // 对齐上游实现：验证 input 类型
        if (
          typeof contentBlock.input !== 'string' &&
          !isObject(contentBlock.input)
        ) {
          // we stream tool use inputs as strings, but when we fall back, they're objects
          throw new Error('Tool use input must be a string or object')
        }

        // 对齐上游实现：流式处理时 input 是 JSON 字符串，需要解析
        // With fine-grained streaming on, we are getting a stringied JSON back from the API.
        // The API has strange behaviour, where it returns nested stringified JSONs, and so
        // we need to recursively parse these.
        let normalizedInput: unknown
        if (typeof contentBlock.input === 'string') {
          const parsed = safeParseJSON(contentBlock.input)
          normalizedInput = parsed ?? {}
        } else {
          normalizedInput = contentBlock.input
        }

        // 对齐上游实现：应用工具特定的输入规范化
        if (typeof normalizedInput === 'object' && normalizedInput !== null) {
          const tool = findToolByName(tools, contentBlock.name)
          if (tool) {
            try {
              normalizedInput = normalizeToolInput(
                tool,
                normalizedInput as { [key: string]: unknown },
              )
            } catch {
              // Keep the original input if normalization fails
            }
          }
        }

        return {
          ...contentBlock,
          input: normalizedInput,
        } as ContentBlock
      }
      case 'text':
        // Return the block as-is to preserve exact content for prompt caching.
        return contentBlock as unknown as ContentBlock
      case 'mcp_tool_use':
      case 'mcp_tool_result':
      case 'container_upload':
        // Beta-specific content blocks - pass through as-is
        return contentBlock as unknown as ContentBlock
      case 'server_tool_use':
        if (typeof contentBlock.input === 'string') {
          return {
            ...contentBlock,
            input: (safeParseJSON(contentBlock.input) ?? {}) as {
              [key: string]: unknown
            },
          } as ContentBlock
        }
        return contentBlock as unknown as ContentBlock
      default:
        return contentBlock as unknown as ContentBlock
    }
  })
}

