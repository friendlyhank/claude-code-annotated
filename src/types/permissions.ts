/**
 * Pure permission type definitions extracted to break import cycles.
 *
 * 对齐上游实现：按 claude-code/src/types/permissions.ts 原样复刻
 * 设计原因：
 * 1. 权限类型定义与实现分离，避免循环依赖
 * 2. 实现文件在 src/utils/permissions/，可从此处导入类型
 * 3. 仅包含类型定义和常量，无运行时依赖
 */

// ============================================================================
// Permission Modes
// ============================================================================

// 外部可用的权限模式
export const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits', // 接受所有编辑
  'bypassPermissions', // 跳过所有权限检查
  'default', // 默认权限
  'dontAsk', // 不询问用户
  'plan', // 计划模式
] as const

export type ExternalPermissionMode = (typeof EXTERNAL_PERMISSION_MODES)[number]


//内部权限模式（包含外部模式 + 内部专用模式）auto 自动模式 bubble 冒泡模式
export type InternalPermissionMode = ExternalPermissionMode | 'auto' | 'bubble'

// 权限模式类型别名
export type PermissionMode = InternalPermissionMode

/**
 * 运行时验证集合：用户可寻址的模式
 * 对齐上游实现：按源码 INTERNAL_PERMISSION_MODES 原样复刻
 * 
 * 边界处理：TRANSCRIPT_CLASSIFIER feature flag 当前未实现，仅包含 EXTERNAL_PERMISSION_MODES
 */
export const INTERNAL_PERMISSION_MODES = [
  ...EXTERNAL_PERMISSION_MODES,
  // TODO: 已阅读源码，但不在今日最小闭环内
  // TRANSCRIPT_CLASSIFIER feature flag 未实现时，不包含 'auto'
] as const satisfies readonly PermissionMode[]

export const PERMISSION_MODES = INTERNAL_PERMISSION_MODES

// ============================================================================
// Permission Behaviors
// ============================================================================

/**
 * 权限行为：允许/拒绝/询问
 * 对齐上游实现：按源码 PermissionBehavior 原样复刻
 */
export type PermissionBehavior = 'allow' | 'deny' | 'ask'

// ============================================================================
// Permission Rules
// ============================================================================

/**
 * 权限规则来源
 * 对齐上游实现：按源码 PermissionRuleSource 原样复刻
 * 
 * 包含所有 SettingSource 值 + 额外规则专用来源
 */
export type PermissionRuleSource =
  | 'userSettings' // 用户设置
  | 'projectSettings' // 项目设置
  | 'localSettings' // 本地设置
  | 'flagSettings' // 标志设置
  | 'policySettings' // 政策设置
  | 'cliArg' // CLI 参数
  | 'command' // 命令行参数
  | 'session' // 会话参数

/**
 * 权限规则值：指定工具和可选内容
 * 对齐上游实现：按源码 PermissionRuleValue 原样复刻
 */
export type PermissionRuleValue = {
  toolName: string // 工具名称
  ruleContent?: string // 规则内容
}

/**
 * 权限规则：包含来源、行为和值
 * 对齐上游实现：按源码 PermissionRule 原样复刻
 */
export type PermissionRule = {
  source: PermissionRuleSource  // 来源
  ruleBehavior: PermissionBehavior // 行为
  ruleValue: PermissionRuleValue // 值
}

// ============================================================================
// Permission Updates
// ============================================================================

/**
 * 权限更新持久化位置
 * 对齐上游实现：按源码 PermissionUpdateDestination 原样复刻
 */
export type PermissionUpdateDestination =
  | 'userSettings' // 用户设置
  | 'projectSettings' // 项目设置
  | 'localSettings' // 本地设置
  | 'session' // 会话参数
  | 'cliArg' // CLI 参数

/**
 * 权限配置更新操作
 * 对齐上游实现：按源码 PermissionUpdate 原样复刻
 * 
 * 支持的操作：
 * - addRules: 添加规则
 * - replaceRules: 替换规则
 * - removeRules: 移除规则
 * - setMode: 设置模式
 * - addDirectories: 添加目录
 * - removeDirectories: 移除目录
 */
