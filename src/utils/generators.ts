const NO_VALUE = Symbol('NO_VALUE')

// 对齐上游实现：lastX 用于消费完整个流并返回“最后一个产出值”，
// 不是返回 generator 的 return 值；空流直接抛错，避免把“无值”当作合法结果。
export async function lastX<A>(as: AsyncGenerator<A>): Promise<A> {
  let lastValue: A | typeof NO_VALUE = NO_VALUE
  for await (const a of as) {
    lastValue = a
  }
  if (lastValue === NO_VALUE) {
    throw new Error('No items in generator')
  }
  return lastValue
}

export async function returnValue<A>(
  as: AsyncGenerator<unknown, A>,
): Promise<A> {
  // 语义区分：这里专门读取 AsyncGenerator 的最终 return 值，
  // 因此即便中间没有任何 yield，也会在 done=true 时拿到返回结果。
  let e
  do {
    e = await as.next()
  } while (!e.done)
  return e.value
}

// 对齐上游实现：QueuedGenerator 用于并发消费多个 async generator，按产出顺序依次转发。
type QueuedGenerator<A> = {
  done: boolean | void // 是否完成产出
  value: A | void // 产出值
  generator: AsyncGenerator<A, void> // 原始 generator
  promise: Promise<QueuedGenerator<A>> // 下一次产出的 promise
}

// 对齐上游实现：并发消费多个 async generator，按产出顺序依次转发。
export async function* all<A>(
  generators: AsyncGenerator<A, void>[],
  concurrencyCap = Infinity,
): AsyncGenerator<A, void> {
  // 为每个 generator 封装“下一次 next() + 自引用 promise”，
  // Promise.race 返回后可精确删除已完成的那一个 pending promise。
  const next = (generator: AsyncGenerator<A, void>) => {
    const promise: Promise<QueuedGenerator<A>> = generator
      .next()
      .then(({ done, value }) => ({
        done,
        value,
        generator,
        promise,
      }))
    return promise
  }
  const waiting = [...generators]
  const promises = new Set<Promise<QueuedGenerator<A>>>()

  // 先填满并发窗口；未启动的生成器留在 waiting 队列中。
  while (promises.size < concurrencyCap && waiting.length > 0) {
    const gen = waiting.shift()!
    promises.add(next(gen))
  }

  while (promises.size > 0) {
    const { done, value, generator, promise } = await Promise.race(promises)
    promises.delete(promise)

    if (!done) {
      // 当前 generator 仍有后续值：立刻续订下一次 next()，保持并发槽位不丢失。
      promises.add(next(generator))
      if (value !== undefined) {
        // 边界处理：与上游一致，忽略 undefined 产出，避免把“无有效消息”转发给上层。
        yield value as Awaited<A>
      }
    } else if (waiting.length > 0) {
      // 某个 generator 结束后，再从 waiting 补一个新的进入并发窗口。
      const nextGen = waiting.shift()!
      promises.add(next(nextGen))
    }
  }
}

export async function toArray<A>(
  generator: AsyncGenerator<A, void>,
): Promise<A[]> {
  const result: A[] = []
  for await (const a of generator) {
    result.push(a)
  }
  return result
}

export async function* fromArray<T>(values: T[]): AsyncGenerator<T, void> {
  for (const value of values) {
    yield value
  }
}
