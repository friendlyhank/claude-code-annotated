/**
 * 按行范围读取文件
 *
 * 对齐上游实现：按 claude-code/src/utils/readFileInRange.ts 原样复刻
 *
 * 两条代码路径：
 * - 快速路径（常规文件 < 10MB）：readFile + 内存分割，避免 createReadStream 的逐块异步开销
 * - 流式路径（大文件、管道、设备等）：createReadStream + 手动换行扫描，
 *   只累积请求范围内的行，范围外只计数丢弃，避免内存膨胀
 *
 * 两条路径均剥离 UTF-8 BOM 和 \r（CRLF → LF）
 * mtime 来自已打开 fd 的 fstat/stat — 无额外 open()
 */

import { createReadStream, fstat } from 'fs'
import { stat as fsStat, readFile } from 'fs/promises'
import { formatFileSize } from './format.js'

// 快速路径：常规文件 < 10MB
const FAST_PATH_MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// 流式路径：createReadStream + 手动换行扫描
export type ReadFileRangeResult = {
  content: string // 读取到的文件内容
  lineCount: number // 读取到的行数（包含偏移量）
  totalLines: number // 总行数
  totalBytes: number // 总字节数
  readBytes: number // 已读取的字节数
  mtimeMs: number // 文件修改修改时间时间戳
  /** 输出因 maxBytes 截断模式被裁剪时为 true */
  truncatedByBytes?: boolean // 是否根据字节数截断
}

// 文件内容超出最大允许大小错误
// 设计原因：在读取文件内容前，检查文件大小是否超出最大允许大小
export class FileTooLargeError extends Error {
  constructor(
    public sizeInBytes: number,
    public maxSizeBytes: number,
  ) {
    super(
      `File content (${formatFileSize(sizeInBytes)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`,
    )
    this.name = 'FileTooLargeError'
  }
}

// ---------------------------------------------------------------------------
// Public entry point — 按行范围读取文件
// ---------------------------------------------------------------------------

export async function readFileInRange(
  filePath: string, // 输入路径（包含扩展名）
  offset = 0, // 读取偏移量（行号）
  maxLines?: number, // 最大读取行数（行号）
  maxBytes?: number, // 最大读取字节数
  signal?: AbortSignal, // 取消信号
  options?: { truncateOnByteLimit?: boolean }, // 截断选项
): Promise<ReadFileRangeResult> {
  signal?.throwIfAborted() // 检查取消信号
  // 从选项中获取截断模式
  const truncateOnByteLimit = options?.truncateOnByteLimit ?? false

  // stat 决定代码路径并防止 OOM
  const stats = await fsStat(filePath)

  if (stats.isDirectory()) {
    throw new Error(
      `EISDIR: illegal operation on a directory, read '${filePath}'`,
    )
  }

  // 快速路径：常规文件 < 10MB
  if (stats.isFile() && stats.size < FAST_PATH_MAX_SIZE) {
    if (
      !truncateOnByteLimit &&
      maxBytes !== undefined &&
      stats.size > maxBytes
    ) {
      throw new FileTooLargeError(stats.size, maxBytes)
    }

    // 读取文件内容
    const text = await readFile(filePath, { encoding: 'utf8', signal })
    // 快速路径：readFile + 内存分割
    return readFileInRangeFast(
      text, // 输入文本内容
      stats.mtimeMs, // 文件修改时间（毫秒）
      offset, // 读取偏移量（行号）
      maxLines, // 最大读取行数（行号）
      truncateOnByteLimit ? maxBytes : undefined, // 截断字节数
    )
  }

  // 流式路径：createReadStream + 手动换行扫描
  return readFileInRangeStreaming(
    filePath,
    offset,
    maxLines,
    maxBytes,
    truncateOnByteLimit,
    signal,
  )
}

// ---------------------------------------------------------------------------
// 快速路径 — readFile + 内存分割
// ---------------------------------------------------------------------------

