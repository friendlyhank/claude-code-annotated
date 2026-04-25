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
import { setIsInteractive } from './bootstrap/state.js'
import { createRoot, type Root } from './ink.js'
import { getRenderContext, renderAndRun } from './interactiveHelpers.js'
import { launchRepl } from './replLauncher.js'

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
// 状态管理已移至 bootstrap/state.ts
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
 */
async function run(): Promise<CommanderCommand> {
  // TODO: profileCheckpoint('run_function_start')

  // 创建帮助配置
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

  // preAction hook - 在命令执行前初始化
  program.hook('preAction', async () => {
    // TODO: profileCheckpoint('preAction_start')
    // TODO: await Promise.all([ensureMdmSettingsLoaded(), ensureKeychainPrefetchCompleted()])
    // TODO: profileCheckpoint('preAction_after_mdm')
    // TODO: await init()
    // TODO: profileCheckpoint('preAction_after_init')
    // TODO: process.title = 'claude'

    // Attach logging sinks so subcommand handlers can use logEvent/logError.
    const { initSinks } = await import('./utils/sinks.js')
    // 初始化日志记录器
    initSinks()

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
    .name('claude')
    .description(
      `Claude Code - starts an interactive session by default, use -p/--print for non-interactive output`,
    )
    .argument('[prompt]', 'Your prompt', String)
    .helpOption('-h, --help', 'Display help for command')
    .option(
      '-d, --debug [filter]',
      'Enable debug mode with optional category filtering',
      () => true,
    )
    .option(
      '--debug-file <path>',
      'Write debug logs to a specific file path (implicitly enables debug mode)',
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
    .action(async (prompt, options) => {
      // TODO: profileCheckpoint('action_handler_start')

      // TODO: --bare 模式处理 (源码第 1712-1718 行)
      // TODO: prompt === 'code' 处理 (源码第 1721-1729 行)
      // TODO: 单词 prompt 日志 (源码第 1732-1740 行)
      // TODO: Assistant mode 处理 (源码第 1758-1820 行)
      // TODO: 解构 options (源码第 1849-1870 行)
      // TODO: 处理 prefill (源码第 1872-1874 行)
      // TODO: agent CLI 处理 (源码第 1876-1880 行)
      // ... 大量前置逻辑 ...

      // Ink root is only needed for interactive sessions (源码第 3221 行)
      let root!: Root
      let getFpsMetrics!: () => unknown
      let stats!: unknown

      // TODO: isNonInteractiveSession 分支 (源码第 3624-3650 行)
      // TODO: showSetupScreens() (源码第 ~4100 行)

      if (true) {
        // TODO: 替换为 if (!isNonInteractiveSession)
        const ctx = getRenderContext(false)
        getFpsMetrics = () => undefined // TODO: ctx.getFpsMetrics
        stats = undefined // TODO: ctx.stats

        root = await createRoot(ctx.renderOptions)

        // TODO: logEvent('tengu_timer', ...)
        // TODO: showSetupScreens()
      }

      // 启动 REPL (源码第 5180 行)
      await launchRepl(
        root,
        { getFpsMetrics, stats, initialState: {} },
        {
          debug: Boolean(options.debug),
        },
        renderAndRun,
      )
    })

  // ========================================
  // 解析参数
  // ========================================
  program.parse()

  return program
}
