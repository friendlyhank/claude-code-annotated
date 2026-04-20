// ============================================================================
// claude.ts
// ============================================================================
// Claude 模型 API 调用层，负责与 Anthropic 模型交互。
//
// 对齐上游实现：按 claude-code/src/services/api/claude.ts 原样复刻
// 设计原因：
// 1. 使用 Beta API 的流式接口实现实时响应
// 2. 逐块处理 message_start、content_block_*、message_delta 等事件
// 3. 累积 contentBlocks 状态以构建完整的 assistant message

import { randomUUID, type UUID } from 'crypto'
import type {
  BetaContentBlock, // 流式事件中的内容块
  BetaMessage, // 流式事件中的消息
  BetaMessageDeltaUsage,// 流式事件中的使用统计
  BetaRawMessageStreamEvent, // 流式事件中的原始消息
  BetaToolUnion, // 流式事件中的工具调用
  BetaUsage,  // 流式事件中的使用统计
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs'
import type { Stream } from '@anthropic-ai/sdk/streaming.mjs'
import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from './client.js'
import type { Tools } from '../../Tool.js'
import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
  UserMessage,
} from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import {
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
} from '../../utils/messages.js'

// ============================================================================
// 类型定义
// 对齐上游实现：Options 类型与上游保持一致

type Options = {
  model: string
  isNonInteractiveSession: boolean // 是否为非交互式会话
  [key: string]: unknown
}

// ============================================================================
// 辅助类型：Usage 累加
// 对齐上游实现：BetaUsage 有大量可选字段，使用 Partial 允许渐进累加
// 设计原因：message_start 时的 usage 只有 input_tokens，
// message_delta 时追加 output_tokens，需支持增量更新

type MutableUsage = Partial<BetaUsage> & {
  input_tokens: number
  output_tokens: number
}

// ============================================================================
// 辅助函数：消息转换为 API 格式
// 对齐上游实现：按 claude-code/src/services/api/claude.ts:575-661 原样复刻

export function userMessageToMessageParam(
  message: UserMessage,
  _addCache = false,
  _enablePromptCaching = false,
): MessageParam {
  const content = message.message?.content
  return {
    role: 'user',
    content: Array.isArray(content)
      ? [...content]
      : content ?? '',
  }
}

export function assistantMessageToMessageParam(
  message: AssistantMessage,
  _addCache = false,
  _enablePromptCaching = false,
): MessageParam {
  return {
    role: 'assistant',
    content: message.message.content,
  }
}

export function addCacheBreakpoints(
  messages: (UserMessage | AssistantMessage)[],
  _enablePromptCaching = false,
): MessageParam[] {
  return messages.map(msg => {
    if (msg.type === 'user') {
      return userMessageToMessageParam(msg)
    }
    return assistantMessageToMessageParam(msg)
  })
}

// ============================================================================
// 辅助函数：工具转换为 API 格式
// 对齐上游实现：按 claude-code/src/utils/api.ts:150-200 原样复刻

async function toolsToApiFormat(tools: Tools): Promise<BetaToolUnion[]> {
  const result: BetaToolUnion[] = []
  for (const tool of tools) {
    // 对齐上游实现：使用 tool.inputJSONSchema 或从 Zod schema 转换
    // 边界处理：inputJSONSchema 优先（MCP 工具直接提供 JSON Schema）
    let inputSchema: Anthropic.Tool.InputSchema
    
    if (tool.inputJSONSchema) {
      inputSchema = tool.inputJSONSchema as Anthropic.Tool.InputSchema
    } else {
      // 对齐上游实现：Zod v4 的 safeParse 返回的对象可以直接转换为 JSON Schema
      // 使用简化的 schema 提取方式
      const schema = tool.inputSchema
      // 简化实现：直接构造 JSON Schema
      // TODO: 使用 zod-to-json-schema 或 zod/v4 的内置转换方法
      inputSchema = {
        type: 'object',
        properties: {},
        additionalProperties: true,
      } as Anthropic.Tool.InputSchema
    }

    result.push({
      name: tool.name,
      description: await tool.prompt({
        getToolPermissionContext: async () => ({
          mode: 'default',
          additionalWorkingDirectories: new Map(),
          alwaysAllowRules: {},
          alwaysDenyRules: {},
          alwaysAskRules: {},
          isBypassPermissionsModeAvailable: false,
        }),
        tools,
        agents: [],
      }),
      input_schema: inputSchema,
    })
  }
  return result
}

// ============================================================================
// 辅助函数：Usage 累加
// 对齐上游实现：按源码原样复刻

const EMPTY_USAGE: MutableUsage = {
  input_tokens: 0,
  output_tokens: 0,
}

