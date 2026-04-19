/**
 * diff 工具函数
 *
 * 当前仅实现 FileWriteTool 所需的 getPatchForDisplay 函数
 * TODO: countLinesChanged、adjustHunkLineNumbers 等待后续补齐
 */

import { type StructuredPatchHunk, structuredPatch } from 'diff'
import type { FileEdit } from '../tools/FileEditTool/types.js'
import { convertLeadingTabsToSpaces } from './file.js'

// CONTEXT_LINES 上下文行数，用于展示 diff 时的上下文
export const CONTEXT_LINES = 3
// DIFF_TIMEOUT_MS diff 超时时间，毫秒
export const DIFF_TIMEOUT_MS = 5_000

// 对齐上游实现：& 和 $ 会让 diff 库混淆，替换为 token 后再还原
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>'
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>'

// 对齐上游实现：& 和 $ 会让 diff 库混淆，替换为 token 后再还原
function escapeForDiff(s: string): string {
  return s.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN)
}

// unescapeFromDiff 用于还原 token 替换为 & 和 $
function unescapeFromDiff(s: string): string {
  return s.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$')
}

/**
 * 获取编辑后的 diff patch 用于显示
 *
 * 设计原因：
 * 1. 对制表符做空格转换，确保 diff 展示对齐
 * 2. 对 & 和 $ 做转义，避免 diff 库解析错误
 * 3. 超时保护：DIFF_TIMEOUT_MS 防止大文件 diff 卡死
 *
 * @param filePath 文件路径
 * @param fileContents 原始文件内容
 * @param edits 编辑操作列表
 * @param ignoreWhitespace 是否忽略空白差异
 * @returns diff hunks 数组
 */
export function getPatchForDisplay({
  filePath, // 文件路径
  fileContents, // 原始文件内容
  edits, // 编辑操作列表
  ignoreWhitespace = false, // 是否忽略空白差异
}: {
  filePath: string // 文件路径
  fileContents: string // 原始文件内容
  edits: FileEdit[] // 编辑操作列表
  ignoreWhitespace?: boolean // 是否忽略空白差异
}): StructuredPatchHunk[] {
  // 对齐上游实现：& 和 $ 会让 diff 库混淆，替换为 token 后再还原
  const preparedFileContents = escapeForDiff(
    convertLeadingTabsToSpaces(fileContents),
  )
  const result = structuredPatch(
    filePath, // 文件路径
    filePath, // 文件路径
    preparedFileContents, 
    // 对齐操作列表，应用编辑操作到原始文件内容
    edits.reduce((p, edit) => {
      const { old_string, new_string } = edit
      const replace_all = 'replace_all' in edit ? edit.replace_all : false
      // escapedOldString 转义后的旧字符串，用于 diff 库解析
      const escapedOldString = escapeForDiff(
        convertLeadingTabsToSpaces(old_string),
      )
      // escapedNewString 转义后的新字符串，用于 diff 库解析
      const escapedNewString = escapeForDiff(
        convertLeadingTabsToSpaces(new_string),
      )

      if (replace_all) {
        return p.replaceAll(escapedOldString, () => escapedNewString)
      } else {
        return p.replace(escapedOldString, () => escapedNewString)
      }
    }, preparedFileContents),
    undefined,
    undefined,
    {
      context: CONTEXT_LINES,
      ignoreWhitespace,
      timeout: DIFF_TIMEOUT_MS,
    },
  )
  if (!result) {
    return []
  }
  return result.hunks.map(_ => ({
    ..._,
    lines: _.lines.map(unescapeFromDiff),
  }))
}
