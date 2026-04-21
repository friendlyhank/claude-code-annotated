/**
 * 缓存路径管理
 *
 * 源码复刻: claude-code/src/utils/cachePaths.ts
 */

import envPaths from 'env-paths'
import { join } from 'path'
import { getFsImplementation } from './fsOperations.js'

const paths = envPaths('claude-cli')

const MAX_SANITIZED_LENGTH = 200
function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized
  }
  const hash = Math.abs(
    sanitized.split('').reduce((acc, char) => {
      return ((acc << 5) + acc + char.charCodeAt(0)) | 0
    }, 5381),
  )
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash.toString(36)}`
}

function getProjectDir(cwd: string): string {
  return sanitizePath(cwd)
}

export const CACHE_PATHS = {
  baseLogs: () => join(paths.cache, getProjectDir(getFsImplementation().cwd())),
  errors: () =>
    join(paths.cache, getProjectDir(getFsImplementation().cwd()), 'errors'),
  messages: () =>
    join(paths.cache, getProjectDir(getFsImplementation().cwd()), 'messages'),
  mcpLogs: (serverName: string) =>
    join(
      paths.cache,
      getProjectDir(getFsImplementation().cwd()),
      `mcp-logs-${sanitizePath(serverName)}`,
    ),
}
