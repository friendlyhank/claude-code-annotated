/**
 * Claude Code Annotated - 系统提示词
 *
 * 源码复刻参考: claude-code/src/constants/prompts.ts
 *
 * 功能:
 * - getSystemPrompt: 构建系统提示词，包含环境信息
 * - computeEnvInfo: 计算环境信息
 * - getUnameSR: 获取系统版本信息
 */

import { type as osType, release as osRelease, version as osVersion } from 'os'
import { getCwd } from '../utils/cwd.js'
import type { Tools } from '../Tool.js'

function getShellInfoLine(): string {
  const shell = process.env.SHELL || 'unknown'
  const shellName = shell.includes('zsh')
    ? 'zsh'
    : shell.includes('bash')
      ? 'bash'
      : shell
  const platform = process.platform
  if (platform === 'win32') {
    return `Shell: ${shellName} (use Unix shell syntax, not Windows — e.g., /dev/null not NUL, forward slashes in paths)`
  }
  return `Shell: ${shellName}`
}

export function getUnameSR(): string {
  const platform = process.platform
  if (platform === 'win32') {
    return `${osVersion()} ${osRelease()}`
  }
  return `${osType()} ${osRelease()}`
}

export async function computeEnvInfo(
  modelId: string,
  additionalWorkingDirectories?: string[],
): Promise<string> {
  const isGit = false
  const unameSR = getUnameSR()

  let modelDescription = ''
  const marketingName: string | null = null
  modelDescription = marketingName
    ? `You are powered by the model named ${marketingName}. The exact model ID is ${modelId}.`
    : `You are powered by the model ${modelId}.`

  const additionalDirsInfo =
    additionalWorkingDirectories && additionalWorkingDirectories.length > 0
      ? `Additional working directories: ${additionalWorkingDirectories.join(', ')}\n`
      : ''

  const cutoff: string | null = null
  const knowledgeCutoffMessage = cutoff
    ? `\n\nAssistant knowledge cutoff is ${cutoff}.`
    : ''

  return `Here is useful information about the environment you are running in:
<env>
Working directory: ${getCwd()}
Is directory a git repo: ${isGit ? 'Yes' : 'No'}
${additionalDirsInfo}Platform: ${process.platform}
${getShellInfoLine()}
OS Version: ${unameSR}
</env>
${modelDescription}${knowledgeCutoffMessage}`
}

export async function getSystemPrompt(
  tools: Tools,
  model: string,
  additionalWorkingDirectories?: string[],
): Promise<string[]> {
  const envInfo = await computeEnvInfo(model, additionalWorkingDirectories)

  return [
    `You are Claude Code, Anthropic's official CLI for Claude.`,
    envInfo,
  ]
}
