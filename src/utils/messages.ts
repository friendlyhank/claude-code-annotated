import type { BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ThinkingBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type {
  Message,
  RequestStartEvent,
  StreamEvent,
  TombstoneMessage,
  ToolUseSummaryMessage,
} from '../types/message.js'
import type { SpinnerMode } from '../components/Spinner/types.js'

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

  if (message.type === 'stream_request_start') {
    onSetStreamMode('requesting')
    return
  }

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
        case 'server_tool_use':
        case 'web_search_tool_result':
        case 'code_execution_tool_result':
        case 'mcp_tool_use':
        case 'mcp_tool_result':
        case 'container_upload':
        case 'web_fetch_tool_result':
        case 'bash_code_execution_tool_result':
        case 'text_editor_code_execution_tool_result':
        case 'tool_search_tool_result':
        case 'compaction':
          onSetStreamMode('tool-input')
          return
        default:
          return
      }
    }
    case 'content_block_delta': {
      switch (streamMsg.event.delta.type) {
        case 'text_delta': {
          const deltaText = streamMsg.event.delta.text
          onUpdateLength(deltaText)
          onStreamingText?.(text => (text ?? '') + deltaText)
          return
        }
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
        case 'thinking_delta': {
          onUpdateLength(streamMsg.event.delta.thinking)
          return
        }
        case 'signature_delta':
          return
        default:
          return
      }
    }
    case 'content_block_stop':
      return
    case 'message_delta':
      onSetStreamMode('responding')
      return
    default:
      onSetStreamMode('responding')
      return
  }
}
