'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

export default function MentorPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [task, setTask] = useState(null)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  const taskId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('task_id')
      || localStorage.getItem('current_task_id')
    : null

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('user_id')
    : null

  // Fetch task details to show context
  useEffect(() => {
    if (!taskId) return
    api.get(`/api/tasks/${taskId}`)
      .then(res => {
        setTask(res.data)
        setMessages([{
          role: 'assistant',
          content: `👋 Hi! I'm your AI Mentor for **${res.data.title}**.\n\nI know what this task requires. Ask me anything about it — how to approach it, what technologies to use, or how to fix issues in your code.`
        }])
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: '👋 Hi! I\'m your AI Mentor. Ask me anything about your task or code.'
        }])
      })
  }, [taskId])

  // WebSocket connection
  useEffect(() => {
    if (!taskId) return
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const wsUrl = backendUrl.replace('http', 'ws') + `/api/mentor/chat/${taskId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)

    ws.onmessage = (event) => {
      const token = event.data
      if (token === '[DONE]') { setIsTyping(false); return }
      if (token.startsWith('[ERROR]')) {
        setIsTyping(false)
        setMessages(prev => [...prev, { role: 'error', content: token.replace('[ERROR] ', '') }])
        return
      }
      setIsTyping(true)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last?.streaming)
          return [...prev.slice(0, -1), { ...last, content: last.content + token }]
        return [...prev, { role: 'assistant', content: token, streaming: true }]
      })
    }

    return () => ws.close()
  }, [taskId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (!userId) { alert('Please login first'); return }
    setMessages(prev => [...prev, { role: 'user', content: input }])
    wsRef.current.send(JSON.stringify({ message: input, user_id: userId }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!taskId) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#e2e8f0', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🤖</div>
      <p style={{ fontSize: 18, fontWeight: 600 }}>No task selected</p>
      <p style={{ color: '#64748b' }}>Please open a task first and click "Ask AI Mentor"</p>
      <Link href="/dashboard" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>← Back to Dashboard</Link>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a' }}>
        <Link href={`/internship/tasks/${taskId}`} style={{ color: '#64748b', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to Task
        </Link>
        <div style={{ width: 1, height: 16, background: '#1e293b' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 16 }}>🤖 AI Mentor</span>
        {isTyping && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>Thinking...</span>}
      </div>

      {/* Task context banner */}
      {task && (
        <div style={{ padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Task</span>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{task.title}</p>
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: task.priority === 'high' ? '#7f1d1d' : '#1e3a5f',
                color: task.priority === 'high' ? '#fca5a5' : '#93c5fd',
              }}>
                {task.priority?.toUpperCase()}
              </span>
            </div>
          </div>
          {task.description && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              {task.description.length > 150 ? task.description.slice(0, 150) + '...' : task.description}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role !== 'user' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 4 }}>
                🤖
              </div>
            )}
            <div style={{
              maxWidth: '72%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? '#6366f1' : msg.role === 'error' ? '#7f1d1d' : '#1e293b',
              color: '#f1f5f9', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
              {msg.streaming && isTyping && (
                <span style={{ display: 'inline-block', width: 6, height: 14, background: '#94a3b8', marginLeft: 3, animation: 'blink 1s infinite', borderRadius: 2 }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestion chips */}
      {messages.length <= 1 && task && (
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            'How should I approach this task?',
            'What technologies should I use?',
            'Show me the project structure',
            'What are common mistakes to avoid?',
          ].map(suggestion => (
            <button key={suggestion} onClick={() => { setInput(suggestion); }}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#a5b4fc'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b', display: 'flex', gap: 10, background: '#0f172a' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'Ask about your task... (Enter to send, Shift+Enter for new line)' : 'Connecting to mentor...'}
          disabled={!isConnected}
          rows={2}
          style={{
            flex: 1, background: '#1e293b', border: '1px solid #334155',
            borderRadius: 10, color: '#f1f5f9', padding: '10px 14px',
            fontSize: 14, resize: 'none', outline: 'none',
            opacity: isConnected ? 1 : 0.5, lineHeight: 1.5,
          }}
        />
        <button onClick={sendMessage} disabled={!isConnected || !input.trim()}
          style={{
            padding: '0 20px', background: '#6366f1', color: 'white',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 600, fontSize: 14, transition: 'opacity 0.15s',
            opacity: (!isConnected || !input.trim()) ? 0.4 : 1,
          }}>
          Send
        </button>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}