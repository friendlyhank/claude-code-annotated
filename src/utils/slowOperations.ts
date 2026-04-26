/**
 * 慢操作工具函数
 *
 * 对齐上游实现：按 claude-code/src/utils/slowOperations.ts 原样复刻
 * 设计原因：检测和记录慢操作，帮助性能优化
 */

import { feature } from 'bun:bundle'
import type { WriteFileOptions } from 'fs'
import {
  closeSync,
  writeFileSync as fsWriteFileSync,
  fsyncSync,
  openSync,
} from 'fs'
// biome-ignore lint: This file IS the cloneDeep wrapper - it must import the original
import lodashCloneDeep from 'lodash-es/cloneDeep.js'
import { addSlowOperation } from '../bootstrap/state.js'
import { logForDebugging } from './debug.js'

// Extended WriteFileOptions to include 'flush' which is available in Node.js 20.1.0+
// but not yet in @types/node
type WriteFileOptionsWithFlush =
  | WriteFileOptions
  | (WriteFileOptions & { flush?: boolean })

// --- Slow operation logging infrastructure ---

/**
 * 慢 JSON/克隆操作的日志阈值（毫秒）
 * 超过此阈值的操作将被记录以供调试
 * - 覆盖：将 CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS 设置为数字
 * - 开发构建：20ms（开发的较低阈值）
 * - Ants：300ms（为所有内部用户启用）
 */
const SLOW_OPERATION_THRESHOLD_MS = (() => {
  const envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS
  if (envValue !== undefined) {
    const parsed = Number(envValue)
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return 20
  }
  if (process.env.USER_TYPE === 'ant') {
    return 300
  }
  return Infinity
})()

// 重新导出，供仍需要阈值值的调用者使用
export { SLOW_OPERATION_THRESHOLD_MS }

// 模块级重入保护。logForDebugging 通过 appendFileSync 写入调试文件，
// 这会再次经过 slowLogging。没有此保护，
// 慢 appendFileSync → dispose → logForDebugging → appendFileSync → dispose → ...
let isLogging = false

/**
 * 提取此文件之外的第一帧堆栈，使 DevBar 警告
 * 指向实际调用者而非无用的 `Object{N keys}`。
 * 仅在实际操作缓慢时调用——永不走快速路径
 */
export function callerFrame(stack: string | undefined): string {
  if (!stack) return ''
  for (const line of stack.split('\n')) {
    if (line.includes('slowOperations')) continue
    const m = line.match(/([^/\\]+?):(\d+):\d+\)?$/)
    if (m) return ` @ ${m[1]}:${m[2]}`
  }
  return ''
}

/**
 * 从标记模板参数构建人类可读的描述
 * 仅在实际操作缓慢时调用——永不走快速路径
 *
 * args[0] = TemplateStringsArray, args[1..n] = 插值
 */
function buildDescription(args: IArguments): string {
  const strings = args[0] as TemplateStringsArray
  let result = ''
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]
    if (i + 1 < args.length) {
      const v = args[i + 1]
      if (Array.isArray(v)) {
        result += `Array[${(v as unknown[]).length}]`
      } else if (v !== null && typeof v === 'object') {
        result += `Object{${Object.keys(v as Record<string, unknown>).length} keys}`
      } else if (typeof v === 'string') {
        result += v.length > 80 ? `${v.slice(0, 80)}…` : v
      } else {
        result += String(v)
      }
    }
  }
  return result
}

class AntSlowLogger {
  startTime: number
  args: IArguments
  err: Error

  constructor(args: IArguments) {
    this.startTime = performance.now()
    this.args = args
    // V8/JSC 在构造时捕获堆栈，但延迟昂贵的字符串
    // 格式化直到读取 .stack——所以这保持离快速路径
    this.err = new Error()
  }

  [Symbol.dispose](): void {
    const duration = performance.now() - this.startTime
    if (duration > SLOW_OPERATION_THRESHOLD_MS && !isLogging) {
      isLogging = true
      try {
        const description =
          buildDescription(this.args) + callerFrame(this.err.stack)
        logForDebugging(
          `[SLOW OPERATION DETECTED] ${description} (${duration.toFixed(1)}ms)`,
        )
        addSlowOperation(description, duration)
      } finally {
        isLogging = false
      }
    }
  }
}

const NOOP_LOGGER: Disposable = { [Symbol.dispose]() {} }

// 必须是常规函数（非箭头）以访问 `arguments`
function slowLoggingAnt(
  _strings: TemplateStringsArray,
  ..._values: unknown[]
): AntSlowLogger {
  // eslint-disable-next-line prefer-rest-params
  return new AntSlowLogger(arguments)
}

function slowLoggingExternal(): Disposable {
  return NOOP_LOGGER
}

