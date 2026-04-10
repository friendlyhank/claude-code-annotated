import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import { findToolByName, type ToolUseContext } from '../../Tool.js'
import type { AssistantMessage, Message } from '../../types/message.js'
import { all } from '../../utils/generators.js'
import { type MessageUpdateLazy, runToolUse } from './toolExecution.js'

// 对齐上游实现：工具编排层只负责“分批 + 调度 + 上下文汇总”，
// 具体单个工具执行细节由 toolExecution.ts 处理，避免在此层混入执行逻辑。
function getMaxToolUseConcurrency(): number {
  return (
    parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
  )
}

export type MessageUpdate = {
  message?: Message
  newContext: ToolUseContext
}

export async function* runTools(
  toolUseMessages: ToolUseBlock[],
  assistantMessages: AssistantMessage[],
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdate, void> {
  let currentContext = toolUseContext
  // 对齐上游实现：先按“是否可并发”切分批次，批次顺序必须保持输入顺序，
  // 这样后续上下文变更的可见性与源码一致。
  for (const { isConcurrencySafe, blocks } of partitionToolCalls(
    toolUseMessages,
    currentContext,
  )) {
    if (isConcurrencySafe) {
      const queuedContextModifiers: Record<
        string,
        ((context: ToolUseContext) => ToolUseContext)[]
      > = {}
      // todo hank 这里修改上下文要调试下
      // 并发批次先收集 contextModifier，不立即修改共享上下文。
      // 原因：并发到达顺序不稳定，若边收边改会造成非确定性状态。（这里异步会执行完）
      for await (const update of runToolsConcurrently(
        blocks,
        assistantMessages,
        canUseTool,
        currentContext,
      )) {
        // 收集 contextModifier，不立即修改共享上下文。
        if (update.contextModifier) {
          const { toolUseID, modifyContext } = update.contextModifier
          if (!queuedContextModifiers[toolUseID]) {
            queuedContextModifiers[toolUseID] = []
          }
          queuedContextModifiers[toolUseID].push(modifyContext)
        }
        // 并发阶段先把 message 向上透传，但 newContext 仍保持当前共享快照；
        // 真正的新上下文要等整个批次结束后，统一按输入顺序回放 modifier 才能得到。
        yield {
          message: update.message,
          newContext: currentContext,
        }
      }
      // 对齐上游实现：按原 tool_use 顺序回放 modifier，保证结果可复现。所有执行完修改上下文。
      for (const block of blocks) {
        const modifiers = queuedContextModifiers[block.id]
        if (!modifiers) {
          continue
        }
        for (const modifier of modifiers) {
          currentContext = modifier(currentContext)
        }
      }
      yield { newContext: currentContext }
    } else {
      // 串行批次的特点是“前一个工具的上下文更新，立刻成为后一个工具的输入”。
      // 因而这里不需要缓存 modifier，而是边执行边推进 currentContext。
      // 串行批次允许每个工具执行后立即更新上下文，后续工具可见最新状态。
      for await (const update of runToolsSerially(
        blocks,
        assistantMessages,
        canUseTool,
        currentContext,
      )) {
        if (update.newContext) {
          currentContext = update.newContext
        }
        yield {
          message: update.message,
          newContext: currentContext,
        }
      }
    }
  }
}
// 并发批次定义：
type Batch = { isConcurrencySafe: boolean; blocks: ToolUseBlock[] }

// 将 tool_use 调用按“执行模式”切分成有序批次：
// 1) 仅当输入通过 schema 校验，且 tool.isConcurrencySafe(...) 返回 true 时，
//    当前调用才被判定为可并发；
// 2) 可并发调用只会与“前一个同为可并发”的批次合并（保持原始顺序，不跨批合并）；
// 3) 工具缺失、参数不合法、并发判断抛错等场景统一降级为串行，优先保证安全与确定性。
function partitionToolCalls(
  toolUseMessages: ToolUseBlock[],
  toolUseContext: ToolUseContext,
): Batch[] {
  return toolUseMessages.reduce((acc: Batch[], toolUse) => {
    const tool = findToolByName(toolUseContext.options.tools, toolUse.name)
    // 参数校验合法，且输入参数符合工具定义的 schema。
    const parsedInput = tool?.inputSchema.safeParse(toolUse.input)
    // 边界处理：schema 校验失败或并发判断抛错时，保守降级为串行，
    // 优先保证行为安全而不是追求吞吐。
    const isConcurrencySafe = parsedInput?.success
      ? (() => {
          try {
            // 调用工具实现的并发安全判断方法，返回结果。
            // 若抛错，保守回退为串行。
            // 若返回 false，保守回退为串行。
            return Boolean(tool?.isConcurrencySafe(parsedInput.data))
          } catch {
            // 对齐上游实现：并发安全判断异常时，保守回退为串行。
            return false
          }
        })()
      : false
    // 当前这个调用时可并发的，并且上一批也是可并发的批次，合并到上一批。
    if (isConcurrencySafe && acc[acc.length - 1]?.isConcurrencySafe) {
      acc[acc.length - 1]!.blocks.push(toolUse)
    } else {
      acc.push({ isConcurrencySafe, blocks: [toolUse] }) // 不满足条件则新开一批
    }
    return acc
  }, [])
}

// 串行批次强调“确定顺序 + 立即生效”：
// 每个 tool_use 在前一个 tool_use 完整结束后才开始，
// 因此前一个工具对上下文的修改会直接影响后一个工具的执行视图。
async function* runToolsSerially(
  toolUseMessages: ToolUseBlock[],
  assistantMessages: AssistantMessage[],
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdate, void> {
  let currentContext = toolUseContext

  // for 循环按顺序执行每个 tool_use，每个 tool_use 都会等待前一个 tool_use 完成
  // 每个 tool_use 都会更新当前上下文，后续 tool_use 可以基于这个最新状态执行。
  for (const toolUse of toolUseMessages) {
    // 状态标记：进入执行前登记 in-progress，供 UI/中断流程感知。
    toolUseContext.setInProgressToolUseIDs(prev =>
      new Set(prev).add(toolUse.id),
    )
    // runToolUse 负责单个工具的完整执行过程；这里仅负责把所属 assistant 消息匹配出来，
    // 并将上下文传递给工具执行。 
    for await (const update of runToolUse(
      toolUse,
      assistantMessages.find(_ =>
        Array.isArray(_.message?.content) && _.message.content.some(
          content => content.type === 'tool_use' && content.id === toolUse.id,
        ),
      )!,
      canUseTool,
      currentContext,
    )) {
      if (update.contextModifier) {
        // 串行模式下可以立即提交 modifier，因为后续工具就应该看到这个最新状态。
        currentContext = update.contextModifier.modifyContext(currentContext)
      }
      yield {
        message: update.message,
        newContext: currentContext,
      }
    }
    // 对齐上游实现：每个工具收尾后立即清理 in-progress 标记。
    markToolUseAsComplete(toolUseContext, toolUse.id)
  }
}

// 并发批次的职责只有两件事：
// 1) 以受限并发方式启动多个 tool_use；
// 2) 将每个工具产生的 message/contextModifier 原样向上游转发。
// 注意这里不直接提交 contextModifier 到共享上下文：
// 并发任务完成顺序不稳定，若在此处立即修改会让最终上下文依赖到达时序。
// 因此真正的上下文合并在 runTools() 外层完成，并按原始 tool_use 顺序回放。
async function* runToolsConcurrently(
  toolUseMessages: ToolUseBlock[],
  assistantMessages: AssistantMessage[],
  canUseTool: CanUseToolFn,
  toolUseContext: ToolUseContext,
): AsyncGenerator<MessageUpdateLazy, void> {
  // 对齐上游实现：并发执行走 all(..., limit) 做限流，避免工具洪泛。这里去并发执行 tool_use。
  yield* all(
    toolUseMessages.map(async function* (toolUse) {
      // 每个并发任务启动时先登记 in-progress正在进行，供 UI 和中断流程观察当前活跃工具。
      toolUseContext.setInProgressToolUseIDs(prev =>
        new Set(prev).add(toolUse.id),
      )
      // runToolUse 负责单个工具的完整执行过程；这里仅负责把所属 assistant 消息匹配出来，
      // 使工具执行时仍能拿到发起它的原始上下文。
      yield* runToolUse(
        toolUse,
        assistantMessages.find(_ =>
          Array.isArray(_.message?.content) && _.message.content.some(
            content => content.type === 'tool_use' && content.id === toolUse.id,
          ),
        )!,
        canUseTool,
        toolUseContext,
      )
      // 无论该工具在并发批次中的完成先后如何，结束时都要清理 in-progress 标记。
      markToolUseAsComplete(toolUseContext, toolUse.id)
    }),
    getMaxToolUseConcurrency(),
  )
}

function markToolUseAsComplete(
  toolUseContext: ToolUseContext,
  toolUseID: string,
) {
  // 副作用：从会话级 in-progress 集合移除，通知上层该 tool_use 已结束。
  toolUseContext.setInProgressToolUseIDs(prev => {
    const next = new Set(prev)
    next.delete(toolUseID)
    return next
  })
}