function readFileInRangeFast(
  raw: string, // 输入文本内容
  mtimeMs: number, // 文件修改时间（毫秒）
  offset: number, // 读取偏移量（行号）
  maxLines: number | undefined, // 最大读取行数（行号）
  truncateAtBytes: number | undefined, // 截断字节数
): ReadFileRangeResult {
  // 计算结束行号
  const endLine = maxLines !== undefined ? offset + maxLines : Infinity

  // 剥离 BOM
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw

  const selectedLines: string[] = [] // 选中的行内容
  let lineIndex = 0 // 当前行行号
  let startPos = 0 // 当前行起始位置（字节）
  let newlinePos: number // 当前行换行符位置（字节）
  let selectedBytes = 0 // 已选字节数
  let truncatedByBytes = false // 是否因 maxBytes 截断模式被裁剪

  // 尝试添加行到选中行列表
  function tryPush(line: string): boolean {
    if (truncateAtBytes !== undefined) {
      // 计算下一行的字节数
      const sep = selectedLines.length > 0 ? 1 : 0
      // 计算下一行的字节数
      const nextBytes = selectedBytes + sep + Buffer.byteLength(line)
      if (nextBytes > truncateAtBytes) {
        truncatedByBytes = true
        return false
      }
      selectedBytes = nextBytes
    }
    selectedLines.push(line)
    return true
  }

  // 遍历文本内容，按行分割
  while ((newlinePos = text.indexOf('\n', startPos)) !== -1) {
    if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
      let line = text.slice(startPos, newlinePos)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }
      tryPush(line)
    }
    lineIndex++
    startPos = newlinePos + 1
  }

  // 末尾无换行的最后一段
  if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
    let line = text.slice(startPos)
    if (line.endsWith('\r')) {
      line = line.slice(0, -1)
    }
    tryPush(line)
  }
  lineIndex++

  const content = selectedLines.join('\n')
  return {
    content,
    lineCount: selectedLines.length,
    totalLines: lineIndex,
    totalBytes: Buffer.byteLength(text, 'utf8'),
    readBytes: Buffer.byteLength(content, 'utf8'),
    mtimeMs,
    ...(truncatedByBytes ? { truncatedByBytes: true } : {}),
  }
}

// ---------------------------------------------------------------------------
// 流式路径 — createReadStream + 事件处理
// ---------------------------------------------------------------------------

type StreamState = {
  stream: ReturnType<typeof createReadStream> // 文件流
  offset: number // 读取偏移量（行号）
  endLine: number // 结束行号（不包含）
  maxBytes: number | undefined // 截断字节数
  truncateOnByteLimit: boolean // 是否根据字节数截断
  resolve: (value: ReadFileRangeResult) => void // 成功回调函数
  totalBytesRead: number // 已读取的字节数
  selectedBytes: number // 已选字节数
  truncatedByBytes: boolean // 是否根据字节数截断
  currentLineIndex: number // 当前行行号
  selectedLines: string[] // 选中的行内容
  partial: string // 部分数据缓存
  isFirstChunk: boolean // 是否是第一个数据块
  resolveMtime: (ms: number) => void // 成功回调函数，修改时间时间戳
  mtimeReady: Promise<number> // 文件修改时间时间戳
}

// 文件流打开事件处理
function streamOnOpen(this: StreamState, fd: number): void {
  fstat(fd, (err, stats) => {
    this.resolveMtime(err ? 0 : stats.mtimeMs)
  })
}

// 文件流数据事件处理
function streamOnData(this: StreamState, chunk: string): void {
  // 处理第一个数据块
  if (this.isFirstChunk) {
    this.isFirstChunk = false
    // 剥离 BOM
    if (chunk.charCodeAt(0) === 0xfeff) {
      // 剥离 BOM
      chunk = chunk.slice(1)
    }
  }

  // 累加字节数
  this.totalBytesRead += Buffer.byteLength(chunk)
  if (
    // 检查是否超过最大字节数
    !this.truncateOnByteLimit &&
    this.maxBytes !== undefined &&
    this.totalBytesRead > this.maxBytes
  ) {
    // 超过最大字节数，销毁流
    this.stream.destroy(
      new FileTooLargeError(this.totalBytesRead, this.maxBytes),
    )
    return
  }

  // 处理数据块
  // 合并当前数据块与缓存数据
  const data = this.partial.length > 0 ? this.partial + chunk : chunk
  this.partial = ''

  let startPos = 0
  let newlinePos: number
  // 遍历数据块，按行分割
  while ((newlinePos = data.indexOf('\n', startPos)) !== -1) {
    if (
      this.currentLineIndex >= this.offset &&
      this.currentLineIndex < this.endLine
    ) {
      // 处理当前行
      let line = data.slice(startPos, newlinePos)
      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }
      // 检查是否超过最大字节数
      if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
        const sep = this.selectedLines.length > 0 ? 1 : 0
        // 计算下一行的字节数
        const nextBytes = this.selectedBytes + sep + Buffer.byteLength(line)
        // 检查是否超过最大字节数
        if (nextBytes > this.maxBytes) {
          this.truncatedByBytes = true
          this.endLine = this.currentLineIndex
        } else {
          this.selectedBytes = nextBytes
          this.selectedLines.push(line)
        }
      } else {
        this.selectedLines.push(line)
      }
    }
    this.currentLineIndex++
    startPos = newlinePos + 1
  }

  // 只在选择范围内保留末尾片段，范围外仅计数防止内存膨胀
  if (startPos < data.length) {
    if (
      this.currentLineIndex >= this.offset &&
      this.currentLineIndex < this.endLine
    ) {
      // 处理末尾片段 计算片段的字节数
      const fragment = data.slice(startPos)
      // 检查是否超过最大字节数
      if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
        const sep = this.selectedLines.length > 0 ? 1 : 0
        const fragBytes = this.selectedBytes + sep + Buffer.byteLength(fragment)
        // 检查是否超过最大字节数
        if (fragBytes > this.maxBytes) {
          this.truncatedByBytes = true
          this.endLine = this.currentLineIndex
          return
        }
      }
      this.partial = fragment
    }
  }
}