/**
 * 慢操作日志的标记模板
 *
 * 在 ANT 构建中：创建 AntSlowLogger 计时操作并在
 * 超过阈值时记录日志。描述仅在缓慢时惰性构建
 *
 * 在外部构建中：返回单例无操作 disposable。零分配，
 * 零计时。AntSlowLogger 和 buildDescription 被死代码消除
 *
 * @example
 * using _ = slowLogging`structuredClone(${value})`
 * const result = structuredClone(value)
 */
export const slowLogging: {
  (strings: TemplateStringsArray, ...values: unknown[]): Disposable
} = feature('SLOW_OPERATION_LOGGING') ? slowLoggingAnt : slowLoggingExternal

// --- Wrapped operations ---

/**
 * 带慢操作日志的 JSON.stringify 包装器
 * 使用此函数替代 JSON.stringify 以检测性能问题
 *
 * @example
 * import { jsonStringify } from './slowOperations.js'
 * const json = jsonStringify(data)
 * const prettyJson = jsonStringify(data, null, 2)
 */
export function jsonStringify(
  value: unknown,
  replacer?: (this: unknown, key: string, value: unknown) => unknown,
  space?: string | number,
): string
export function jsonStringify(
  value: unknown,
  replacer?: (number | string)[] | null,
  space?: string | number,
): string
export function jsonStringify(
  value: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | (number | string)[]
    | null,
  space?: string | number,
): string {
  using _ = slowLogging`JSON.stringify(${value})`
  return JSON.stringify(
    value,
    replacer as Parameters<typeof JSON.stringify>[1],
    space,
  )
}

/**
 * 带慢操作日志的 JSON.parse 包装器
 * 使用此函数替代 JSON.parse 以检测性能问题
 *
 * @example
 * import { jsonParse } from './slowOperations.js'
 * const data = jsonParse(jsonString)
 */
export const jsonParse: typeof JSON.parse = (text, reviver) => {
  using _ = slowLogging`JSON.parse(${text})`
  // V8 在传递第二个参数时会去优化 JSON.parse，即使是 undefined
  // 显式分支以便常见（无 reviver）路径保持在快速路径上
  return typeof reviver === 'undefined'
    ? JSON.parse(text)
    : JSON.parse(text, reviver)
}

/**
 * 带慢操作日志的 structuredClone 包装器
 * 使用此函数替代 structuredClone 以检测性能问题
 *
 * @example
 * import { clone } from './slowOperations.js'
 * const copy = clone(originalObject)
 */
export function clone<T>(value: T, options?: StructuredSerializeOptions): T {
  using _ = slowLogging`structuredClone(${value})`
  return structuredClone(value, options)
}

/**
 * 带慢操作日志的 cloneDeep 包装器
 * 使用此函数替代 lodash cloneDeep 以检测性能问题
 *
 * @example
 * import { cloneDeep } from './slowOperations.js'
 * const copy = cloneDeep(originalObject)
 */
export function cloneDeep<T>(value: T): T {
  using _ = slowLogging`cloneDeep(${value})`
  return lodashCloneDeep(value)
}

/**
 * 带慢操作日志的 fs.writeFileSync 包装器
 * 支持 flush 选项以确保数据在返回前写入磁盘
 * @param filePath 要写入的文件路径
 * @param data 要写入的数据（字符串或 Buffer）
 * @param options 可选的写入选项（编码、模式、标志、flush）
 * @deprecated 使用 `fs.promises.writeFile` 代替非阻塞写入
 * 同步文件写入会阻塞事件循环并导致性能问题
 */
export function writeFileSync_DEPRECATED(
  filePath: string,
  data: string | NodeJS.ArrayBufferView,
  options?: WriteFileOptionsWithFlush,
): void {
  using _ = slowLogging`fs.writeFileSync(${filePath}, ${data})`

  // 检查是否请求 flush（对于对象样式选项）
  const needsFlush =
    options !== null &&
    typeof options === 'object' &&
    'flush' in options &&
    options.flush === true

  if (needsFlush) {
    // 手动 flush：打开文件、写入、fsync、关闭
    const encoding =
      typeof options === 'object' && 'encoding' in options
        ? options.encoding
        : undefined
    const mode =
      typeof options === 'object' && 'mode' in options
        ? options.mode
        : undefined
    let fd: number | undefined
    try {
      fd = openSync(filePath, 'w', mode)
      fsWriteFileSync(fd, data, { encoding: encoding ?? undefined })
      fsyncSync(fd)
    } finally {
      if (fd !== undefined) {
        closeSync(fd)
      }
    }
  } else {
    // 无需 flush，使用标准 writeFileSync
    fsWriteFileSync(filePath, data, options as WriteFileOptions)
  }
}
