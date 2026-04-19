/**
 * FileEditTool 工具函数集
 *
 * 设计原因：
 * 1. 核心编辑逻辑独立于工具入口，便于测试和复用
 * 2. 引号规范化：LLM 输出直引号，文件可能使用弯引号
 * 3. Patch 生成：基于 diff 库的结构化补丁，用于 UI 展示
 * 4. 编辑等价性判断：支持语义级别比较（不同输入产生相同结果）
 */

import { type StructuredPatchHunk, structuredPatch } from 'diff'
import { expandPath } from '../../utils/path.js'
import { errorMessage, isENOENT } from '../../utils/errors.js'
import {
  addLineNumbers, // 添加行号
  convertLeadingTabsToSpaces, // 转换首行制表符为空格
  // TODO: readFileSyncCached 待 file.ts 补齐
} from '../../utils/file.js'
import type { EditInput, FileEdit } from './types.js'

// ============================================================================
// 弯引号常量
// ============================================================================

// LLM 无法输出弯引号，定义为常量供编辑逻辑使用
// 对齐上游实现：编辑时需要将文件中的弯引号规范化为直引号进行匹配
export const LEFT_SINGLE_CURLY_QUOTE = '\u2018'
export const RIGHT_SINGLE_CURLY_QUOTE = '\u2019'
export const LEFT_DOUBLE_CURLY_QUOTE = '\u201C'
export const RIGHT_DOUBLE_CURLY_QUOTE = '\u201D'

// ============================================================================
// 引号规范化
// ============================================================================

/**
 * 将弯引号规范化为直引号
 * 对齐上游实现：LLM 输出直引号，但文件可能使用弯引号，匹配前需统一
 */
export function normalizeQuotes(str: string): string {
  return str
    .replaceAll(LEFT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(RIGHT_SINGLE_CURLY_QUOTE, "'")
    .replaceAll(LEFT_DOUBLE_CURLY_QUOTE, '"')
    .replaceAll(RIGHT_DOUBLE_CURLY_QUOTE, '"')
}

// ============================================================================
// 尾部空白处理
// ============================================================================

/**
 * 去除每行尾部空白，保留行尾符
 * 对齐上游实现：LLM 输出的尾部空白可能与文件不一致
 */
export function stripTrailingWhitespace(str: string): string {
  // 处理 CRLF/LF/CR 不同行尾
  const lines = str.split(/(\r\n|\n|\r)/)

  let result = ''
  for (let i = 0; i < lines.length; i++) {
    const part = lines[i]
    if (part !== undefined) {
      if (i % 2 === 0) {
        // 偶数索引是行内容
        result += part.replace(/\s+$/, '')
      } else {
        // 奇数索引是行尾符
        result += part
      }
    }
  }

  return result
}

// ============================================================================
// 精确字符串查找
// ============================================================================

/**
 * 在文件内容中查找匹配的字符串，支持引号规范化
 *
 * 对齐上游实现：先尝试精确匹配，再尝试规范化引号后匹配
 * 设计原因：
 * - 精确匹配优先：大多数情况 old_string 与文件完全一致
 * - 规范化匹配兜底：LLM 输出直引号但文件使用弯引号时仍能匹配
 *
 * @returns 文件中实际匹配的字符串，或 null
 */
export function findActualString(
  fileContent: string,
  searchString: string,
): string | null {
  // 先尝试精确匹配
  if (fileContent.includes(searchString)) {
    return searchString
  }

  // 尝试规范化引号后匹配
  const normalizedSearch = normalizeQuotes(searchString)
  // 将弯引号规范化为直引号
  const normalizedFile = normalizeQuotes(fileContent)

  const searchIndex = normalizedFile.indexOf(normalizedSearch)
  if (searchIndex !== -1) {
    // 返回文件中实际的子串（保留原始引号风格）
    return fileContent.substring(searchIndex, searchIndex + searchString.length)
  }

  return null
}

// ============================================================================
// 引号风格保持
// ============================================================================

/**
 * 当 old_string 通过引号规范化匹配时，将 new_string 也转为相同风格
 *
 * 对齐上游实现：文件使用弯引号时，编辑结果应保持弯引号风格
 * 启发式规则：空白/起始标点后的引号视为开引号，否则为闭引号
 */
export function preserveQuoteStyle(
  oldString: string,
  actualOldString: string,
  newString: string,
): string {
  // 相同则未发生规范化
  if (oldString === actualOldString) {
    return newString
  }

  // 检测实际字符串中使用了哪些弯引号类型
  const hasDoubleQuotes =
    actualOldString.includes(LEFT_DOUBLE_CURLY_QUOTE) ||
    actualOldString.includes(RIGHT_DOUBLE_CURLY_QUOTE)
  const hasSingleQuotes =
    actualOldString.includes(LEFT_SINGLE_CURLY_QUOTE) ||
    actualOldString.includes(RIGHT_SINGLE_CURLY_QUOTE)

  if (!hasDoubleQuotes && !hasSingleQuotes) {
    return newString
  }

  let result = newString

  if (hasDoubleQuotes) {
    result = applyCurlyDoubleQuotes(result)
  }
  if (hasSingleQuotes) {
    result = applyCurlySingleQuotes(result)
  }

  return result
}

/**
 * 判断字符位置是否为"开引号上下文"
 * 对齐上游实现：空白/起始标点后的引号视为开引号
 */
function isOpeningContext(chars: string[], index: number): boolean {
  if (index === 0) {
    return true
  }
  const prev = chars[index - 1]
  return (
    prev === ' ' ||
    prev === '\t' ||
    prev === '\n' ||
    prev === '\r' ||
    prev === '(' ||
    prev === '[' ||
    prev === '{' ||
    prev === '\u2014' || // em dash
    prev === '\u2013' // en dash
  )
}

/**
 * 将直双引号转为弯双引号
 */
function applyCurlyDoubleQuotes(str: string): string {
  const chars = [...str]
  const result: string[] = []
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '"') {
      result.push(
        isOpeningContext(chars, i)
          ? LEFT_DOUBLE_CURLY_QUOTE
          : RIGHT_DOUBLE_CURLY_QUOTE,
      )
    } else {
      result.push(chars[i]!)
    }
  }
  return result.join('')
}