export type PermissionUpdate =
  | {
      type: 'addRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'replaceRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'removeRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'setMode'
      destination: PermissionUpdateDestination
      mode: ExternalPermissionMode
    }
  | {
      type: 'addDirectories'
      destination: PermissionUpdateDestination
      directories: string[]
    }
  | {
      type: 'removeDirectories'
      destination: PermissionUpdateDestination
      directories: string[]
    }

/**
 * 额外工作目录权限来源
 * 对齐上游实现：按源码 WorkingDirectorySource 原样复刻
 * 
 * 注：当前与 PermissionRuleSource 相同，但保持语义分离以支持未来扩展
 */
export type WorkingDirectorySource = PermissionRuleSource

/**
 * 额外工作目录定义
 * 对齐上游实现：按源码 AdditionalWorkingDirectory 原样复刻
 */
export type AdditionalWorkingDirectory = {
  path: string // 目录路径
  source: WorkingDirectorySource // 来源
}

// ============================================================================
// Permission Decisions & Results
// ============================================================================

/**
 * 权限元数据中的最小命令形状
 * 对齐上游实现：按源码 PermissionCommandMetadata 原样复刻
 * 
 * 设计原因：故意只包含 Command 类型的子集，避免循环依赖
 */
export type PermissionCommandMetadata = {
  name: string
  description?: string
  // 允许额外属性以支持前向兼容
  [key: string]: unknown
}

/**
 * 附加到权限决策的元数据
 * 对齐上游实现：按源码 PermissionMetadata 原样复刻
 */
export type PermissionMetadata =
  | { command: PermissionCommandMetadata }
  | undefined

/**
 * 权限允许决策
 * 对齐上游实现：按源码 PermissionAllowDecision 原样复刻
 */
export type PermissionAllowDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> = {
  behavior: 'allow' // 行为
  updatedInput?: Input // 更新后的输入值
  userModified?: boolean // 是否用户修改
  decisionReason?: PermissionDecisionReason // 决策原因
  toolUseID?: string // 工具使用 ID
  acceptFeedback?: string // 接受反馈
  // TODO: 已阅读源码，但 ContentBlockParam 依赖 SDK，延后实现
  contentBlocks?: unknown[] // 可选内容块（如图片）
}

/**
 * 待处理分类器检查元数据
 * 对齐上游实现：按源码 PendingClassifierCheck 原样复刻
 * 
 * 用于启用非阻塞允许分类器评估
 */
export type PendingClassifierCheck = {
  command: string // 命令
  cwd: string // 工作目录
  descriptions: string[] // 描述列表
}

/**
 * 权限询问决策
 * 对齐上游实现：按源码 PermissionAskDecision 原样复刻
 */
export type PermissionAskDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> = {
  behavior: 'ask' // 行为
  message: string // 询问消息
  updatedInput?: Input // 更新后的输入值
  decisionReason?: PermissionDecisionReason // 决策原因
  suggestions?: PermissionUpdate[] // 建议列表
  blockedPath?: string // 被阻塞的路径（如果有）
  metadata?: PermissionMetadata // 元数据
  /**
   * 是否为 bash 安全检查触发的询问
   * 对齐上游实现：用于 bashCommandIsSafe_DEPRECATED 安全检查
   */
  isBashSecurityCheckForMisparsing?: boolean
  /**
   * 待处理的允许分类器检查
   * 对齐上游实现：分类器可能在用户响应前自动批准权限
   */
  pendingClassifierCheck?: PendingClassifierCheck // 待处理的允许分类器检查
  /**
   * 可选内容块（如图片）
   * 对齐上游实现：用户粘贴图片作为反馈时使用
   */
  contentBlocks?: unknown[]
}

/**
 * 权限拒绝决策
 * 对齐上游实现：按源码 PermissionDenyDecision 原样复刻
 */
export type PermissionDenyDecision = {
  behavior: 'deny' // 行为
  message: string // 拒绝消息
  decisionReason: PermissionDecisionReason // 决策原因
  toolUseID?: string // 工具使用 ID
}

/**
 * 权限决策：允许/询问/拒绝
 * 对齐上游实现：按源码 PermissionDecision 原样复刻
 */
export type PermissionDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> =
  | PermissionAllowDecision<Input> // 允许决策
  | PermissionAskDecision<Input> // 询问决策
  | PermissionDenyDecision // 拒绝决策

