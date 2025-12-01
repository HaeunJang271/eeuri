'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// userId 생성/불러오기
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return ''
  
  let userId = localStorage.getItem('eeuri_userId')
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('eeuri_userId', userId)
  }
  return userId
}

export default function ChatPage() {
  const [userId] = useState(() => getOrCreateUserId())
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕! 나는 이으리야. 네 길이 끊기지 않도록 옆에서 이어주는 존재야. 오늘 어떤 이야기를 나누고 싶어?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 페이지를 떠날 때 대화 요약 저장
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // 사용자 메시지가 2개 이상일 때만 요약 (실제 대화가 있었을 때)
      const userMessages = messages.filter(m => m.role === 'user')
      if (userMessages.length >= 2) {
        try {
          await fetch('/api/memory/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, messages }),
          })
        } catch (error) {
          console.error('Failed to save memory:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 컴포넌트 언마운트 시에도 저장
      handleBeforeUnload()
    }
  }, [userId, messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/eeuri', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error('응답을 받아오는데 실패했어요')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송해요, 잠시 문제가 생긴 것 같아요. 다시 시도해볼까요?'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <div className={styles.headerContent}>
          <img
            src="/imgs/logo.png"
            alt="이으리 로고"
            className={styles.logo}
          />
          <h1 className={styles.title}>이으리와 대화하기</h1>
        </div>
        <div className={styles.helpNotice}>
          위급한 상황일 땐 <strong>1588-1388</strong> (청소년전화 1388) 또는 지역 상담전화에 연락해요
        </div>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typing}>이으리가 생각 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className={styles.input}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={styles.sendButton}
        >
          전송
        </button>
      </form>
    </div>
  )
}

