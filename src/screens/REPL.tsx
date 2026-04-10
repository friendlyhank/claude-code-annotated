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
import type { Message, UserMessage } from '../types/message.js'
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

function createMessageUUID(): UUID {
  return randomUUID() as UUID
}

function createUserTextMessage(content: string): UserMessage {
  return {
    type: 'user',
    uuid: createMessageUUID(),
    message: {
      role: 'user',
      content,
    },
  } as UserMessage
}

function isMessage(event: unknown): event is Message {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    'uuid' in event
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
): ToolUseContext {
  const tools: Tools = []

  return {
    options: {
      commands: [],
      debug,
      mainLoopModel: 'mock-main-loop-model',
      tools,
      verbose: debug,
      isNonInteractiveSession: false,
    },
    abortController: new AbortController(),
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastTerminalReason, setLastTerminalReason] = useState<string>()
  const messagesRef = useRef<Message[]>(initialMessages ?? [])

  // appendMessage 用于在消息列表末尾添加新消息。
  const appendMessage = useCallback((message: Message): void => {
    setMessages(prev => {
      const next = [...prev, message]
      messagesRef.current = next
      return next
    })
  }, [])

  const handleSubmit = useCallback(async (): Promise<void> => {
    const userInput = input.trim()
    if (!userInput || isProcessing) {
      return
    }

    const userMessage = createUserTextMessage(userInput)
    appendMessage(userMessage)
    setInput('')
    setIsProcessing(true)
    setLastTerminalReason(undefined)

    try {
      // 调用 query() 函数(流式对话请求)，获取消息产出。
      const iterator = query({
        messages: [...messagesRef.current],
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userContext: {},
        systemContext: {},
        canUseTool: async () => true,
        toolUseContext: createReplToolUseContext(messagesRef.current, debug),
        querySource: 'repl' as QuerySource,
      })

      while (true) {
        const step = await iterator.next()
        if (step.done) {
          if (
            typeof step.value === 'object' &&
            step.value !== null &&
            'reason' in step.value &&
            typeof step.value.reason === 'string'
          ) {
            setLastTerminalReason(step.value.reason)
          }
          break
        }

        if (isMessage(step.value)) {
          appendMessage(step.value)
        }
      }
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
  }, [appendMessage, debug, input, isProcessing])

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
          <Text dimColor>Processing query loop...</Text>
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
