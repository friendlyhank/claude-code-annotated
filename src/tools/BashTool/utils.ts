/**
 * BashTool utils - 输出处理与目录恢复辅助函数
 *
 * 对齐上游实现：按 claude-code/src/tools/BashTool/utils.ts 原样复刻
 * 当前实现：stripEmptyLines + resetCwdIfOutsideProject 最小子集
 * TODO: isImageOutput, buildImageToolResult, resizeShellImageOutput, formatOutput 待后续补齐
 */

import { getCwd } from '../../utils/cwd.js'
import { getOriginalCwd } from '../../bootstrap/state.js'

/**
 * 去除首尾的空行，保留中间内容的空白
 * 对齐上游：与 trim() 不同，只去除首尾完全空白的行
 */
export function stripEmptyLines(content: string): string {
  const lines = content.split('\n')

  let startIndex = 0
  while (startIndex < lines.length && lines[startIndex]?.trim() === '') {
    startIndex++
  }

  let endIndex = lines.length - 1
  while (endIndex >= 0 && lines[endIndex]?.trim() === '') {
    endIndex--
  }

  if (startIndex > endIndex) {
    return ''
  }

  return lines.slice(startIndex, endIndex + 1).join('\n')
}

/**
 * 当 cwd 跑到项目目录外时，自动重置回 originalCwd
 * 对齐上游：shouldMaintainProjectWorkingDir 或 pathInAllowedWorkingPath 判断
 * 当前简化版：只做 cwd !== originalCwd 的简单判断
 * TODO: 完整版需要 ToolPermissionContext 和 pathInAllowedWorkingPath
 */
export function resetCwdIfOutsideProject(): boolean {
  const cwd = getCwd()
  const originalCwd = getOriginalCwd()
  // TODO: 完整版需要检查 shouldMaintainProjectWorkingDir 和 pathInAllowedWorkingPath
  if (cwd !== originalCwd) {
    // setCwd(originalCwd) — 需要 Shell.ts 中的 setCwd，暂延后
    return true
  }
  return false
}

/**
 * 构建 shell 重置后的 stderr 追加消息
 */
export const stdErrAppendShellResetMessage = (stderr: string): string =>
  `${stderr.trim()}\nShell cwd was reset to ${getOriginalCwd()}`
