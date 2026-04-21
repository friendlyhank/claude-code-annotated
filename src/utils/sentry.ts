/**
 * Sentry 集成模块
 *
 * 源码复刻: claude-code/src/utils/sentry.ts
 * 当 SENTRY_DSN 环境变量设置时初始化 Sentry SDK
 */

import { logForDebugging } from './debug.js'

let initialized = false

export function initSentry(): void {
  if (initialized) {
    return
  }

  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logForDebugging('[sentry] SENTRY_DSN not set, skipping initialization')
    return
  }

  try {
    const Sentry = require('@sentry/node')
    Sentry.init({
      dsn,
      maxBreadcrumbs: 20,
      sampleRate: 1.0,
      beforeSend(event) {
        const request = event.request
        if (request?.headers) {
          const sensitiveHeaders = [
            'authorization',
            'x-api-key',
            'cookie',
            'set-cookie',
          ]
          for (const key of Object.keys(request.headers)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
              delete request.headers[key]
            }
          }
        }
        return event
      },
      ignoreErrors: [
        'ECONNREFUSED',
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
        'AbortError',
        'The user aborted a request',
        'CancelError',
      ],
      beforeSendTransaction() {
        return null
      },
    })
    initialized = true
    logForDebugging('[sentry] Initialized successfully')
  } catch {
    // Sentry not installed, skip
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) {
    return
  }

  try {
    const Sentry = require('@sentry/node')
    Sentry.withScope((scope: typeof Sentry.Scope) => {
      if (context) {
        scope.setExtras(context)
      }
      Sentry.captureException(error)
    })
  } catch {
    // Ignore
  }
}

export function setTag(key: string, value: string): void {
  if (!initialized) return
  try {
    const Sentry = require('@sentry/node')
    Sentry.setTag(key, value)
  } catch {
    // Ignore
  }
}

export function setUser(user: { id?: string; email?: string; username?: string }): void {
  if (!initialized) return
  try {
    const Sentry = require('@sentry/node')
    Sentry.setUser(user)
  } catch {
    // Ignore
  }
}

export async function closeSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) return
  try {
    const Sentry = require('@sentry/node')
    await Sentry.close(timeoutMs)
    logForDebugging('[sentry] Closed successfully')
  } catch {
    // Ignore
  }
}

export function isSentryInitialized(): boolean {
  return initialized
}
