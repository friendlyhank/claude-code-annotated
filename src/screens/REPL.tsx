/**
 * Claude Code Annotated - REPL 主界面
 *
 * 源码复刻参考: claude-code/src/screens/REPL.tsx
 *
 * 功能:
 * - 主交互界面
 * - 用户输入处理
 * - 消息显示
 * - 最小 query() 代理循环接线
 */

import { randomUUID, type UUID } from 'crypto'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { QuerySource } from '../constants/querySource.js'
import { Box, Text, useApp, useInput } from '../ink.js'
import { query } from '../query.js'
import type { ToolUseContext, Tools } from '../Tool.js'
import type { Message, StreamEvent } from '../types/message.js'
import {
  handlePromptSubmit,
  type PromptInputHelpers,
} from '../utils/handlePromptSubmit.js'
import { asSystemPrompt } from '../utils/systemPromptType.js'

// ========================================
// 类型定义
// ========================================

export type Props = {
  debug?: boolean
  initialMessages?: Message[]
}

const DEFAULT_SYSTEM_PROMPT = asSystemPrompt([
  'You are Claude Code Annotated, a replica-in-progress of Claude Code.',
])
const DEFAULT_MAIN_LOOP_MODEL =
  process.env.ANTHROPIC_MODEL ??
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ??
  'claude-sonnet-4-6'

function createMessageUUID(): UUID {
  return randomUUID() as UUID
}

function isMessage(event: unknown): event is Message {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    'uuid' in event
  )
}

function isStreamEvent(event: unknown): event is StreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    typeof event.type === 'string' &&
    !('uuid' in event)
  )
}

// 检查终端状态
function isTerminalWithReason(
  value: unknown,
): value is { reason: string; error?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reason' in value &&
    typeof value.reason === 'string'
  )
}

function formatMessageContent(message: Message): string {
  const content = message.message?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map(block => {
        if (typeof block === 'string') {
          return block
        }
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'text' &&
          'text' in block &&
          typeof block.text === 'string'
        ) {
          return block.text
        }
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'tool_result' &&
          'content' in block &&
          typeof block.content === 'string'
        ) {
          return block.content
        }
        return JSON.stringify(block)
      })
      .join('\n')
  }

  if (typeof message.toolUseResult === 'string') {
    return message.toolUseResult
  }

  return ''
}

function getMessageLabel(message: Message): string {
  switch (message.type) {
    case 'user':
      return 'You'
    case 'assistant':
      return 'Assistant'
    case 'system':
      return 'System'
    default:
      return message.type
  }
}

function getMessageColor(message: Message): 'cyan' | 'green' | 'yellow' {
  switch (message.type) {
    case 'user':
      return 'cyan'
    case 'assistant':
      return 'green'
    default:
      return 'yellow'
  }
}

// 对齐上游职责：REPL 负责在交互层准备 toolUseContext，再把它交给 query() 消费。
// 当前只补最小闭环所需字段，权限、文件缓存、hooks 等复杂能力继续延后复刻。
function createReplToolUseContext(
  messages: Message[],
  debug: boolean,
  abortController: AbortController,
): ToolUseContext {
  const tools: Tools = []

  return {
    options: {
      commands: [],
      debug,
      mainLoopModel: DEFAULT_MAIN_LOOP_MODEL,
      tools,
      verbose: debug,
      isNonInteractiveSession: false,
    },
    abortController,
    getAppState: () => ({}),
    setAppState: _updater => {},
    setInProgressToolUseIDs: _updater => {},
    setResponseLength: _updater => {},
    updateFileHistoryState: _updater => {},
    updateAttributionState: _updater => {},
    messages,
  }
}

// ========================================
// REPL 组件
// ========================================

