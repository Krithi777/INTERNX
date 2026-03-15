// frontend/app/mentor/page.jsx
'use client';
import { useEffect, useState, useRef } from 'react';

export default function MentorPage() {
  const [taskId,      setTaskId]      = useState(null);
  const [userId,      setUserId]      = useState(null);
  const [ready,       setReady]       = useState(false);   // true once we've read localStorage
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping,    setIsTyping]    = useState(false);
  const wsRef    = useRef(null);
  const bottomRef = useRef(null);

  // ── Read task_id and user_id client-side only (avoids SSR mismatch) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('task_id') || localStorage.getItem('current_task_id') || null;
    const uid = localStorage.getItem('user_id')
      || localStorage.getItem('userId')
      || sessionStorage.getItem('user_id')
      || params.get('user_id')
      || null;
    setTaskId(tid);
    setUserId(uid);
    setReady(true);

    if (tid) {
      setMessages([
        { role: 'assistant', content: `👋 Hi! I'm your AI Mentor. Ask me anything about your task or code.` }
      ]);
    }
  }, []);

  // ── Open WebSocket once taskId is known ──
  useEffect(() => {
    if (!taskId) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const wsUrl = backendUrl.replace(/^http/, 'ws') + `/api/mentor/chat/${taskId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen  = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const token = event.data;
      if (token === '[DONE]')          { setIsTyping(false); return; }
      if (token.startsWith('[ERROR]')) {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'error', content: token }]);
        return;
      }
      setIsTyping(true);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last?.streaming)
          return [...prev.slice(0, -1), { ...last, content: last.content + token }];
        return [...prev, { role: 'assistant', content: token, streaming: true }];
      });
    };

    return () => ws.close();
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!userId) { alert('User not logged in. Please login first.'); return; }
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    wsRef.current.send(JSON.stringify({ message: input, user_id: userId }));
    setInput('');
  };

  // ── Loading state while localStorage is being read ──
  if (!ready) {
    return (
      <div style={{ color: '#e2e8f0', padding: 40, background: '#0f172a', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b' }}>Loading mentor...</span>
      </div>
    );
  }

  // ── No task selected ──
  if (!taskId) {
    return (
      <div style={{ color: '#e2e8f0', padding: 40, background: '#0f172a', height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🤖</span>
        <p style={{ fontSize: 18, fontWeight: 600 }}>No task selected</p>
        <p style={{ color: '#64748b', maxWidth: 360 }}>
          Open a task from your dashboard and click <strong>"Ask Mentor"</strong> to start a session.
        </p>
        <a href="/dashboard"
          style={{ marginTop: 8, padding: '10px 24px', background: '#3b82f6', color: 'white',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0f172a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%',
          background: isConnected ? '#22c55e' : '#ef4444' }} />
        <span style={{ fontWeight: 600, fontSize: 18 }}>🤖 AI Mentor</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>Task: {taskId}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: 12,
              background: msg.role === 'user' ? '#3b82f6'
                : msg.role === 'error' ? '#7f1d1d' : '#1e293b',
              color: '#f1f5f9', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {msg.content}
              {msg.streaming && isTyping && (
                <span style={{ display: 'inline-block', width: 8, height: 14,
                  background: '#94a3b8', marginLeft: 4, animation: 'blink 1s infinite' }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1e293b',
        display: 'flex', gap: 12, background: '#0f172a' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={isConnected ? 'Ask your mentor... (Enter to send)' : 'Connecting to mentor...'}
          disabled={!isConnected}
          rows={2}
          style={{ flex: 1, background: '#1e293b', border: '1px solid #334155',
            borderRadius: 8, color: '#f1f5f9', padding: '10px 14px',
            fontSize: 15, resize: 'none', outline: 'none',
            opacity: isConnected ? 1 : 0.5 }}
        />
        <button onClick={sendMessage} disabled={!isConnected || !input.trim()}
          style={{ padding: '0 24px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
            opacity: (!isConnected || !input.trim()) ? 0.5 : 1 }}>
          Send
        </button>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}