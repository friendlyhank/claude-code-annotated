/**
 * Claude Code Annotated - 主命令模块
 *
 * 源码复刻参考: claude-code/src/main.tsx
 *
 * 文件结构:
 * 1. Side-effect imports (必须在其他 imports 之前执行)
 * 2. 大量模块 imports
 * 3. main() 函数 - 初始化并调用 run()
 * 4. run() 函数 - 定义 Commander 命令
 * 5. 辅助函数
 */

// These side-effects must run before all other imports:
// 1. profileCheckpoint marks entry before heavy module evaluation begins
// 2. startMdmRawRead fires MDM subprocesses (plutil/reg query) so they run in
//    parallel with the remaining ~135ms of imports below
// 3. startKeychainPrefetch fires both macOS keychain reads (OAuth + legacy API
//    key) in parallel
// TODO: import { profileCheckpoint } from './utils/startupProfiler.js'
// TODO: profileCheckpoint('main_tsx_entry')
// TODO: import { startMdmRawRead } from './utils/settings/mdm/rawRead.js'
// TODO: startMdmRawRead()
// TODO: import { startKeychainPrefetch } from './utils/secureStorage/keychainPrefetch.js'
// TODO: startKeychainPrefetch()

import {
  Command as CommanderCommand,
  Option,
} from '@commander-js/extra-typings'

/**
 * 全局宏定义
 *
 * Bun.build 在构建时会通过 define 选项将 MACRO.VERSION 替换为实际值
 * 参考: build.ts define: { 'MACRO.VERSION': '"0.1.0"' }
 */
declare const MACRO: {
  VERSION: string
}

// ========================================
// TODO: 状态设置函数 (来自 src/utils/... 模块)
// 参考: 源码 main.tsx 第 340-375 行的 import
// - setIsInteractive (来自某个 utils 模块)
// - setClientType
// - setQuestionPreviewFormat
// - setSessionSource
// ========================================

/**
 * CLI 主入口
 *
 * 参考 claude-code/src/main.tsx 第 873 行 export async function main()
 */
export async function main(): Promise<void> {
  // TODO: profileCheckpoint('main_function_start')

  // ========================================
  // Windows 安全设置 (源码第 879-882 行)
  // ========================================
  process.env.NoDefaultCurrentDirectoryInExePath = '1'

  // ========================================
  // TODO: 初始化警告处理器
  // TODO: initializeWarningHandler()
  // ========================================

  // ========================================
  // 进程退出处理 (源码第 886-898 行)
  // ========================================
  process.on('exit', () => {
    // TODO: resetCursor()
  })
  process.on('SIGINT', () => {
    // In print mode, print.ts registers its own SIGINT handler
    if (process.argv.includes('-p') || process.argv.includes('--print')) {
      return
    }
    process.exit(0)
  })

  // TODO: profileCheckpoint('main_warning_handler_initialized')

  // ========================================
  // 检测交互模式 (源码第 1105-1113 行)
  // ========================================
  const cliArgs = process.argv.slice(2)
  const hasPrintFlag = cliArgs.includes('-p') || cliArgs.includes('--print')
  const isNonInteractive =
    hasPrintFlag || cliArgs.includes('--init-only') || !process.stdout.isTTY

  // Set interactive flag
  setIsInteractive(!isNonInteractive)

  // ========================================
  // TODO: 客户端类型检测 (源码第 1118-1154 行)
  // TODO: setClientType(clientType)
  // TODO: setQuestionPreviewFormat()
  // TODO: setSessionSource()
  // ========================================

  // TODO: profileCheckpoint('main_client_type_determined')
  // TODO: eagerLoadSettings()
  // TODO: profileCheckpoint('main_before_run')

  await run()

  // TODO: profileCheckpoint('main_after_run')
}

/**
 * 主命令定义
 *
 * 参考 claude-code/src/main.tsx 第 1219 行 async function run()
 */
