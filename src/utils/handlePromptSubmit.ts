import { randomUUID, type UUID } from 'crypto'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import type { QuerySource } from '../constants/querySource.js'
import type { ToolUseContext } from '../Tool.js'
import type { Message, UserMessage } from '../types/message.js'

// ============================================================================
// QueuedCommand type
// 对齐上游实现：按 claude-code/src/utils/handlePromptSubmit.ts 原样复刻
// 用于存储用户输入的命令，包括普通文本和工具调用
type QueuedCommand = {
  value: string
}

export type PromptInputHelpers = {
  setCursorOffset: (offset: number) => void // 设置光标偏移量
  clearBuffer: () => void // 清空输入框
  resetHistory: () => void // 重置历史记录
}

type BaseExecutionParams = {
  messages: Message[]
  mainLoopModel: string
  querySource: QuerySource
  setUserInputOnProcessing: (prompt?: string) => void
  setAbortController: (abortController: AbortController | null) => void
  onQuery: (
    newMessages: Message[],
    abortController: AbortController,
    shouldQuery: boolean,
    additionalAllowedTools: string[],
    mainLoopModel: string,
    onBeforeQuery?: (input: string, newMessages: Message[]) => Promise<boolean>,
    input?: string,
  ) => Promise<void>
  onBeforeQuery?: (input: string, newMessages: Message[]) => Promise<boolean> // 执行查询前的回调函数
  canUseTool?: CanUseToolFn
  getToolUseContext: (
    messages: Message[],
    newMessages: Message[],
    abortController: AbortController,
    mainLoopModel: string,
  ) => ToolUseContext
}

type ExecuteUserInputParams = BaseExecutionParams & {
  queuedCommands: QueuedCommand[]
  helpers: PromptInputHelpers
}

// ============================================================================
// HandlePromptSubmitParams type
// 对齐上游实现：按 claude-code/src/utils/handlePromptSubmit.ts 原样复刻
// 处理用户输入的参数，包括普通文本和工具调用
// 返回一个 QueuedCommand 数组，每个元素是一个命令，包括普通文本和工具调用
export type HandlePromptSubmitParams = BaseExecutionParams & {
  input?: string
  helpers: PromptInputHelpers
  onInputChange: (value: string) => void
}

// createUserTextMessage - 创建用户文本消息
function createUserTextMessage(content: string): UserMessage {
  return {
    type: 'user',
    uuid: randomUUID() as UUID,
    message: {
      role: 'user',
      content,
    },
  } as UserMessage
}

// ============================================================================
// handlePromptSubmit function
// 对齐上游实现：按 claude-code/src/utils/handlePromptSubmit.ts 原样复刻
// 处理用户输入，包括普通文本和工具调用
// 返回一个 QueuedCommand 数组，每个元素是一个命令，包括普通文本和工具调用
export async function handlePromptSubmit(
  params: HandlePromptSubmitParams,
): Promise<void> {
  const input = (params.input ?? '').trim()
  if (!input) {
    return
  }

  // 清空输入框
  params.onInputChange('')
  params.helpers.setCursorOffset(0)
  params.helpers.clearBuffer()

  // 执行用户输入
  await executeUserInput({
    ...params,
    queuedCommands: [{ value: input }],
  })
}

// executeUserInput - 执行用户输入
async function executeUserInput(params: ExecuteUserInputParams): Promise<void> {
  const abortController = new AbortController()
  params.setAbortController(abortController)

  try {
    const newMessages: Message[] = []
    for (const cmd of params.queuedCommands) {
      if (!cmd.value.trim()) {
        continue
      }
      newMessages.push(createUserTextMessage(cmd.value))
    }

    // 设置用户输入为处理中
    params.setUserInputOnProcessing(params.queuedCommands[0]?.value)

    if (newMessages.length === 0) {
      return
    }

    const firstInput = params.queuedCommands[0]?.value
    const canContinue = params.onBeforeQuery
      ? await params.onBeforeQuery(firstInput ?? '', newMessages)
      : true

    if (!canContinue) {
      return
    }

    await params.onQuery(
      newMessages,
      abortController,
      true,
      [],
      params.mainLoopModel,
      params.onBeforeQuery,
      firstInput,
    )
    // 重置历史记录
    params.helpers.resetHistory()
  } finally {
    params.setAbortController(null)
    params.setUserInputOnProcessing(undefined)
  }
}