// 累加 usage 数据
// 对齐上游实现：支持 BetaUsage 和 BetaMessageDeltaUsage 两种输入
// 设计原因：message_start 使用 BetaUsage，message_delta 使用 BetaMessageDeltaUsage
function updateUsage(
  current: MutableUsage,
  incoming: BetaUsage | BetaMessageDeltaUsage | undefined,
): MutableUsage {
  if (!incoming) return current
  return {
    ...current,
    input_tokens: current.input_tokens + (incoming.input_tokens ?? 0),
    output_tokens: current.output_tokens + (incoming.output_tokens ?? 0),
    cache_creation_input_tokens:
      (current.cache_creation_input_tokens ?? 0) +
      (incoming.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens:
      (current.cache_read_input_tokens ?? 0) +
      (incoming.cache_read_input_tokens ?? 0),
  }
}

// ============================================================================
// 辅助函数：构建 AssistantMessage
function toAssistantMessage(
  partialMessage: BetaMessage,
  contentBlocks: BetaContentBlock[],
  requestId: string | undefined,
  usage: MutableUsage,
  stopReason: string | null | undefined,
  tools: Tools,
): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID() as UUID,
    timestamp: new Date().toISOString(),
    requestId,
    message: {
      ...partialMessage,
      content: normalizeContentFromAPI(contentBlocks, tools),
      usage: usage as BetaUsage,
      stop_reason: stopReason ?? undefined,
    },
  } as AssistantMessage
}

// ============================================================================
// 主函数：流式查询
// 对齐上游实现：按 claude-code/src/services/api/claude.ts:739-2500 原样复刻