async function run(): Promise<CommanderCommand> {
  // TODO: profileCheckpoint('run_function_start')

  // ========================================
  // 创建 Commander 程序 (源码第 1220-1239 行)
  // ========================================
  function createSortedHelpConfig(): {
    sortSubcommands: true
    sortOptions: true
  } {
    const getOptionSortKey = (opt: Option): string =>
      opt.long?.replace(/^--/, '') ?? opt.short?.replace(/^-/, '') ?? ''
    return Object.assign(
      { sortSubcommands: true, sortOptions: true } as const,
      {
        compareOptions: (a: Option, b: Option) =>
          getOptionSortKey(a).localeCompare(getOptionSortKey(b)),
      },
    )
  }

  const program = new CommanderCommand()
    .configureHelp(createSortedHelpConfig())
    .enablePositionalOptions()

  // TODO: profileCheckpoint('run_commander_initialized')

  // ========================================
  // preAction hook - 在命令执行前初始化
  // 参考: 源码第 1242-1308 行
  // ========================================
  program.hook('preAction', async () => {
    // TODO: profileCheckpoint('preAction_start')
    // TODO: await Promise.all([ensureMdmSettingsLoaded(), ensureKeychainPrefetchCompleted()])
    // TODO: profileCheckpoint('preAction_after_mdm')
    // TODO: await init()
    // TODO: profileCheckpoint('preAction_after_init')
    // TODO: process.title = 'claude'
    // TODO: initSinks()
    // TODO: profileCheckpoint('preAction_after_sinks')
    // TODO: runMigrations()
    // TODO: profileCheckpoint('preAction_after_migrations')
    // TODO: void loadRemoteManagedSettings()
    // TODO: void loadPolicyLimits()
    // TODO: profileCheckpoint('preAction_after_remote_settings')
  })

  // ========================================
  // 定义主命令 (源码第 1311-1320 行)
  // ========================================
  program
    .name('cca')
    .description(
      `Claude Code - starts an interactive session by default, use -p/--print for non-interactive output`,
    )
    .argument('[prompt]', 'Your prompt', String)
    .helpOption('-h, --help', 'Display help for command')

  // ========================================
  // 核心选项 (源码第 1321-1400+ 行)
  // ========================================
  program
    .option(
      '-d, --debug [filter]',
      'Enable debug mode with optional category filtering',
      () => true,
    )
    .option(
      '--verbose',
      'Override verbose mode setting from config',
      () => true,
    )
    .option(
      '-p, --print',
      'Print response and exit (non-interactive mode)',
      false,
    )
    .option(
      '--model <model>',
      'Specify the model to use',
      String,
    )
    .option(
      '--resume <sessionId>',
      'Resume a previous session by ID',
      String,
    )
    .option(
      '-c, --continue',
      'Continue the most recent conversation',
      false,
    )
    .option(
      '--dangerously-skip-permissions',
      'Skip all permission prompts (use with caution)',
      false,
    )

  // ========================================
  // 更多选项 (addOption 形式)
  // ========================================
  program
    .addOption(
      new Option(
        '--output-format <format>',
        'Output format (only works with --print)',
      ).choices(['text', 'json', 'stream-json']),
    )
    .addOption(
      new Option(
        '--permission-mode <mode>',
        'Permission mode for tool execution',
      ).choices(['auto', 'accept', 'review']),
    )
    .option(
      '--config <path>',
      'Path to config file',
      String,
    )

  // ========================================
  // 默认 action (源码中使用 program.action())
  // 参考: 源码第 1706 行
  //
  // Commander.js 会在 program.parse() 解析完命令行参数后，
  // 如果没有匹配到子命令，就自动调用此回调函数。
  // - prompt: 命令行中传入的提示文本（第一个非选项参数）
  // - options: 解析后的选项对象，包含所有 --flag 参数
  // ========================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program.action(async (prompt: any, options: any) => {
    if (options.print) {
      // --print 模式：非交互模式，直接输出结果后退出
      await runPrintMode(prompt, options)
    } else {
      // 默认模式：交互模式，启动 REPL 会话
      await runInteractiveMode(prompt, options)
    }
  })

  // ========================================
  // 解析参数
  // ========================================
  program.parse()

  return program
}

/**
 * 非交互模式处理
 *
 * 参考 claude-code/src/print.ts
 */
async function runPrintMode(
  prompt: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  if (!prompt) {
    console.error('Error: prompt is required in print mode')
    process.exit(1)
  }

  // TODO: 实现实际的 LLM 调用
  console.log('Print mode (TODO: implement LLM call)')
  console.log(`Prompt: ${prompt}`)
  console.log('Options:', JSON.stringify(options, null, 2))
}

/**
 * 交互模式处理
 *
 * 参考 claude-code/src/main.tsx 中的 REPL 启动逻辑
 */
async function runInteractiveMode(
  prompt: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  // TODO: 实现实际的 REPL 循环
  console.log(`Claude Code v${MACRO.VERSION}`)
  console.log('')
  console.log('Interactive mode (TODO: implement REPL)')
  if (prompt) {
    console.log(`Initial prompt: ${prompt}`)
  }
  console.log('Options:', JSON.stringify(options, null, 2))
}