/**
 * 将直单引号转为弯单引号
 * 对齐上游实现：缩略语中的撇号（don't, it's）保持为右弯引号
 */
function applyCurlySingleQuotes(str: string): string {
  const chars = [...str]
  const result: string[] = []
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "'") {
      // 缩略语检测：引号两侧都是字母时视为撇号
      const prev = i > 0 ? chars[i - 1] : undefined
      const next = i < chars.length - 1 ? chars[i + 1] : undefined
      const prevIsLetter = prev !== undefined && /\p{L}/u.test(prev)
      const nextIsLetter = next !== undefined && /\p{L}/u.test(next)
      if (prevIsLetter && nextIsLetter) {
        // 缩略语中的撇号，使用右弯引号
        result.push(RIGHT_SINGLE_CURLY_QUOTE)
      } else {
        result.push(
          isOpeningContext(chars, i)
            ? LEFT_SINGLE_CURLY_QUOTE
            : RIGHT_SINGLE_CURLY_QUOTE,
        )
      }
    } else {
      result.push(chars[i]!)
    }
  }
  return result.join('')
}

// ============================================================================
// 编辑应用
// ============================================================================

/**
 * 将编辑应用到文件内容，返回修改后的内容
 *
 * 对齐上游实现：
 * - replaceAll 时全局替换，否则仅替换首次出现
 * - new_string 为空时智能处理尾部换行（避免留下空行）
 *
 * @param originalContent 原始文件内容
 * @param oldString 要替换的文本
 * @param newString 替换后的文本
 * @param replaceAll 是否替换所有出现
 */
export function applyEditToFile(
  originalContent: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false,
): string {
  const f = replaceAll
    ? (content: string, search: string, replace: string) =>
        content.replaceAll(search, () => replace)
    : (content: string, search: string, replace: string) =>
        content.replace(search, () => replace)

  if (newString !== '') {
    return f(originalContent, oldString, newString)
  }

  // 删除场景：智能处理尾部换行
  // 对齐上游实现：如果 old_string 不以换行结尾但文件中它后面紧跟换行，
  // 则连同换行一起删除，避免留下空行
  const stripTrailingNewline =
    !oldString.endsWith('\n') && originalContent.includes(oldString + '\n')

  return stripTrailingNewline
    ? f(originalContent, oldString + '\n', newString)
    : f(originalContent, oldString, newString)
}

// ============================================================================
// Patch 生成
// ============================================================================

