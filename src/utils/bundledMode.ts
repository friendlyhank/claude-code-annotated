/**
 * Bundled 模式检测
 *
 * 对齐上游实现：按 claude-code/src/utils/bundledMode.ts 原样复刻
 * 设计原因：检测是否在 Bun 编译的独立可执行文件中运行
 */

/**
 * 检测当前运行时是否为 Bun
 * 当以下情况返回 true：
 * - 通过 bun 命令运行 JS 文件
 * - 运行 Bun 编译的独立可执行文件
 */
export function isRunningWithBun(): boolean {
  // https://bun.com/guides/util/detect-bun
  return process.versions.bun !== undefined
}

/**
 * 检测是否在 Bun 编译的独立可执行文件中运行
 * 通过检查嵌入式文件是否存在来判断（编译后的二进制文件包含这些文件）
 */
export function isInBundledMode(): boolean {
  return (
    typeof Bun !== 'undefined' &&
    Array.isArray(Bun.embeddedFiles) &&
    Bun.embeddedFiles.length > 0
  )
}
