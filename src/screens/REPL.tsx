/**
 * Claude Code Annotated - REPL 主界面
 *
 * 源码复刻参考: claude-code/src/screens/REPL.tsx
 *
 * 功能:
 * - 主交互界面
 * - 用户输入处理
 * - 消息显示
 * - 命令处理
 */

import React, { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Box, Text, useApp, useInput } from '../ink.js'

// ========================================
// 类型定义
// ========================================

export type Props = {
  // TODO: 添加 REPL 属性
  // debug?: boolean
  // commands?: Command[]
  // initialMessages?: Message[]
  // ...
}

// ========================================
// REPL 组件
// ========================================

/**
 * REPL 主界面组件
 *
 * 这是交互式会话的核心界面：
 * - 显示欢迎信息
 * - 接收用户输入
 * - 显示对话历史
 * - 处理命令
 */
export function REPL(_props: Props): ReactNode {
  const { exit } = useApp()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // 处理用户输入
  const handleSubmit = useCallback(() => {
    if (!input.trim() || isProcessing) return

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setIsProcessing(true)

    // TODO: 实现实际的 LLM 调用
    // 这里暂时返回一个占位响应
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `[TODO: Implement LLM response]\nYou said: "${input}"`,
        },
      ])
      setIsProcessing(false)
    }, 500)
  }, [input, isProcessing])

  // 键盘输入处理
  useInput(
    (char, key) => {
      if (key.return) {
        handleSubmit()
      } else if (key.backspace || key.delete) {
        setInput(prev => prev.slice(0, -1))
      } else if (key.escape) {
        // ESC 退出
        exit()
      } else if (char && !key.ctrl && !key.meta) {
        setInput(prev => prev + char)
      }
    },
    { isActive: !isProcessing },
  )

  // 显示欢迎信息
  useEffect(() => {
    console.log('')
    console.log('Welcome to Claude Code Annotated!')
    console.log('Type your message and press Enter to send.')
    console.log('Press ESC to exit.')
    console.log('')
  }, [])

  return (
    <Box flexDirection="column">
      {/* 消息列表 */}
      {messages.map((msg, idx) => (
        <Box key={idx} marginBottom={1}>
          <Text bold color={msg.role === 'user' ? 'cyan' : 'green'}>
            {msg.role === 'user' ? 'You: ' : 'Assistant: '}
          </Text>
          <Text>{msg.content}</Text>
        </Box>
      ))}

      {/* 处理中指示器 */}
      {isProcessing && (
        <Box marginBottom={1}>
          <Text dimColor>Processing...</Text>
        </Box>
      )}

      {/* 输入提示 */}
      <Box>
        <Text bold color="blue">
          &gt;{' '}
        </Text>
        <Text>{input}</Text>
        <Text dimColor>_</Text>
      </Box>

      {/* 快捷键提示 */}
      <Box marginTop={1}>
        <Text dimColor>
          [Enter: Send] [ESC: Exit]
        </Text>
      </Box>
    </Box>
  )
}
