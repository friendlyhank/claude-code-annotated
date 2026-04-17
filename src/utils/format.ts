/**
 * 纯显示格式化函数
 *
 * 对齐上游实现：按 claude-code/src/utils/format.ts 原样复刻
 * 当前仅实现 FileReadTool 所需的 formatFileSize
 * TODO: formatSecondsShort、formatDuration 等待后续补齐
 */

/**
 * 将字节数格式化为人类可读字符串（KB、MB、GB）
 */
export function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) {
    return `${sizeInBytes} bytes`
  }
  if (kb < 1024) {
    return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}
