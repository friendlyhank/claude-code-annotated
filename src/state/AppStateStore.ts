/**
 * AppState store - minimal implementation
 *
 * 功能:
 * - 提供全局应用状态管理
 */

import type { ToolPermissionContext } from '../types/permissions.js'
import { createStore, type Store } from './store.js'

export type AppState = {
  mainLoopModel: string | null // 全局默认模型
  mainLoopModelForSession: string | null // 会话级模型
  verbose: boolean // 是否开启详细模式
  toolPermissionContext: ToolPermissionContext // 工具权限上下文
}

// getDefaultAppState 获取默认应用状态
export function getDefaultAppState(): AppState {
  return {
    mainLoopModel: null,  // 全局默认模型
    mainLoopModelForSession: null, // 会话级模型
    verbose: false, // 是否开启详细模式
    toolPermissionContext: { // 工具权限上下文
      mode: 'default',  // 工具权限模式
      additionalWorkingDirectories: new Map(), // 额外的可工作目录映射
      alwaysAllowRules: {}, // 总是允许的规则
      alwaysDenyRules: {}, // 总是拒绝的规则
      alwaysAskRules: {}, // 总是询问的规则
      isBypassPermissionsModeAvailable: false, // 是否可用绕过权限模式
    },
  }
}

export type AppStateStore = Store<AppState>
