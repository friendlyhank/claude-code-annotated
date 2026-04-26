/**
 * Glob 文件搜索
 *
 * 对齐上游实现：按 claude-code/src/utils/glob.ts 原样复刻
 * 设计原因：使用 ripgrep 实现高性能 glob 搜索
 */

import { basename, dirname, isAbsolute, join, sep } from 'path'
import type { ToolPermissionContext } from '../types/permissions.js'
import { isEnvTruthy } from './envUtils.js'
import {
  getFileReadIgnorePatterns,
  normalizePatternsToPath,
} from './permissions/filesystem.js'
import { getPlatform } from './platform.js'
// TODO: plugins 待实现
// import { getGlobExclusionsForPluginCache } from './plugins/orphanedPluginFilter.js'
import { ripGrep } from './ripgrep.js'

/**
 * 从 glob 模式中提取静态基础目录
 * 基础目录是第一个 glob 特殊字符（* ? [ {）之前的所有内容
 * 返回目录部分和剩余的相对模式
 */
export function extractGlobBaseDirectory(pattern: string): {
  baseDir: string
  relativePattern: string
} {
  // 查找第一个 glob 特殊字符：*, ?, [, {
  const globChars = /[*?[{]/
  const match = pattern.match(globChars)

  if (!match || match.index === undefined) {
    // 无 glob 字符 - 这是一个字面量路径
    // 返回目录部分和文件名作为模式
    const dir = dirname(pattern)
    const file = basename(pattern)
    return { baseDir: dir, relativePattern: file }
  }

  // 获取第一个 glob 字符之前的所有内容
  const staticPrefix = pattern.slice(0, match.index)

  // 查找静态前缀中最后一个路径分隔符
  const lastSepIndex = Math.max(
    staticPrefix.lastIndexOf('/'),
    staticPrefix.lastIndexOf(sep),
  )

  if (lastSepIndex === -1) {
    // glob 前没有路径分隔符 - 模式相对于 cwd
    return { baseDir: '', relativePattern: pattern }
  }

  let baseDir = staticPrefix.slice(0, lastSepIndex)
  const relativePattern = pattern.slice(lastSepIndex + 1)

  // 处理根目录模式（如 Unix 上的 /*.txt 或 Windows 上的 C:/*.txt）
  // 当 lastSepIndex 为 0 时，baseDir 为空，但我们需要使用 '/' 作为根
  if (baseDir === '' && lastSepIndex === 0) {
    baseDir = '/'
  }

  // 处理 Windows 驱动器根路径（如 C:/*.txt）
  // 'C:' 意思是"驱动器 C 上的当前目录"（相对），而非根
  // 我们需要 'C:/' 或 'C:\' 作为实际的驱动器根
  if (getPlatform() === 'windows' && /^[A-Za-z]:$/.test(baseDir)) {
    baseDir = baseDir + sep
  }

  return { baseDir, relativePattern }
}

export async function glob(
  filePattern: string,
  cwd: string,
  { limit, offset }: { limit: number; offset: number },
  abortSignal: AbortSignal,
  toolPermissionContext: ToolPermissionContext,
): Promise<{ files: string[]; truncated: boolean }> {
  let searchDir = cwd
  let searchPattern = filePattern

  // 通过提取基础目录并将绝对路径转换为相对模式来处理绝对路径
  // ripgrep 的 --glob 标志只适用于相对模式
  if (isAbsolute(filePattern)) {
    const { baseDir, relativePattern } = extractGlobBaseDirectory(filePattern)
    if (baseDir) {
      searchDir = baseDir
      searchPattern = relativePattern
    }
  }

  const ignorePatterns = normalizePatternsToPath(
    getFileReadIgnorePatterns(toolPermissionContext),
    searchDir,
  )

  // 使用 ripgrep 获得更好的内存性能
  // --files: 列出文件而非搜索内容
  // --glob: 按模式过滤
  // --sort=modified: 按修改时间排序（最旧的在前）
  // --no-ignore: 不遵守 .gitignore（默认 true，设置 CLAUDE_CODE_GLOB_NO_IGNORE=false 以遵守）
  // --hidden: 包含隐藏文件（默认 true，设置 CLAUDE_CODE_GLOB_HIDDEN=false 以排除）
  // 注意：使用 || 而非 ?? 以将空字符串视为未设置（默认为 true）
  const noIgnore = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_NO_IGNORE || 'true')
  const hidden = isEnvTruthy(process.env.CLAUDE_CODE_GLOB_HIDDEN || 'true')
  const args = [
    '--files',
    '--glob',
    searchPattern,
    '--sort=modified',
    ...(noIgnore ? ['--no-ignore'] : []),
    ...(hidden ? ['--hidden'] : []),
  ]

  // 添加忽略模式
  for (const pattern of ignorePatterns) {
    args.push('--glob', `!${pattern}`)
  }

  // TODO: plugins 待实现
  // 排除孤立的插件版本目录
  // for (const exclusion of await getGlobExclusionsForPluginCache(searchDir)) {
  //   args.push('--glob', exclusion)
  // }

  const allPaths = await ripGrep(args, searchDir, abortSignal)

  // ripgrep 返回相对路径，转换为绝对路径
  const absolutePaths = allPaths.map(p =>
    isAbsolute(p) ? p : join(searchDir, p),
  )

  const truncated = absolutePaths.length > offset + limit
  const files = absolutePaths.slice(offset, offset + limit)

  return { files, truncated }
}
