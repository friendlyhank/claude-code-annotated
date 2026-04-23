/**
 * Simple store implementation
 *
 */

export type Store<T> = {
  getState(): T // 获取当前状态
  setState(updater: (prev: T) => T): void // 设置状态，支持函数式更新
  subscribe(listener: () => void): () => void // 订阅状态变化，返回取消订阅函数
}

// createStore 创建一个状态管理器
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState() {
      return state
    },
    setState(updater) {
      state = updater(state)
      listeners.forEach(listener => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
