/**
 * 慢操作工具函数
 *
 * 源码复刻: claude-code/src/utils/slowOperations.ts
 * 当前只实现调试模式所需的部分
 */

export function jsonStringify(
  value: unknown,
  replacer?:
    | (number | string)[]
    | ((this: unknown, key: string, value: unknown) => unknown)
    | null,
  space?: string | number,
): string {
  if (replacer === null || replacer === undefined) {
    return JSON.stringify(value, undefined, space)
  }
  return JSON.stringify(value, replacer as Parameters<typeof JSON.stringify>[1], space)
}

export const jsonParse: typeof JSON.parse = (text, reviver) => {
  return JSON.parse(text, reviver)
}
