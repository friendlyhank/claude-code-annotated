/**
 * Claude Code Annotated - REPL 主界面
 *
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
import { getTools } from '../tools.js'
import type { Message, StreamEvent } from '../types/message.js'
import type { ToolPermissionContext } from '../types/permissions.js'
import type { SpinnerMode } from '../components/Spinner/types.js'
import {
  handleMessageFromStream,
  type StreamingThinking,
  type StreamingToolUse,
} from '../utils/messages.js'
import {
  handlePromptSubmit,
  type PromptInputHelpers,
} from '../utils/handlePromptSubmit.js'
import { getSystemPrompt } from '../constants/prompts.js'
import { buildEffectiveSystemPrompt } from '../utils/systemPrompt.js'
import { getSystemContext, getUserContext } from '../context.js'
import { useMainLoopModel } from '../hooks/useMainLoopModel.js'

// ========================================
// 类型定义
// ========================================

export type Props = {
  debug?: boolean // 是否开启调试模式
  initialMessages?: Message[] // 初始消息
  systemPrompt?: string // 系统提示
  appendSystemPrompt?: string // 追加系统提示，用于自定义能力或上下文
  mainThreadAgentDefinition?: undefined // 主线程智能体定义，用于自定义智能体行为或能力
  onBeforeQuery?: ( // 在查询前调用，用于自定义查询前的行为
    input: string,
    newMessages: Message[],
  ) => Promise<boolean>
  onTurnComplete?: (messages: Message[]) => void | Promise<void> // 在查询后调用，用于自定义查询后的行为
}

function createMessageUUID(): UUID {
  return randomUUID() as UUID
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

// 对齐上游实现：创建默认权限上下文
// 参考 claude-code/src/screens/REPL.tsx 中 store.getState().toolPermissionContext
function createDefaultPermissionContext(): ToolPermissionContext {
  return {
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    isBypassPermissionsModeAvailable: false,
  }
}

// ========================================
// REPL 组件
// ========================================

export function REPL({
  debug = false, // 是否开启调试模式
  initialMessages, // 初始消息
  systemPrompt: customSystemPrompt, // 自定义系统提示词
  appendSystemPrompt, // 追加系统提示词
  mainThreadAgentDefinition, // 主线程智能定义
  onBeforeQuery, // 查询前回调
  onTurnComplete, // 回合结束回调
}: Props): ReactNode {
  const { exit } = useApp()
 
  const [input, setInput] = useState('') // 设置输入状态
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []) // 管理完整的历史消息
  const [isProcessing, setIsProcessing] = useState(false) // 程序是否正在进行状态
  const [lastTerminalReason, setLastTerminalReason] = useState<string>() // 最后一个终端状态的 reason
  const [lastStreamEventType, setLastStreamEventType] = useState<string>() // 最后一个流式事件的 type
  const [streamMode, setStreamMode] = useState<SpinnerMode>('requesting') // 流式事件的模式
  const [streamingText, setStreamingText] = useState<string | null>(null) // 流式事件的文本内容
  const [streamingThinking, setStreamingThinking] = useState<StreamingThinking | null>(
    null,
  ) // 流式事件的思考状态
  const [streamingToolUses, setStreamingToolUses] = useState<StreamingToolUse[]>([]) // 流式事件的工具使用记录
  // 记录响应长度，流式事件中会累加
  const [responseLength, setResponseLength] = useState(0) // 响应长度状态变量
  const [lastTTFTMs, setLastTTFTMs] = useState<number>() // 最后一个流式事件的 ttftMs
  const [userInputOnProcessing, setUserInputOnProcessing] = useState<string>() // 当前正在处理的那条用户输入文本
  const [abortController, setAbortController] = useState<AbortController | null>(
    null,
  )
  const messagesRef = useRef<Message[]>(initialMessages ?? [])

  const mainLoopModel = useMainLoopModel()

  // 获取工具使用上下文
  const getToolUseContext = useCallback(
    (
      messages: Message[],
      _newMessages: Message[],
      abortController: AbortController,
      _mainLoopModel: string,
    ): ToolUseContext => {
      const permissionContext = createDefaultPermissionContext()
      const tools: Tools = getTools(permissionContext)

      return {
        options: {
          commands: [],
          debug,
          mainLoopModel,
          tools,
          verbose: debug,
          isNonInteractiveSession: false,
          customSystemPrompt,
          appendSystemPrompt,
        },
        abortController,
        getAppState: () => ({ toolPermissionContext: permissionContext }),
        setAppState: _updater => {},
        setInProgressToolUseIDs: _updater => {},
        setResponseLength: _updater => {},
        updateFileHistoryState: _updater => {},
        updateAttributionState: _updater => {},
        messages,
      }
    },
    [debug, customSystemPrompt, appendSystemPrompt, mainLoopModel],
  )

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

  // 统一的消息处理时间，即处理流式消息中也处理完整消息
  const onQueryEvent = useCallback(
    (event: Parameters<typeof handleMessageFromStream>[0]): void => {
      handleMessageFromStream(
        event,
        newMessage => {
          appendMessage(newMessage)
        },
        newContent => {
          setResponseLength(length => length + newContent.length)
        },
        mode => {
          setStreamMode(mode)
        },
        update => {
          setStreamingToolUses(update)
        },
        tombstonedMessage => {
          setMessages(oldMessages => oldMessages.filter(m => m !== tombstonedMessage))
        },
        setStreamingThinking,
        metrics => {
          setLastTTFTMs(metrics.ttftMs)
        },
        update => {
          setStreamingText(update)
        },
      )
      if (isStreamEvent(event)) {
        setLastStreamEventType(event.type)
      }
    },
    [appendMessage],
  )

  // 处理查询实现
  const onQueryImpl = useCallback(
    // 定义一个异步函数，入参是"本轮要发送的完整消息历史"（包含新用户消息）
    async (
      messagesIncludingNewMessages: Message[],
      queryAbortController: AbortController,
    ): Promise<void> => {
      // 获取工具使用上下文
      const toolUseContext = getToolUseContext(
        messagesRef.current,
        [],
        queryAbortController,
        mainLoopModel,
      )
      const freshTools = toolUseContext.options.tools

      const [defaultSystemPrompt, userContext, systemContext] = await Promise.all([
        getSystemPrompt(
          freshTools,
          mainLoopModel,
          Array.from(
            createDefaultPermissionContext().additionalWorkingDirectories.keys(),
          ),
        ),
        getUserContext(),
        getSystemContext(),
      ])

      const systemPrompt = buildEffectiveSystemPrompt({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt,
        defaultSystemPrompt,
        appendSystemPrompt,
      })
      toolUseContext.renderedSystemPrompt = systemPrompt

      const iterator = query({
        messages: messagesIncludingNewMessages,
        systemPrompt,
        userContext,
        systemContext,
        canUseTool: async () => ({ result: true } as const),
        toolUseContext,
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

      await onTurnComplete?.(messagesRef.current)
    },
    [appendMessage, onQueryEvent, customSystemPrompt, appendSystemPrompt, mainThreadAgentDefinition, getToolUseContext, onTurnComplete, mainLoopModel],
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
    setStreamingText(null)
    setStreamingThinking(null)
    setStreamingToolUses([])
    setResponseLength(0)
    setLastTTFTMs(undefined)
    setStreamMode('requesting')

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
        mainLoopModel,
        querySource: 'repl' as QuerySource,
        getToolUseContext,
        setUserInputOnProcessing,
        setAbortController,
        onQuery,
        canUseTool: async () => ({ result: true } as const),
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
  }, [appendMessage, input, isProcessing, onQuery, getToolUseContext, mainLoopModel])

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
            {` [mode:${streamMode}]`}
            {` [len:${responseLength}]`}
            {lastTTFTMs !== undefined ? ` [ttft:${lastTTFTMs}ms]` : ''}
            {streamingToolUses.length > 0
              ? ` [tool_uses:${streamingToolUses.length}]`
              : ''}
          </Text>
        </Box>
      )}
      {isProcessing && streamingText && (
        <Box marginBottom={1}>
          <Text dimColor>{streamingText}</Text>
        </Box>
      )}
      {isProcessing && streamingThinking?.thinking && (
        <Box marginBottom={1}>
          <Text dimColor>{streamingThinking.thinking}</Text>
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