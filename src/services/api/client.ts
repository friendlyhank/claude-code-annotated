
// ============================================================================
// client.ts
// ============================================================================
// Anthropic 客户端工厂函数，负责创建和缓存 Anthropic 客户端实例。

import Anthropic from '@anthropic-ai/sdk'

// 缓存 Anthropic 客户端实例
const clientCache = new Map<string, Anthropic>()

// 获取 Anthropic 客户端实例
export async function getAnthropicClient({
  apiKey,
  maxRetries = 0,
}: {
  apiKey?: string
  maxRetries?: number
  model?: string
  source?: string
}): Promise<Anthropic> {
  const resolvedApiKey = apiKey ?? process.env.ANTHROPIC_API_KEY

  if (!resolvedApiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY for Claude API requests')
  }

  const cacheKey = `${maxRetries}:${resolvedApiKey}`
  const cachedClient = clientCache.get(cacheKey)
  if (cachedClient) {
    return cachedClient
  }

  const client = new Anthropic({
    apiKey: resolvedApiKey,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,// 允许在浏览器环境中使用 Anthropic 客户端
  })

  clientCache.set(cacheKey, client)

  return client
}
