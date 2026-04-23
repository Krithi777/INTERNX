'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { taskApi } from '@/lib/taskApi'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: '#8888a0', bg: 'var(--surface-2)' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'var(--blue-soft)' },
  review:      { label: 'In Review',   color: '#f59e0b', bg: 'var(--amber-soft)' },
  done:        { label: 'Done',        color: '#00c896', bg: 'var(--green-soft)' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#8888a0', bg: 'var(--surface-2)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'var(--amber-soft)' },
  high:   { label: 'High',   color: '#ef4444', bg: 'var(--red-soft)' },
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fff1f1' },
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [task,          setTask]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [prUrl,         setPrUrl]         = useState('')
  const [showPrInput,   setShowPrInput]   = useState(false)

  useEffect(() => {
    if (id) {
      localStorage.setItem("current_task_id", id)
      loadTask()
    }
  }, [id])

  // Auto-refresh every 5 seconds if task is in review
  useEffect(() => {
    if (task?.status !== 'review') return
    const interval = setInterval(() => { loadTask() }, 5000)
    return () => clearInterval(interval)
  }, [task?.status])

  const loadTask = async () => {
    try {
      const res = await taskApi.getTask(id)
      setTask(res.data)
      if (res.data.github_pr_url) setPrUrl(res.data.github_pr_url)
    } catch {
      toast.error('Task not found')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true)
    try {
      const res = await taskApi.updateStatus(task.id, newStatus)
      setTask(res.data)
      toast.success(`Task moved to ${STATUS_CONFIG[newStatus]?.label}`)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitPR = async () => {
    if (!prUrl.trim()) return
    setActionLoading(true)
    try {
      await taskApi.submitPR(task.id, prUrl.trim())
      await taskApi.updateStatus(task.id, 'review')

      // Trigger AI review automatically
      try {
        // Fetch the PR diff from GitHub
        const prUrlObj = new URL(prUrl.trim())
        const parts = prUrlObj.pathname.split('/')
        const owner = parts[1]
        const repo = parts[2]
        const prNumber = parts[4]

        const diffRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
          { headers: { Accept: 'application/vnd.github.v3.diff' } }
        )
        const diff = await diffRes.text()

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        await fetch(`${backendUrl}/api/mentor/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: task.id, pr_diff: diff }),
        })
        toast.success('PR submitted! AI review started 🤖')
      } catch {
        toast.success('PR submitted for review! 🚀')
      }

      const res = await taskApi.getTask(task.id)
      setTask(res.data)
      setShowPrInput(false)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to submit PR')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
      <div className="w-7 h-7 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!task) return null

  const status   = STATUS_CONFIG[task.status]   || STATUS_CONFIG.todo
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const dueDate   = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const resources = task.resources ? task.resources.split('\n').filter(Boolean) : []
  const hasScore  = task.score !== null && task.score !== undefined
  const passed    = hasScore && task.score >= 70

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Navbar */}
      <header className="sticky top-0 z-40 px-6 h-16 flex items-center gap-4"
        style={{ background: 'rgba(248,248,252,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" className="btn-ghost py-2 flex items-center gap-2"
          style={{ color: 'var(--ink-soft)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <div className="w-px h-4" style={{ background: 'var(--border)' }} />
        <span className="text-sm font-medium truncate" style={{ color: 'var(--ink-muted)' }}>{task.title}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-fade-up">

          {/* Main card */}
          <div className="card p-8 mb-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-display" style={{ color: 'var(--ink)' }}>{task.title}</h1>
              <span className="badge shrink-0" style={{ color: status.color, background: status.bg }}>
                <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ background: status.color }} />
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="badge" style={{ color: priority.color, background: priority.bg }}>{priority.label}</span>
              <span className="badge" style={{ color: 'var(--ink-soft)', background: 'var(--surface-2)' }}>
                {task.intern_role.charAt(0).toUpperCase() + task.intern_role.slice(1)}
              </span>
              {dueDate && (
                <span className="badge"
                  style={{ color: isOverdue ? 'var(--red)' : 'var(--ink-muted)', background: isOverdue ? 'var(--red-soft)' : 'var(--surface-2)' }}>
                  {isOverdue ? '⚠ Overdue · ' : '📅 '}Due: {dueDate}
                </span>
              )}
            </div>

            {task.description && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Description</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{task.description}</p>
              </>
            )}
          </div>

          {/* Resources */}
          {resources.length > 0 && (
            <div className="card p-6 mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-muted)' }}>Resources</h3>
              <div className="flex flex-col gap-2">
                {resources.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Score & Feedback card — shows for both done and in_progress with score */}
          {hasScore && (
            <div className="card p-6 mb-5" style={{
              border: `1.5px solid ${passed ? 'var(--green)' : '#ef4444'}`,
              background: passed ? 'var(--green-soft)' : '#fff5f5'
            }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: passed ? 'var(--green)' : '#ef4444' }}>
                  {passed ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h3 className="text-sm font-semibold font-display"
                  style={{ color: passed ? '#065f46' : '#991b1b' }}>
                  {passed ? 'AI Review Complete — Task Passed!' : 'AI Review Complete — Needs Improvement'}
                </h3>
                <span className="ml-auto text-2xl font-display font-bold"
                  style={{ color: passed ? 'var(--green)' : '#ef4444' }}>
                  {task.score}/100
                </span>
              </div>

              {!passed && (
                <div className="mb-3 p-3 rounded-lg" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                  <p className="text-sm font-semibold" style={{ color: '#991b1b', margin: 0 }}>
                    ⚠️ Score below 70 — Task not completed yet
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#b91c1c', margin: '4px 0 0 0' }}>
                    Review the feedback below, improve your code and resubmit using <code>internx pr</code>
                  </p>
                </div>
              )}

              {task.feedback && (
                <p className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: passed ? '#065f46' : '#991b1b' }}>
                  {task.feedback}
                </p>
              )}
            </div>
          )}

          {/* PR submitted — in review */}
          {task.github_pr_url && task.status === 'review' && (
            <div className="card p-6 mb-5" style={{ border: '1.5px solid #dbeafe', background: 'var(--blue-soft)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#1e40af' }}>PR Submitted</h3>
              <a href={task.github_pr_url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium break-all" style={{ color: 'var(--blue)' }}>
                {task.github_pr_url}
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="card p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-muted)' }}>Actions</h3>
            {/* Ask AI Mentor — always visible */}
<Link href={`/mentor?task_id=${task.id}`}
  className="w-full flex items-center justify-center gap-2 py-3 mb-3"
  style={{
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: 12, textDecoration: 'none', color: 'white',
    fontWeight: 600, fontSize: 14,
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
  }}>
  🤖 Ask AI Mentor
</Link>
            {task.status === 'todo' && (
              <button onClick={() => handleStatusChange('in_progress')} disabled={actionLoading}
                className="btn-primary w-full justify-center py-3.5">
                {actionLoading ? 'Starting...' : '▶ Start Task'}
              </button>
            )}

            {task.status === 'in_progress' && (
              showPrInput ? (
                <div className="flex flex-col gap-3">
                  <input type="url" value={prUrl} onChange={e => setPrUrl(e.target.value)}
                    placeholder="https://github.com/org/repo/pull/1"
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '14px', outline: 'none' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSubmitPR} disabled={actionLoading || !prUrl.trim()}
                      className="btn-primary flex-1 justify-center py-3">
                      {actionLoading ? 'Submitting...' : 'Submit PR for Review'}
                    </button>
                    <button onClick={() => setShowPrInput(false)} className="btn-ghost px-5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowPrInput(true)} disabled={actionLoading}
                  className="btn-primary w-full justify-center py-3.5"
                  style={{ background: 'var(--amber)', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}>
                  Submit for Review →
                </button>
              )
            )}

            {task.status === 'review' && (task.score === null || task.score === undefined) && (
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--amber-soft)', border: '1.5px solid #fde68a' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} />
                <span className="text-sm font-medium" style={{ color: '#92400e' }}>
                  Waiting for mentor review...
                </span>
              </div>
            )}

            {task.status === 'in_progress' && hasScore && !passed && (
              <div className="mt-3 p-3 rounded-xl text-center"
                style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                <p className="text-sm font-medium" style={{ color: '#991b1b' }}>
                  Fix the issues above and run <code style={{ background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>internx pr</code> again to resubmit
                </p>
              </div>
            )}

            {task.status === 'done' && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm font-semibold font-display" style={{ color: 'var(--green)' }}>Task complete!</p>
                <Link href="/dashboard"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--accent)' }}>
                  ← Back to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}