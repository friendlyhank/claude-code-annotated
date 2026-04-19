/**
 * FileEditTool 类型定义
 *
 * 对齐上游实现：按 claude-code/src/tools/FileEditTool/types.ts 原样复刻
 * 设计原因：
 * 1. 集中管理输入/输出 schema 和类型
 * 2. lazySchema 支持延迟求值，避免循环依赖
 * 3. semanticBoolean 处理 LLM 输出的字符串布尔值
 */

import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'
import { semanticBoolean } from '../../utils/semanticBoolean.js'

// 输入 schema：file_path + old_string + new_string + 可选 replace_all
const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z.string().describe('The absolute path to the file to modify'),
    old_string: z.string().describe('The text to replace'),
    new_string: z
      .string()
      .describe(
        'The text to replace it with (must be different from old_string)',
      ),
    replace_all: semanticBoolean(
      z.boolean(),
    ).default(false).optional().describe('Replace all occurrences of old_string (default false)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

// 解析后输出类型 — call() 接收的类型
// z.output 而非 z.input：semanticBoolean 使输入端为 unknown（preprocess 接受任意值）
export type FileEditInput = z.output<InputSchema>

// 不含 file_path 的单个编辑类型
export type EditInput = Omit<FileEditInput, 'file_path'>

// 运行时版本，replace_all 始终为 boolean
export type FileEdit = {
  old_string: string
  new_string: string
  replace_all: boolean
}

// diff hunk schema
export const hunkSchema = lazySchema(() =>
  z.object({
    oldStart: z.number(),
    oldLines: z.number(),
    newStart: z.number(),
    newLines: z.number(),
    lines: z.array(z.string()),
  }),
)

// git diff schema
export const gitDiffSchema = lazySchema(() =>
  z.object({
    filename: z.string(), // 文件名
    status: z.enum(['modified', 'added']), // 状态
    additions: z.number(), // 新增行数
    deletions: z.number(), // 删除行数
    changes: z.number(), // 变更行数
    patch: z.string(), // diff patch
    repository: z
      .string()
      .nullable()
      .optional()
      .describe('GitHub owner/repo when available'),
  }),
)

// 输出 schema
const outputSchema = lazySchema(() =>
  z.object({
    filePath: z.string().describe('The file path that was edited'),
    oldString: z.string().describe('The original string that was replaced'),
    newString: z.string().describe('The new string that replaced it'),
    originalFile: z
      .string()
      .describe('The original file contents before editing'),
    structuredPatch: z
      .array(hunkSchema())
      .describe('Diff patch showing the changes'),
    userModified: z
      .boolean()
      .describe('Whether the user modified the proposed changes'),
    replaceAll: z.boolean().describe('Whether all occurrences were replaced'),
    gitDiff: gitDiffSchema().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type FileEditOutput = z.infer<OutputSchema>

export { inputSchema, outputSchema }