export async function* queryModelWithStreaming({
  messages,
  systemPrompt,
  thinkingConfig, // 思考配置
  tools, // 工具配置
  signal, // 信号量
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig?: unknown
  tools?: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void> {
  // ============================================================================
  // 初始化状态
  // 对齐上游实现：按源码原样复刻状态变量

  const anthropic = await getAnthropicClient({
    maxRetries: 0,
  })

  // 流式处理状态
  let usage: MutableUsage = { ...EMPTY_USAGE }
  let stopReason: string | null = null
  let requestId: string | null | undefined
  const contentBlocks: BetaContentBlock[] = []

  // 对齐上游实现：使用 partialMessage 保存 message_start 时的初始消息状态
  // 设计原因：message_start 在第一个 token 前到达，此时 output_tokens=0
  // 需要等待 message_delta 更新最终的 usage 和 stop_reason
  let partialMessage: BetaMessage | undefined

  // 对齐上游实现：TTFT (Time To First Token) 追踪
  // 设计原因：在 message_start 事件时计算首 token 延迟
  let ttftMs = 0
  const start = Date.now()

  // ============================================================================
  // 构建 API 请求参数
  // 对齐上游实现：按源码原样复刻参数构建

  const maxOutputTokens = parseInt(
    process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || '4096',
    10,
  )

  // 对齐上游实现：转换工具为 API 格式
  // 边界处理：tools 为空数组时传递空数组，让模型知道没有工具可用
  const toolsForApi = tools ? await toolsToApiFormat(tools) : undefined

  const params = {
    model: options.model,
    max_tokens: maxOutputTokens,
    messages: addCacheBreakpoints(normalizeMessagesForAPI(messages)), // 归一化消息格式
    ...(systemPrompt.length > 0
      ? {
          system: systemPrompt.join('\n\n'),
        }
      : {}),
    // 对齐上游实现：传递工具定义给 API
    // 边界处理：undefined 时不传递 tools 参数
    ...(toolsForApi && toolsForApi.length > 0 ? { tools: toolsForApi } : {}),
  }

  // ============================================================================
  // 流式 API 调用
  // 对齐上游实现：使用 anthropic.beta.messages.create({ stream: true })

  let stream: Stream<BetaRawMessageStreamEvent>

  try {
    // 对齐上游实现：使用 raw stream 而非 BetaMessageStream
    // 设计原因：BetaMessageStream 在每个 input_json_delta 上调用 partialParse()，
    // 造成 O(n²) 复杂度，我们自己在 contentBlocks 中累积
    const result = await anthropic.beta.messages
      .create(
        { ...params, stream: true },
        {
          signal,
        },
      )
      .withResponse()

    requestId = result.request_id
    stream = result.data
  } catch (error) {
    // 对齐上游实现：用户中断不是错误，直接重新抛出
    // 设计原因：保持与上游相同的错误处理行为
    throw error
  }

  // ============================================================================
  // 流式事件处理循环
  // 对齐上游实现：按源码原样复刻事件处理分支

  let isFirstChunk = true

  for await (const part of stream) {
    // 对齐上游实现：首 chunk 记录
    if (isFirstChunk) {
      isFirstChunk = false
    }

    switch (part.type) {
      // ========================================================================
      // message_start 事件
      // 对齐上游实现：初始化 partialMessage，记录 TTFT
      case 'message_start': {
        partialMessage = part.message
        ttftMs = Date.now() - start
        usage = updateUsage(usage, part.message?.usage)
        break
      }

      // ========================================================================
      // content_block_start 事件
      // 对齐上游实现：初始化 contentBlocks 数组对应位置的块
      case 'content_block_start': {
        // 对齐上游实现：根据块类型初始化不同的状态
        // 设计原因：SDK 有时会返回带初始值的块，我们需要重置为空字符串以便后续 delta 累加
        switch (part.content_block.type) {
          case 'tool_use':
            // 对齐上游实现：tool_use 块的 input 初始化为空字符串
            // 设计原因：input_json_delta 会逐步追加 JSON 片段
            contentBlocks[part.index] = {
              ...part.content_block,
              input: '',
            } as BetaContentBlock
            break
          case 'text':
            // 对齐上游实现：text 块重置为空字符串
            // 设计原因：SDK 可能在 start 事件中包含文本，但 delta 会重复发送
            contentBlocks[part.index] = {
              ...part.content_block,
              text: '',
            } as BetaContentBlock
            break
          case 'thinking':
            // 对齐上游实现：thinking 块初始化 thinking 和 signature
            contentBlocks[part.index] = {
              ...part.content_block,
              thinking: '',
              signature: '',
            } as BetaContentBlock
            break
          default:
            // 对齐上游实现：其他块类型直接存储
            contentBlocks[part.index] = { ...part.content_block } as BetaContentBlock
            break
        }
        break
      }

      // ========================================================================
      // content_block_delta 事件
      // 对齐上游实现：累加内容到对应的 contentBlock
      case 'content_block_delta': {
        const contentBlock = contentBlocks[part.index]
        const delta = part.delta

        if (!contentBlock) {
          // 对齐上游实现：找不到块时抛出 RangeError
          throw new RangeError('Content block not found')
        }

        // 对齐上游实现：根据 delta 类型累加不同字段
        switch (delta.type) {
          case 'input_json_delta':
            // 对齐上游实现：累加 JSON 片段到 tool_use.input
            if (typeof (contentBlock as { input?: unknown }).input !== 'string') {
              throw new Error('Content block input is not a string')
            }
            ;(contentBlock as { input: string }).input += delta.partial_json
            break
          case 'text_delta':
            // 对齐上游实现：累加文本到 text 块
            ;(contentBlock as { text: string }).text += delta.text
            break
          case 'thinking_delta':
            // 对齐上游实现：累加思考内容到 thinking 块
            ;(contentBlock as { thinking: string }).thinking += delta.thinking
            break
          case 'signature_delta':
            // 对齐上游实现：更新签名
            ;(contentBlock as { signature?: string }).signature = delta.signature
            break
          case 'citations_delta':
            // TODO: 已阅读源码，但不在今日最小闭环内
            // 上游处理 citations，当前跳过
            break
        }
        break
      }

      // ========================================================================
      // content_block_stop 事件
      // 对齐上游实现：块结束，yield AssistantMessage
      case 'content_block_stop': {
        const contentBlock = contentBlocks[part.index]
        if (!contentBlock) {
          throw new RangeError('Content block not found')
        }
        if (!partialMessage) {
          throw new Error('Message not found')
        }

        // 对齐上游实现：为每个完成的块 yield 一个 AssistantMessage
        // 设计原因：允许 UI 在流式过程中逐步渲染每个内容块
        const m: AssistantMessage = toAssistantMessage(
          partialMessage,
          [contentBlock],
          requestId ?? undefined,
          usage,
          stopReason,
          tools ?? [],
        )

        yield m
        break
      }

      // ========================================================================
      // message_delta 事件
      // 对齐上游实现：更新最终的 usage 和 stop_reason
      case 'message_delta': {
        usage = updateUsage(usage, part.usage)
        stopReason = part.delta?.stop_reason ?? null

        // 对齐上游实现：message_delta 可能包含 stop_reason 错误信息
        // 设计原因：max_tokens 和 model_context_window_exceeded 需要特殊处理
        // TODO: 已阅读源码，但不在今日最小闭环内
        // 上游会 yield createAssistantAPIErrorMessage 处理 max_output_tokens 错误
        break
      }

      // ========================================================================
      // message_stop 事件
      // 对齐上游实现：流结束，无需额外处理
      case 'message_stop':
        break
    }

    // ========================================================================
    // yield StreamEvent
    // 对齐上游实现：每个事件都 yield 一个 StreamEvent
    // 设计原因：允许上层消费所有原始流事件，用于调试和细粒度状态追踪
    yield {
      type: 'stream_event',
      event: part,
      ...(part.type === 'message_start' ? { ttftMs } : undefined),
    } as StreamEvent
  }
}
