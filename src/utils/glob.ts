/**
 * Glob 文件搜索
 *
 * 对齐上游实现：按 claude-code/src/utils/glob.ts 原样复刻
 * 当前仅实现 GlobTool 所需的 glob 函数
 * TODO: 完整 glob.ts 待后续阶段补齐（extractGlobBaseDirectory 等）
 */

import { isAbsolute, join } from 'path'
import type { ToolPermissionContext } from '../types/permissions.js'
// TODO: ripGrep 待实现
// import { ripGrep } from './ripgrep.js'

/**
 * Glob 文件搜索
 *
 * 对齐上游实现：按 claude-code/src/utils/glob.ts glob() 原样复刻
 * 当前使用简化实现，待 ripgrep 集成后替换
 *
 * TODO: 替换为基于 ripgrep 的完整实现
 * 完整实现流程：
 * 1. 绝对路径提取 base directory
 * 2. 收集 ignore patterns
 * 3. 调用 ripGrep --files --glob <pattern>
 * 4. 截断和偏移处理
 */
export async function glob(
  filePattern: string, // 搜索模式
  cwd: string, // 当前工作目录
  { limit, offset }: { limit: number; offset: number }, // 搜索参数
  _abortSignal: AbortSignal, // 取消信号
  // 权限上下文，包含当前工作目录等信息
  _toolPermissionContext: ToolPermissionContext,
): Promise<{ files: string[]; truncated: boolean }> {
  // 简化实现：使用 Node.js fs 模块递归搜索
  // 对齐上游行为：返回绝对路径列表，支持截断
  const { readdir, stat: fsStat } = await import('fs/promises')
  const { basename } = await import('path')

  // 将 glob 模式转换为正则
  const regex = globToRegex(filePattern)
  const allFiles: string[] = []

  async function walk(dir: string): Promise<void> {
    if (allFiles.length > offset + limit + 100) return // 提前停止
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        // 对齐上游实现：默认不忽略 .gitignore 中的文件（--no-ignore）
        if (entry.name === '.git') continue
        await walk(fullPath)
      } else if (entry.isFile()) {
        // 将绝对路径的文件名部分与 glob 模式匹配
        // 对齐上游实现：ripgrep 使用相对路径匹配
        const relPath = isAbsolute(filePattern) ? fullPath : entry.name
        if (regex.test(relPath) || regex.test(basename(fullPath))) {
          allFiles.push(fullPath)
        }
      }
    }
  }

  await walk(cwd)

  const truncated = allFiles.length > offset + limit
  const files = allFiles.slice(offset, offset + limit)

  return { files, truncated }
}

/**
 * 简易 glob 模式转正则
 * 对齐上游实现：上游使用 ripgrep 的 --glob 参数，此为替代实现
 * TODO: 待 ripgrep 集成后移除
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\*\*/g, '{{GLOBSTAR}}')      // 保护 **
    .replace(/\*/g, '[^/]*')               // * 匹配非路径分隔符
    .replace(/\?/g, '[^/]')                // ? 匹配单个非路径分隔符
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')    // ** 匹配任意路径
  return new RegExp(`^${regexStr}$`, 'i')
}