export function REPL({ debug = false, initialMessages }: Props): ReactNode {
  const { exit } = useApp()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [isProcessing, setIsProcessing] = useState(false) // 程序是否正在进行状态
  const [lastTerminalReason, setLastTerminalReason] = useState<string>()
  const [lastStreamEventType, setLastStreamEventType] = useState<string>()
  // 当前正在处理的那条用户输入文本
  const [userInputOnProcessing, setUserInputOnProcessing] = useState<string>()
  const [abortController, setAbortController] = useState<AbortController | null>(
    null,
  )
  const messagesRef = useRef<Message[]>(initialMessages ?? [])

  const appendMessage = useCallback((message: Message): void => {
    const next = [...messagesRef.current, message]
    messagesRef.current = next
    setMessages(next)
  }, [])

  const appendMessages = useCallback((nextMessages: Message[]): void => {
    if (nextMessages.length === 0) {
      return
    }
    // 新消息同步更新到messagesRef.current
    const next = [...messagesRef.current, ...nextMessages]
    messagesRef.current = next
    setMessages(next)
  }, [])

  // 处理查询事件
  const onQueryEvent = useCallback(
    (event: unknown): void => {
      if (isMessage(event)) {
        appendMessage(event)
        return
      }
      // 对齐上游事件消费边界：即使暂未复刻完整 handleMessageFromStream，也保留最小可见 stream 反馈。
      if (isStreamEvent(event)) {
        setLastStreamEventType(event.type)
      }
    },
    [appendMessage],
  )

  // 处理查询实现
  const onQueryImpl = useCallback(
    // 定义一个异步函数，入参是“本轮要发送的完整消息历史”（包含新用户消息）
    async (
      messagesIncludingNewMessages: Message[],
      queryAbortController: AbortController,
    ): Promise<void> => {
      const iterator = query({
        messages: messagesIncludingNewMessages,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userContext: {},
        systemContext: {},
        canUseTool: async () => true,
        toolUseContext: createReplToolUseContext(
          messagesRef.current,
          debug,
          queryAbortController,
        ),
        querySource: 'repl' as QuerySource,
      })

      while (true) {
        const step = await iterator.next()
        // step.done === true 时，查询迭代器完成，step.value拿到最终返回结果
        if (step.done) {
          if (isTerminalWithReason(step.value)) {
            setLastTerminalReason(step.value.reason)
            if (
              step.value.reason === 'model_error' &&
              step.value.error instanceof Error
            ) {
              appendMessage({
                type: 'system',
                uuid: createMessageUUID(),
                message: {
                  role: 'system',
                  content: step.value.error.message,
                },
              } as Message)
            }
          }
          break
        }

        // 流式请求过程，处理查询事件
        onQueryEvent(step.value)
      }
    },
    [appendMessage, debug, onQueryEvent],
  )

  // 处理查询
  const onQuery = useCallback(
    async (
      newMessages: Message[],
      queryAbortController: AbortController,
      shouldQuery: boolean,
      _additionalAllowedTools: string[],
      _mainLoopModel: string,
      _onBeforeQuery?: (input: string, newMessages: Message[]) => Promise<boolean>,
      _input?: string,
    ): Promise<void> => {
      if (!shouldQuery) {
        return
      }
      // 追加新消息到消息历史
      appendMessages(newMessages)
      // 新消息同步更新到messagesRef.current
      const latestMessages = messagesRef.current
      await onQueryImpl(latestMessages, queryAbortController)
    },
    [appendMessages, onQueryImpl],
  )

  // 处理提交
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!input.trim() || isProcessing) {
      return
    }
    setIsProcessing(true)
    setLastTerminalReason(undefined)
    setLastStreamEventType(undefined)

    const helpers: PromptInputHelpers = {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {},
    }

    try {
      // 处理用户输入，包括普通文本和工具调用
      await handlePromptSubmit({
        input,
        helpers,
        onInputChange: setInput,
        messages: messagesRef.current,
        mainLoopModel: DEFAULT_MAIN_LOOP_MODEL,
        querySource: 'repl' as QuerySource,
        getToolUseContext: (messages, _newMessages, controller, _mainLoopModel) =>
          createReplToolUseContext(messages, debug, controller),
        setUserInputOnProcessing,
        setAbortController,
        onQuery,
        canUseTool: async () => true,
      })
    } catch (error) {
      appendMessage({
        type: 'system',
        uuid: createMessageUUID(),
        message: {
          role: 'system',
          content:
            error instanceof Error ? error.message : 'Unknown REPL error',
        },
      } as Message)
      setLastTerminalReason('repl_error')
    } finally {
      setIsProcessing(false)
    }
  }, [appendMessage, debug, input, isProcessing, onQuery])

  useInput(
    (char, key) => {
      if (key.return) {
        // Enter 键触发提交
        void handleSubmit()
        return
      }

      if (key.backspace || key.delete) {
        setInput(prev => prev.slice(0, -1))
        return
      }

      if (key.escape) {
        abortController?.abort('user_escape')
        exit()
        return
      }

      if (char && !key.ctrl && !key.meta) {
        setInput(prev => prev + char)
      }
    },
    { isActive: !isProcessing },
  )

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Claude Code Annotated</Text>
        <Text dimColor>
          Enter 直接把输入送入 `query()`；ESC 退出当前 REPL。
        </Text>
      </Box>

      {messages.length === 0 && (
        <Box marginBottom={1}>
          <Text dimColor>等待第一条消息，验证 REPL 到代理循环的最小闭环。</Text>
        </Box>
      )}

      {messages.map(message => (
        <Box key={message.uuid} marginBottom={1} flexDirection="column">
          <Text bold color={getMessageColor(message)}>
            {getMessageLabel(message)}:
          </Text>
          <Text>{formatMessageContent(message) || '[empty message]'}</Text>
        </Box>
      ))}

      {isProcessing && (
        <Box marginBottom={1}>
          <Text dimColor>
            Processing query loop...
            {userInputOnProcessing ? ` ${userInputOnProcessing}` : ''}
            {lastStreamEventType ? ` [${lastStreamEventType}]` : ''}
          </Text>
        </Box>
      )}

      {lastTerminalReason && (
        <Box marginBottom={1}>
          <Text dimColor>Terminal reason: {lastTerminalReason}</Text>
        </Box>
      )}

      <Box>
        <Text bold color="blue">
          &gt;{' '}
        </Text>
        <Text>{input}</Text>
        <Text dimColor>_</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>[Enter: Send] [ESC: Exit]</Text>
      </Box>
    </Box>
  )
}
