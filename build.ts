/**
 * 构建脚本
 * 
 * 实现原理（参考源码 build.ts）：
 * 1. 清理输出目录
 * 2. 使用 Bun.build 打包
 * 3. 后处理
 */

import { readdir } from 'fs/promises'
import { rmSync } from 'fs'

const outdir = 'dist'

// Step 1: 清理输出目录
rmSync(outdir, { recursive: true, force: true })

// Step 2: 使用 Bun.build 打包
const result = await Bun.build({
  entrypoints: ['src/entrypoints/cli.ts'],
  outdir,
  target: 'bun',
  splitting: true,
  define: {
    MACRO_VERSION: '"0.1.0"',
  },
})

if (!result.success) {
  console.error('构建失败:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(`构建完成: ${result.outputs.length} 个文件输出到 ${outdir}/`)

// Step 3: 列出生成的文件
const files = await readdir(outdir)
for (const file of files) {
  console.log(`  - ${file}`)
}