// 文件流结束事件处理
function streamOnEnd(this: StreamState): void {
  let line = this.partial
  if (line.endsWith('\r')) {
    line = line.slice(0, -1)
  }
  if (
    this.currentLineIndex >= this.offset &&
    this.currentLineIndex < this.endLine
  ) {
    // 处理当前行 检查是否超过最大字节数
    if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
      const sep = this.selectedLines.length > 0 ? 1 : 0
      const nextBytes = this.selectedBytes + sep + Buffer.byteLength(line)
      // 检查是否超过最大字节数
      if (nextBytes > this.maxBytes) {
        this.truncatedByBytes = true
      } else {
        this.selectedLines.push(line)
      }
    } else {
      this.selectedLines.push(line)
    }
  }
  this.currentLineIndex++

  // 合并选中的行内容
  const content = this.selectedLines.join('\n')
  // 检查是否超过最大字节数
  const truncated = this.truncatedByBytes
  // 处理文件修改时间时间戳
  this.mtimeReady.then(mtimeMs => {
    // 处理结果
    this.resolve({
      content,// 选中的行内容
      lineCount: this.selectedLines.length,// 选中的行数
      totalLines: this.currentLineIndex,// 总行数
      totalBytes: this.totalBytesRead,// 总字节数
      readBytes: Buffer.byteLength(content, 'utf8'),// 已读取的字节数
      mtimeMs,// 文件修改时间时间戳
      ...(truncated ? { truncatedByBytes: true } : {}),// 是否根据字节数截断
    })
  })
}

// 流式路径：createReadStream + 手动换行扫描
function readFileInRangeStreaming(
  filePath: string, // 输入路径（包含扩展名）
  offset: number, // 读取偏移量（行号）
  maxLines: number | undefined, // 最大读取行数（行号）
  maxBytes: number | undefined, // 截断字节数
  truncateOnByteLimit: boolean, // 是否根据字节数截断
  // 取消信号
  signal?: AbortSignal,
): Promise<ReadFileRangeResult> {
  return new Promise((resolve, reject) => {
    // 创建流读取文件
    const state: StreamState = {
      stream: createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 512 * 1024, // 512KB
        ...(signal ? { signal } : undefined),
      }), // 文件流
      offset, // 读取偏移量（行号）
      endLine: maxLines !== undefined ? offset + maxLines : Infinity, // 结束行号（不包含）
      maxBytes, // 截断字节数
      truncateOnByteLimit, // 是否根据字节数截断
      resolve, // 成功回调函数
      totalBytesRead: 0, // 已读取的字节数
      selectedBytes: 0, // 已选字节数
      truncatedByBytes: false, // 是否根据字节数截断
      currentLineIndex: 0, // 当前行行号
      selectedLines: [], // 选中的行内容
      partial: '', // 部分数据缓存
      isFirstChunk: true, // 是否是第一个数据块
      resolveMtime: () => {}, // 成功回调函数，修改时间时间戳
      mtimeReady: null as unknown as Promise<number>, // 文件修改时间时间戳
    }
    // 初始化文件修改时间时间戳
    state.mtimeReady = new Promise<number>(r => {
      state.resolveMtime = r
    })

    // 监听流事件
    state.stream.once('open', streamOnOpen.bind(state))
    // 监听数据事件
    state.stream.on('data', streamOnData.bind(state))
    // 监听结束事件
    state.stream.once('end', streamOnEnd.bind(state))
    // 监听错误事件
    state.stream.once('error', reject)
  })
}
