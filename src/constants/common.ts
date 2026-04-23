/**
 * Common constants
 *
 *
 * 功能:
 * - getLocalISODate: 获取本地 ISO 格式日期
 */

export function getLocalISODate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split('T')[0] ?? ''
}

export function getSessionStartDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
