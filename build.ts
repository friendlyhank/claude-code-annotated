/**
 * 构建脚本
 * 
 * 源码复刻参考: claude-code/build.ts
 * 
 * 实现原理:
 * 1. 清理输出目录
 * 2. 使用 Bun.build 打包 ESM 模块
 * 3. 输出构建结果
 */

import { readdir } from 'fs/promises'
import { rmSync } from 'fs'

const outdir = 'dist'

// ========================================
// Step 1: 清理输出目录
// ========================================
rmSync(outdir, { recursive: true, force: true })

// ========================================
// Step 2: 使用 Bun.build 打包
// 参考: 源码 build.ts
// ========================================
const result = await Bun.build({
  entrypoints: ['src/entrypoints/cli.tsx'],
  outdir,
  target: 'bun',
  splitting: true,
  define: {
    // 构建时内联版本号，避免运行时读取 package.json
    'MACRO.VERSION': '"2.1.888"',
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