/**
 * 权限结果：包含额外 passthrough 选项
 * 对齐上游实现：按源码 PermissionResult 原样复刻
 */
export type PermissionResult<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> =
  | PermissionDecision<Input>
  | {
      behavior: 'passthrough' // 透传
      message: string // 消息内容
      decisionReason?: PermissionDecision<Input>['decisionReason'] // 决策原因
      suggestions?: PermissionUpdate[] // 建议列表
      blockedPath?: string // 被阻塞的路径（如果有）
      pendingClassifierCheck?: PendingClassifierCheck // 待处理的允许分类器检查
    }

/**
 * 权限决策原因
 * 对齐上游实现：按源码 PermissionDecisionReason 原样复刻
 * 
 * 解释为什么做出某个权限决策
 */
export type PermissionDecisionReason =
  | {
      type: 'rule' // 权限规则
      rule: PermissionRule // 权限规则
    }
  | {
      type: 'mode' // 权限模式
      mode: PermissionMode // 权限模式
    }
  | {
      type: 'subcommandResults' // 子命令结果
      reasons: Map<string, PermissionResult> // 子命令结果映射
    }
  | {
      type: 'permissionPromptTool' // 权限提示工具
      permissionPromptToolName: string // 权限提示工具名称
      toolResult: unknown // 工具结果
    }
  | {
      type: 'hook' // 钩子
      hookName: string // 钩子名称
      hookSource?: string // 钩子来源
      reason?: string // 原因
    }
  | {
      type: 'asyncAgent' // 异步代理
      reason: string // 原因
    }
  | {
      type: 'sandboxOverride' // 沙箱覆盖
      reason: 'excludedCommand' | 'dangerouslyDisableSandbox' // 原因
    }
  | {
      type: 'classifier' // 分类器
      classifier: string // 分类器名称
      reason: string // 原因
    }
  | {
      type: 'workingDir' // 工作目录
      reason: string // 原因
    }
  | {
      type: 'safetyCheck' // 安全检查
      reason: string // 原因
      /**
       * 是否可由分类器评估
       * 对齐上游实现：true 表示敏感文件路径，分类器可见上下文并决策
       * false 表示 Windows 路径绕过尝试和跨机器桥接消息
       */
      classifierApprovable: boolean
    }
  | {
      type: 'other'
      reason: string
    }

// ============================================================================
// Tool Permission Context
// ============================================================================

/**
 * 按来源分组的权限规则映射
 * 对齐上游实现：按源码 ToolPermissionRulesBySource 原样复刻
 */
export type ToolPermissionRulesBySource = {
  [T in PermissionRuleSource]?: string[] // 权限规则列表
}

/**
 * 工具权限检查所需上下文
 * 
 * 设计原因：
 * 1. 包含权限模式、规则、目录等完整信息
 * 2. 使用 ReadonlyMap 保证不可变性
 * 3. 简化的 DeepImmutable 近似，避免依赖 utils.ts
 */
export type ToolPermissionContext = {
  readonly mode: PermissionMode // 权限模式
  readonly additionalWorkingDirectories: ReadonlyMap<
    string,
    AdditionalWorkingDirectory
  > // 额外的工作目录映射
  readonly alwaysAllowRules: ToolPermissionRulesBySource // 总允许规则
  readonly alwaysDenyRules: ToolPermissionRulesBySource // 总拒绝规则
  readonly alwaysAskRules: ToolPermissionRulesBySource // 总询问规则
  readonly isBypassPermissionsModeAvailable: boolean // 是否可用绕过权限模式
  readonly strippedDangerousRules?: ToolPermissionRulesBySource // 被剥离的危险规则 // 脱离 UI
  /**
   * 为 true 时自动拒绝权限提示
   * 对齐上游实现：用于无法显示 UI 的后台代理
   */
  readonly shouldAvoidPermissionPrompts?: boolean
  /**
   * 为 true 时在显示权限对话框前等待自动检查
   * 对齐上游实现：用于协调工作器
   */
  readonly awaitAutomatedChecksBeforeDialog?: boolean
  /**
   * 进入 plan 模式前的权限模式
   * 对齐上游实现：退出时恢复
   */
  readonly prePlanMode?: PermissionMode
}
