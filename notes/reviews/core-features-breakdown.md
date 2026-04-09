功能知识点梳理：
  1. 架构设计和核心流程(架构层面分析，不需要代码)
  2. 核心交互层
   - CLI 入口与参数解析
   - REPL 循环机制
   - 用户输入捕获与路由
   - 命令解析系统

  3. 查询引擎层
  这是核心中的核心，包含：
   - State 状态管理：消息历史、工具上下文、追踪数据
   - query() 生成器：代理循环主流程
   - queryLoop 主循环：while(true) 无限循环模式
   - 流式响应处理：AsyncGenerator + for await 遍历
   - tool_use 检测：content.type === 'tool_use' 判断循环条件
   - 中断信号处理：AbortController.signal.aborted 检测用户中断
   - 消息预处理：compact、snip、autocompact
   - 错误恢复机制：yieldMissingToolResultBlocks 为未完成工具生成错误结果

  4. 工具执行层
   - 工具注册与定义
   - 工具编排（并行/串行调度）
   - 工具执行器（单工具执行逻辑）
   - 结果收集与格式化

  5. API 客户端层
   - 多后端适配
   - 流式响应处理
   - 用量统计与计费
   - 错误重试机制

  6. 会话管理层
   - 会话持久化（localStorage/文件）
   - 历史记录管理
   - 配置系统
   - 全局状态同步

  7. TUI 渲染层
   - Ink 组件系统
   - 交互反馈（进度、状态）
   - 快捷键绑定
   - 样式与主题