// diff 操作超时时间
// TODO: 对齐上游 DIFF_TIMEOUT_MS，待 diff.ts 工具模块实现
const DIFF_TIMEOUT_MS = 5000

/**
 * 对单个编辑生成 patch
 * 对齐上游实现：委托给 getPatchForEdits 处理
 */
export function getPatchForEdit({
  filePath, // 文件路径
  fileContents, // 原始文件内容 
  oldString, // 旧字符串
  newString, // 新字符串
  replaceAll = false, // 是否替换所有实例
}: {
  filePath: string // 文件路径
  fileContents: string // 原始文件内容
  oldString: string // 旧字符串
  newString: string // 新字符串
  replaceAll?: boolean // 是否替换所有实例
}): { patch: StructuredPatchHunk[]; updatedFile: string } {
  return getPatchForEdits({
    filePath, // 文件路径
    fileContents, // 原始文件内容
    edits: [
      { old_string: oldString, new_string: newString, replace_all: replaceAll },
    ],
  })
}

/**
 * 对多个编辑生成 patch，返回 patch 和更新后的文件内容
 *
 * 对齐上游实现：
 * 1. 空文件特殊处理
 * 2. 逐个应用编辑，检查 old_string 是否为之前 new_string 的子串（防冲突）
 * 3. 编辑未产生变化时报错
 * 4. 最终通过 diff 生成结构化补丁
 *
 * 注：返回的 patch 仅用于展示，制表符已转为空格
 */
export function getPatchForEdits({
  filePath, // 文件路径
  fileContents, // 原始文件内容
  edits, // 编辑列表
}: {
  filePath: string // 文件路径
  fileContents: string // 原始文件内容
  edits: FileEdit[] // 编辑列表
}): { patch: StructuredPatchHunk[]; updatedFile: string } {
  let updatedFile = fileContents
  const appliedNewStrings: string[] = []

  // 空文件特殊处理
  if (
    !fileContents &&
    edits.length === 1 &&
    edits[0] &&
    edits[0].old_string === '' &&
    edits[0].new_string === ''
  ) {
    // TODO: 对齐上游 getPatchForDisplay 调用，待 diff.ts 实现后补齐
    return { patch: [], updatedFile: '' }
  }

  // 逐个应用编辑
  for (const edit of edits) {
    // 检查 old_string 是否为之前 new_string 的子串（防冲突）
    const oldStringToCheck = edit.old_string.replace(/\n+$/, '')

    for (const previousNewString of appliedNewStrings) {
      if (
        oldStringToCheck !== '' &&
        previousNewString.includes(oldStringToCheck)
      ) {
        throw new Error(
          'Cannot edit file: old_string is a substring of a new_string from a previous edit.',
        )
      }
    }

    const previousContent = updatedFile
    updatedFile =
      edit.old_string === ''
        ? edit.new_string
        : applyEditToFile(
            updatedFile,
            edit.old_string,
            edit.new_string,
            edit.replace_all,
          )

    // 编辑未产生变化时报错
    if (updatedFile === previousContent) {
      throw new Error('String not found in file. Failed to apply edit.')
    }

    // 记录已应用的 new_string，用于后续检查
    appliedNewStrings.push(edit.new_string)
  }

  if (updatedFile === fileContents) {
    throw new Error(
      'Original and edited file match exactly. Failed to apply edit.',
    )
  }

  // 生成 diff patch
  // 对齐上游实现：先转制表符为空格（用于展示），再生成结构化补丁
  const patch = getPatchFromContents({
    filePath,
    oldContent: convertLeadingTabsToSpaces(fileContents),
    newContent: convertLeadingTabsToSpaces(updatedFile),
  })

  return { patch, updatedFile }
}

/**
 * 从原始和修改后的内容生成结构化 diff 补丁
 *
 * 对齐上游实现：封装 diff 库的 structuredPatch 调用
 * 设计原因：统一 diff 参数（上下文行数、超时），避免散落各处
 */
function getPatchFromContents({
  filePath, // 文件路径
  oldContent, // 原始内容
  newContent, // 修改后内容
}: {
  filePath: string // 文件路径
  oldContent: string // 原始内容
  newContent: string // 修改后内容
}): StructuredPatchHunk[] {
  // 生成 diff patch
  const patch = structuredPatch(
    filePath,
    filePath,
    oldContent,
    newContent,
    undefined,
    undefined,
    {
      context: 3,
      timeout: DIFF_TIMEOUT_MS,
    },
  )
  return patch ? patch.hunks : []
}

