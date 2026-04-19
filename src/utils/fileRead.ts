/**
 * 同步文件读取工具函数
 *
 * 设计原因：file.ts 位于设置 SCC 中，此文件只导入 fsOperations 和 debug，
 * 避免拉入整个依赖链。FileWriteTool 的 call() 使用 readFileSyncWithMetadata
 * 在临界区内同步读取文件，确保无 yield。
 *
 * TODO: detectEncodingForResolvedPath 完整实现待 fsOperations.readSync 补齐后替换
 * TODO: detectLineEndingsForString 完整实现待后续补齐
 */

import { getFsImplementation, safeResolvePath } from './fsOperations.js'

export type LineEndingType = 'CRLF' | 'LF'

/**
 * 检测文件编码（已解析路径）
 *
 * 设计原因：
 * - 空文件默认 utf8（修复向空文件写入 emoji/CJK 字符的编码损坏）
 * - BOM 标记判断 UTF-16LE
 * - 其他情况默认 utf8
 */
export function detectEncodingForResolvedPath(
  resolvedPath: string,
): BufferEncoding {
  // 对齐上游实现：使用 fs.readFileSync 读取前 4096 字节检测编码
  // 当前简化实现：直接读取并检测 BOM
  try {
    // eslint-disable-next-line custom-rules/no-sync-fs
    const fs = require('fs')
    const fd = fs.openSync(resolvedPath, 'r')
    const buffer = Buffer.alloc(4)
    const bytesRead = fs.readSync(fd, buffer, 0, 4, 0)
    fs.closeSync(fd)

    if (bytesRead === 0) {
      return 'utf8'
    }

    if (bytesRead >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf16le'
    }

    if (
      bytesRead >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
    ) {
      return 'utf8'
    }

    return 'utf8'
  } catch {
    return 'utf8'
  }
}

/**
 * 检测字符串的行尾类型
 *
 * 设计原因：统计 CRLF 和 LF 的数量，多数决定行尾类型
 */
export function detectLineEndingsForString(content: string): LineEndingType {
  let crlfCount = 0
  let lfCount = 0

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      if (i > 0 && content[i - 1] === '\r') {
        crlfCount++
      } else {
        lfCount++
      }
    }
  }

  return crlfCount > lfCount ? 'CRLF' : 'LF'
}

/**
 * 同步读取文件并返回内容、编码和行尾信息
 *
 * 设计原因：
 * - 一次文件系统访问同时获取编码和行尾信息，避免多次 IO
 * - 返回 CRLF 规范化后的内容（\r\n → \n）
 * - FileWriteTool 的 call() 在临界区内使用此函数，确保无 yield
 */
export function readFileSyncWithMetadata(filePath: string): {
  content: string // 文件内容
  encoding: BufferEncoding // 文件编码
  lineEndings: LineEndingType // 文件行尾类型
} {

  const fs = getFsImplementation()
  // 解析路径，避免符号链接问题
  const { resolvedPath, isSymlink } = safeResolvePath(fs, filePath)

  // TODO: 符号链接日志待 debug 模块实现后补齐
  void isSymlink

  // 检测文件编码
  const encoding = detectEncodingForResolvedPath(resolvedPath)
  //  读取文件内容
  const raw = fs.readFileSync(resolvedPath, { encoding })
  // 对齐上游实现：从原始内容头部检测行尾，在 CRLF 规范化之前
  const lineEndings = detectLineEndingsForString(raw.slice(0, 4096))
  return {
    content: raw.replaceAll('\r\n', '\n'),
    encoding,
    lineEndings,
  }
}

/**
 * 同步读取文件内容
 *
 */
export function readFileSync(filePath: string): string {
  return readFileSyncWithMetadata(filePath).content
}
