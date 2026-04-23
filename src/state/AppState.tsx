/**
 * AppState hooks
 *
 * 功能:
 * - useAppState: 订阅 AppState 切片
 * - useSetAppState: 获取 setState 函数
 * - useAppStateStore: 获取 store 实例
 */

import { useContext, useSyncExternalStore, createContext } from 'react'
import {
  type AppState,
  type AppStateStore,
  getDefaultAppState,
} from './AppStateStore.js'
import { createStore } from './store.js'

export { type AppState, type AppStateStore, getDefaultAppState } from './AppStateStore.js'

export const AppStoreContext = createContext<AppStateStore | null>(null)

// AppStateProvider 提供 AppState 上下文环境
export function AppStateProvider({
  children, // 子组件
  initialState, // 初始状态
}: {
  children: React.ReactNode
  initialState?: AppState
}): React.ReactNode {
  const store = createStore(initialState ?? getDefaultAppState())
  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  )
}

// 获取 AppStateStore 实例
function useAppStore(): AppStateStore {
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new ReferenceError(
      'useAppState cannot be called outside of an <AppStateProvider />',
    )
  }
  return store
}

// useAppState 订阅 AppState 切片
export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  )
}

// useSetAppState 获取 setState 函数
export function useSetAppState(): (updater: (prev: AppState) => AppState) => void {
  const store = useAppStore()
  return store.setState
}

// useAppStateStore 获取 store 实例
export function useAppStateStore(): AppStateStore {
  return useAppStore()
}