// ============================================================================
// Snippet 生成（用于 UI 展示和附件）
// ============================================================================

// 对齐上游实现：8KB 上限，防止大文件编辑注入过多 token
const DIFF_SNIPPET_MAX_BYTES = 8192

/**
 * 两个文件差异的片段（用于附件展示）
 *
 * 对齐上游实现：按 claude-code/src/tools/FileEditTool/utils.ts getSnippetForTwoFileDiff 原样复刻
 * TODO: countCharInString 待 stringUtils.ts 实现后替换
 */
export function getSnippetForTwoFileDiff(
  fileAContents: string,
  fileBContents: string,
): string {
  const patch = structuredPatch(
    'file.txt',
    'file.txt',
    fileAContents,
    fileBContents,
    undefined,
    undefined,
    {
      context: 8,
      timeout: DIFF_TIMEOUT_MS,
    },
  )

  if (!patch) {
    return ''
  }

  const full = patch.hunks
    .map((hunk: { oldStart: number; lines: string[] }) => ({
      startLine: hunk.oldStart,
      content: hunk.lines
        .filter((line: string) => !line.startsWith('-') && !line.startsWith('\\'))
        .map((line: string) => line.slice(1))
        .join('\n'),
    }))
    .map(addLineNumbers)
    .join('\n...\n')

  if (full.length <= DIFF_SNIPPET_MAX_BYTES) {
    return full
  }

  // 在上限内按行截断
  const cutoff = full.lastIndexOf('\n', DIFF_SNIPPET_MAX_BYTES)
  const kept =
    cutoff > 0 ? full.slice(0, cutoff) : full.slice(0, DIFF_SNIPPET_MAX_BYTES)
  // TODO: countCharInString 待实现，暂时用简单行数统计
  const remaining = kept.split('\n').length
  return `${kept}\n\n... [${remaining} lines truncated] ...`
}

const CONTEXT_LINES = 4

/**
 * 从 patch 获取带上下文的片段（新文件视角）
 *
 * 对齐上游实现：按 claude-code/src/tools/FileEditTool/utils.ts getSnippetForPatch 原样复刻
 */
export function getSnippetForPatch(
  patch: StructuredPatchHunk[],
  newFile: string,
): { formattedSnippet: string; startLine: number } {
  if (patch.length === 0) {
    return { formattedSnippet: '', startLine: 1 }
  }

  // 找到所有 hunk 覆盖的行范围
  let minLine = Infinity
  let maxLine = -Infinity

  for (const hunk of patch) {
    if (hunk.oldStart < minLine) {
      minLine = hunk.oldStart
    }
    const hunkEnd = hunk.oldStart + (hunk.newLines || 0) - 1
    if (hunkEnd > maxLine) {
      maxLine = hunkEnd
    }
  }

  // 加上下文行
  const startLine = Math.max(1, minLine - CONTEXT_LINES)
  const endLine = maxLine + CONTEXT_LINES

  const fileLines = newFile.split(/\r?\n/)
  const snippetLines = fileLines.slice(startLine - 1, endLine)
  const snippet = snippetLines.join('\n')

  const formattedSnippet = addLineNumbers({
    content: snippet,
    startLine,
  })

  return { formattedSnippet, startLine }
}

/**
 * 从原始文件和编辑参数获取片段（便捷函数）
 *
 * 对齐上游实现：按 claude-code/src/tools/FileEditTool/utils.ts getSnippet 原样复刻
 */
export function getSnippet(
  originalFile: string,
  oldString: string,
  newString: string,
  contextLines: number = 4,
): { snippet: string; startLine: number } {
  const before = originalFile.split(oldString)[0] ?? ''
  const replacementLine = before.split(/\r?\n/).length - 1
  const newFileLines = applyEditToFile(
    originalFile,
    oldString,
    newString,
  ).split(/\r?\n/)

  const startLine = Math.max(0, replacementLine - contextLines)
  const endLine =
    replacementLine + contextLines + newString.split(/\r?\n/).length

  const snippetLines = newFileLines.slice(startLine, endLine)
  const snippet = snippetLines.join('\n')

  return { snippet, startLine: startLine + 1 }
}

// ============================================================================
// Patch → Edit 转换
// ============================================================================

