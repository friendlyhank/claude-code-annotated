/**
 * Context providers for system prompt
 *
 *
 * 功能:
 * - getUserContext: 获取用户上下文 (CLAUDE.md 内容等)
 * - getSystemContext: 获取系统上下文 (git status 等)
 */

import memoize from 'lodash-es/memoize.js'
import { getLocalISODate } from './constants/common.js'

/**
 * This context is prepended to each conversation, and cached for the duration of the conversation.
 */
// 获取系统上下文
export const getSystemContext = memoize(
  async (): Promise<{
    [k: string]: string
  }> => {
    return {}
  },
)

/**
 * This context is prepended to each conversation, and cached for the duration of the conversation.
 */
// 获取用户上下文
export const getUserContext = memoize(
  async (): Promise<{
    [k: string]: string
  }> => {
    return {
      currentDate: `Today's date is ${getLocalISODate()}.`,
    }
  },
)
