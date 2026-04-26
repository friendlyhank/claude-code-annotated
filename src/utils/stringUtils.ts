/**
 * 通用字符串工具函数
 *
 * 对齐上游实现：按 claude-code/src/utils/stringUtils.ts 原样复刻
 * 设计原因：安全字符串累积、转义、规范化
 */

/**
 * 转义字符串中的正则特殊字符，使其可用作 RegExp 构造器的字面量模式
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 将字符串首字母大写，其余保持不变
 * 与 lodash 的 capitalize 不同，不会将其余字符转为小写
 *
 * @example capitalize('fooBar') → 'FooBar'
 * @example capitalize('hello world') → 'Hello world'
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 根据数量返回单词的单数或复数形式
 * 替代内联的 `word${n === 1 ? '' : 's'}` 模式
 *
 * @example plural(1, 'file') → 'file'
 * @example plural(3, 'file') → 'files'
 * @example plural(2, 'entry', 'entries') → 'entries'
 */
export function plural(
  n: number,
  word: string,
  pluralWord = word + 's',
): string {
  return n === 1 ? word : pluralWord
}

/**
 * 返回字符串的第一行，不分配 split 数组
 * 用于 diff 渲染中的 shebang 检测
 */
export function firstLineOf(s: string): string {
  const nl = s.indexOf('\n')
  return nl === -1 ? s : s.slice(0, nl)
}

/**
 * 使用 indexOf 跳跃计数 `char` 在 `str` 中的出现次数
 * 结构化类型设计使 Buffer 也能工作（Buffer.indexOf 接受字符串参数）
 */
export function countCharInString(
  str: { indexOf(search: string, start?: number): number },
  char: string,
  start = 0,
): number {
  let count = 0
  let i = str.indexOf(char, start)
  while (i !== -1) {
    count++
    i = str.indexOf(char, i + 1)
  }
  return count
}

/**
 * 将全角（全角）数字规范化为半角数字
 * 用于接受日语/CJK IME 输入
 */
export function normalizeFullWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  )
}

/**
 * 将全角空格规范化为半角空格
 * 用于接受日语/CJK IME 输入（U+3000 → U+0020）
 */
export function normalizeFullWidthSpace(input: string): string {
  return input.replace(/\u3000/g, ' ')
}

// 保持内存累积适度以避免 RSS 爆炸
// 超过此限制的溢出由 ShellCommand 溢出到磁盘
const MAX_STRING_LENGTH = 2 ** 25

/**
 * 安全地使用分隔符连接字符串数组，如果结果超过 maxSize 则截断
 *
 * @param lines 要连接的字符串数组
 * @param delimiter 字符串之间的分隔符（默认：','）
 * @param maxSize 结果字符串的最大大小
 * @returns 连接后的字符串，必要时截断
 */
export function safeJoinLines(
  lines: string[],
  delimiter: string = ',',
  maxSize: number = MAX_STRING_LENGTH,
): string {
  const truncationMarker = '...[truncated]'
  let result = ''

  for (const line of lines) {
    const delimiterToAdd = result ? delimiter : ''
    const fullAddition = delimiterToAdd + line

    if (result.length + fullAddition.length <= maxSize) {
      // 完整行可以放入
      result += fullAddition
    } else {
      // 需要截断
      const remainingSpace =
        maxSize -
        result.length -
        delimiterToAdd.length -
        truncationMarker.length

      if (remainingSpace > 0) {
        // 添加分隔符和尽可能多的行内容
        result +=
          delimiterToAdd + line.slice(0, remainingSpace) + truncationMarker
      } else {
        // 没有空间放这一行，只添加截断标记
        result += truncationMarker
      }
      return result
    }
  }
  return result
}

/**
 * 字符串累积器，当超过大小限制时从末尾安全截断
 * 防止 RangeError 崩溃，同时保留输出的开头部分
 */
export class EndTruncatingAccumulator {
  private content: string = ''
  private isTruncated = false
  private totalBytesReceived = 0

  /**
   * 创建新的 EndTruncatingAccumulator
   * @param maxSize 截断前的最大字符数
   */
  constructor(private readonly maxSize: number = MAX_STRING_LENGTH) {}

  /**
   * 向累积器追加数据。如果总大小超过 maxSize，末尾将被截断以维持大小限制
   * @param data 要追加的字符串数据
   */
  append(data: string | Buffer): void {
    const str = typeof data === 'string' ? data : data.toString()
    this.totalBytesReceived += str.length

    // 如果已经达到容量并截断，不修改内容
    if (this.isTruncated && this.content.length >= this.maxSize) {
      return
    }

    // 检查添加字符串是否会超过限制
    if (this.content.length + str.length > this.maxSize) {
      // 只追加能放入的部分
      const remainingSpace = this.maxSize - this.content.length
      if (remainingSpace > 0) {
        this.content += str.slice(0, remainingSpace)
      }
      this.isTruncated = true
    } else {
      this.content += str
    }
  }

  /**
   * 返回累积的字符串，如果被截断则添加截断标记
   */
  toString(): string {
    if (!this.isTruncated) {
      return this.content
    }

    const truncatedBytes = this.totalBytesReceived - this.maxSize
    const truncatedKB = Math.round(truncatedBytes / 1024)
    return this.content + `\n... [output truncated - ${truncatedKB}KB removed]`
  }

  /**
   * 清除所有累积数据
   */
  clear(): void {
    this.content = ''
    this.isTruncated = false
    this.totalBytesReceived = 0
  }

  /**
   * 返回当前累积数据的大小
   */
  get length(): number {
    return this.content.length
  }

  /**
   * 返回是否发生了截断
   */
  get truncated(): boolean {
    return this.isTruncated
  }

  /**
   * 返回接收的总字节数（截断前）
   */
  get totalBytes(): number {
    return this.totalBytesReceived
  }
}

/**
 * 将文本截断为最大行数，如果截断则添加省略号
 *
 * @param text 要截断的文本
 * @param maxLines 保留的最大行数
 * @returns 截断后的文本，如果截断则带省略号
 */
export function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) {
    return text
  }
  return lines.slice(0, maxLines).join('\n') + '…'
}