/**
 * 从结构化 patch 反向提取编辑列表
 *
 * 对齐上游实现：按 claude-code/src/tools/FileEditTool/utils.ts getEditsForPatch 原样复刻
 * 设计原因：从 diff hunk 中还原 old_string/new_string 对
 */
export function getEditsForPatch(patch: StructuredPatchHunk[]): FileEdit[] {
  return patch.map(hunk => {
    const contextLines: string[] = []
    const oldLines: string[] = []
    const newLines: string[] = []

    for (const line of hunk.lines) {
      if (line.startsWith(' ')) {
        // 上下文行
        contextLines.push(line.slice(1))
        oldLines.push(line.slice(1))
        newLines.push(line.slice(1))
      } else if (line.startsWith('-')) {
        // 删除行
        oldLines.push(line.slice(1))
      } else if (line.startsWith('+')) {
        // 新增行
        newLines.push(line.slice(1))
      }
    }

    return {
      old_string: oldLines.join('\n'),
      new_string: newLines.join('\n'),
      replace_all: false,
    }
  })
}

// ============================================================================
// 反净化处理
// ============================================================================

/**
 * LLM 输出中可能包含被净化（sanitized）的标签，需要还原
 *
 * 对齐上游实现：API 会净化特殊标签，LLM 编辑时输出净化后的版本
 * 这些映射将净化后的文本还原为原始文本
 */
const DESANITIZATIONS: Record<string, string> = {
  '<fnr>': '<function_results>',
  '<n>': '<name>',
  '</n>': '</name>',
  '<o>': '<output>',
  '</o>': '</output>',
  '<e>': '<error>',
  '</e>': '</error>',
  '<s>': '<system>',
  '</s>': '</system>',
  '<r>': '<result>',
  '</r>': '</result>',
  '< META_START >': '<META_START>',
  '< META_END >': '<META_END>',
  '< EOT >': '<EOT>',
  '< META >': '<META>',
  '< SOS >': '<SOS>',
  '\n\nH:': '\n\nHuman:',
  '\n\nA:': '\n\nAssistant:',
}

/**
 * 反净化匹配字符串
 *
 * 对齐上游实现：当精确匹配失败时，尝试反净化 old_string 后再匹配
 * @returns 规范化后的字符串和应用的替换列表
 */
function desanitizeMatchString(matchString: string): {
  result: string
  appliedReplacements: Array<{ from: string; to: string }>
} {
  let result = matchString
  const appliedReplacements: Array<{ from: string; to: string }> = []

  for (const [from, to] of Object.entries(DESANITIZATIONS)) {
    const beforeReplace = result
    result = result.replaceAll(from, to)

    if (beforeReplace !== result) {
      appliedReplacements.push({ from, to })
    }
  }

  return { result, appliedReplacements }
}

// ============================================================================
// 输入规范化
// ============================================================================

/**
 * 规范化 FileEdit 输入
 *
 * 对齐上游实现：
 * 1. 去除 new_string 尾部空白（Markdown 文件除外，两个尾部空格是硬换行）
 * 2. 精确匹配失败时尝试反净化
 * 3. 将相同的反净化替换应用到 new_string
 *
 * 设计原因：处理 LLM 输出与文件内容之间的格式差异
 */
export function normalizeFileEditInput({
  file_path,
  edits,
}: {
  file_path: string
  edits: EditInput[]
}): {
  file_path: string
  edits: EditInput[]
} {
  if (edits.length === 0) {
    return { file_path, edits }
  }

  // Markdown 使用两个尾部空格作为硬换行，不能去除
  const isMarkdown = /\.(md|mdx)$/i.test(file_path)

  try {
    const fullPath = expandPath(file_path)

    // TODO: readFileSyncCached 待 file.ts 补齐，暂时使用同步读取
    // 对齐上游实现：使用缓存读取避免冗余 I/O
    let fileContent: string
    try {
      // eslint-disable-next-line custom-rules/no-sync-fs
      const nodeFs = require('fs')
      fileContent = nodeFs.readFileSync(fullPath, 'utf-8')
    } catch {
      // 文件不存在时返回原始输入
      return { file_path, edits }
    }

    return {
      file_path,
      edits: edits.map(({ old_string, new_string, replace_all }) => {
        const normalizedNewString = isMarkdown
          ? new_string
          : stripTrailingWhitespace(new_string)

        // 精确匹配成功，保持原样
        if (fileContent.includes(old_string)) {
          return {
            old_string,
            new_string: normalizedNewString,
            replace_all,
          }
        }

        // 尝试反净化匹配
        const { result: desanitizedOldString, appliedReplacements } =
          desanitizeMatchString(old_string)

        if (fileContent.includes(desanitizedOldString)) {
          // 对 new_string 应用相同的反净化替换
          let desanitizedNewString = normalizedNewString
          for (const { from, to } of appliedReplacements) {
            desanitizedNewString = desanitizedNewString.replaceAll(from, to)
          }

          return {
            old_string: desanitizedOldString,
            new_string: desanitizedNewString,
            replace_all,
          }
        }

        return {
          old_string,
          new_string: normalizedNewString,
          replace_all,
        }
      }),
    }
  } catch (error) {
    // 文件不存在（ENOENT）是预期情况，其他错误记录日志
    if (!isENOENT(error)) {
      // TODO: logError 待 log.ts 实现后补齐
      console.error(error)
    }
  }

  return { file_path, edits }
}

// ============================================================================
// 编辑等价性判断
// ============================================================================

/**
 * 比较两组编辑是否等价（通过应用结果判断）
 *
 * 对齐上游实现：
 * 1. 快速路径：字面相等直接返回 true
 * 2. 语义路径：应用两组编辑，比较结果
 * 3. 两侧都报错时，比较错误消息
 */
export function areFileEditsEquivalent(
  edits1: FileEdit[],
  edits2: FileEdit[],
  originalContent: string,
): boolean {
  // 快速路径：字面相等
  if (
    edits1.length === edits2.length &&
    edits1.every((edit1, index) => {
      const edit2 = edits2[index]
      return (
        edit2 !== undefined &&
        edit1.old_string === edit2.old_string &&
        edit1.new_string === edit2.new_string &&
        edit1.replace_all === edit2.replace_all
      )
    })
  ) {
    return true
  }

  // 语义路径：应用编辑并比较结果
  let result1: { patch: StructuredPatchHunk[]; updatedFile: string } | null =
    null
  let error1: string | null = null
  let result2: { patch: StructuredPatchHunk[]; updatedFile: string } | null =
    null
  let error2: string | null = null

  try {
    result1 = getPatchForEdits({
      filePath: 'temp',
      fileContents: originalContent,
      edits: edits1,
    })
  } catch (e) {
    error1 = errorMessage(e)
  }

  try {
    result2 = getPatchForEdits({
      filePath: 'temp',
      fileContents: originalContent,
      edits: edits2,
    })
  } catch (e) {
    error2 = errorMessage(e)
  }

  // 两侧都报错时比较错误消息
  if (error1 !== null && error2 !== null) {
    return error1 === error2
  }

  // 一侧报错另一侧成功，不等价
  if (error1 !== null || error2 !== null) {
    return false
  }

  // 两侧都成功，比较结果文件内容
  return result1!.updatedFile === result2!.updatedFile
}

/**
 * 统一函数：判断两组 FileEdit 输入是否等价
 *
 * 对齐上游实现：
 * 1. 不同文件路径直接返回 false
 * 2. 字面相等快速路径
 * 3. 语义比较（需读取文件内容）
 */
export function areFileEditsInputsEquivalent(
  input1: {
    file_path: string
    edits: FileEdit[]
  },
  input2: {
    file_path: string
    edits: FileEdit[]
  },
): boolean {
  // 不同文件直接不等价
  if (input1.file_path !== input2.file_path) {
    return false
  }

  // 字面相等快速路径
  if (
    input1.edits.length === input2.edits.length &&
    input1.edits.every((edit1, index) => {
      const edit2 = input2.edits[index]
      return (
        edit2 !== undefined &&
        edit1.old_string === edit2.old_string &&
        edit1.new_string === edit2.new_string &&
        edit1.replace_all === edit2.replace_all
      )
    })
  ) {
    return true
  }

  // 语义比较：读取文件内容后比较编辑结果
  let fileContent = ''
  try {
    // TODO: readFileSyncCached 待 file.ts 补齐，暂时使用同步读取
    // eslint-disable-next-line custom-rules/no-sync-fs
    const fs = require('fs')
    fileContent = fs.readFileSync(input1.file_path, 'utf-8')
  } catch (error) {
    if (!isENOENT(error)) {
      throw error
    }
  }

  return areFileEditsEquivalent(input1.edits, input2.edits, fileContent)
}
