'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { taskApi } from '@/lib/taskApi'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'var(--ink-muted)', bg: 'var(--surface-2)',  dot: '#8888a0' },
  in_progress: { label: 'In Progress', color: '#3b82f6',          bg: 'var(--blue-soft)',  dot: '#3b82f6' },
  review:      { label: 'In Review',   color: 'var(--amber)',     bg: 'var(--amber-soft)', dot: '#f59e0b' },
  done:        { label: 'Done',        color: 'var(--green)',     bg: 'var(--green-soft)', dot: '#00c896' },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'var(--ink-muted)', bg: 'var(--surface-2)' },
  medium: { label: 'Medium', color: 'var(--amber)',     bg: 'var(--amber-soft)' },
  high:   { label: 'High',   color: 'var(--red)',       bg: 'var(--red-soft)' },
  urgent: { label: 'Urgent', color: '#dc2626',          bg: '#fff1f1' },
}

function TaskCard({ task }) {
  const router   = useRouter()
  const status   = STATUS_CONFIG[task.status]   || STATUS_CONFIG.todo
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const dueDate   = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div onClick={() => router.push(`/internship/tasks/${task.id}`)}
      className="p-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{ background: 'white', border: '1.5px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow   = '0 4px 16px rgba(91,79,255,0.1)'
        e.currentTarget.style.transform   = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow   = '0 1px 3px rgba(0,0,0,0.04)'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: 'var(--ink)', fontFamily: 'Syne, sans-serif' }}>
          {task.title}
        </h4>
        <span className="badge shrink-0 text-xs" style={{ color: status.color, background: status.bg }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: status.dot }} />
          {status.label}
        </span>
      </div>
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--ink-muted)' }}>{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge" style={{ color: priority.color, background: priority.bg, fontSize: '10px' }}>
            {priority.label}
          </span>
          <span className="text-xs capitalize px-2 py-0.5 rounded-lg"
            style={{ color: 'var(--ink-muted)', background: 'var(--surface-2)' }}>
            {task.intern_role}
          </span>
        </div>
        {dueDate && (
          <span className="text-xs font-medium" style={{ color: isOverdue ? 'var(--red)' : 'var(--ink-muted)' }}>
            {isOverdue ? '⚠ ' : ''}{dueDate}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ title, tasks, count, dot }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
          <span className="text-sm font-semibold font-display" style={{ color: 'var(--ink)' }}>{title}</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[120px] p-3 rounded-2xl"
        style={{ background: 'var(--surface-2)', border: '1.5px dashed var(--border)' }}>
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-xs" style={{ color: 'var(--border-strong)' }}>No tasks</span>
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const [tasks,   setTasks]   = useState([])
  const [sprint,  setSprint]  = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!user) { router.push('/auth/login'); return }
      try {
        const api = (await import('@/lib/api')).default
        const res = await api.get('/api/auth/me')

        let projectId = res.data.project_id

        // If user has no project yet, auto-assign one instead of redirecting away
        if (!projectId) {
          if (!res.data.intern_role) {
            // Onboarding not complete — project page will handle it
            router.push('/internship/project')
            return
          }
          try {
            const assignRes = await api.post('/api/projects/assign')
            projectId = assignRes.data?.id
          } catch (err) {
            console.error('Failed to auto-assign project', err)
            router.push('/internship/project')
            return
          }
        }

        // Load project info for the banner
        if (projectId) {
          const projectRes = await api.get(`/api/projects/${projectId}`)
          setProject(projectRes.data)
        }
      } catch (err) {
        console.error('Failed to load profile', err)
      }
      await loadData()
    }, 100)
    return () => clearTimeout(timer)
  }, [user])

  const loadData = async () => {
    try {
      // Both calls match the actual backend routes in tasks.py
      const [tasksRes, sprintRes] = await Promise.all([
        taskApi.getMyTasks(),
        taskApi.getActiveSprint().catch(() => ({ data: [] })),
      ])
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
      // Backend returns an array — take the first item
      const sprintData = Array.isArray(sprintRes.data) ? sprintRes.data[0] : null
      setSprint(sprintData || null)
    } catch (err) {
      console.error('Failed to load data', err)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { clearAuth(); router.push('/auth/login') }

  const stats = {
    total:     tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    review:    tasks.filter(t => t.status === 'review').length,
    overdue:   tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  }
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const columns = [
    { key: 'todo',        title: 'To Do',      dot: '#8888a0' },
    { key: 'in_progress', title: 'In Progress', dot: '#3b82f6' },
    { key: 'review',      title: 'In Review',   dot: '#f59e0b' },
    { key: 'done',        title: 'Done',        dot: '#00c896' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Loading your workspace...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>

      {/* Navbar */}
      <header className="sticky top-0 z-40 px-6 h-16 flex items-center justify-between"
        style={{ background: 'rgba(248,248,252,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm"
            style={{ background: 'var(--accent)' }}>X</div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>InternX</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Dashboard', href: '/dashboard',        active: true  },
            { label: 'Tasks',     href: '/internship/tasks', active: false },
            { label: 'AI Mentor', href: '/mentor',           active: false },
            { label: 'Portfolio', href: '/portfolio',        active: false },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                color:      item.active ? 'var(--accent)'      : 'var(--ink-soft)',
                background: item.active ? 'var(--accent-soft)' : 'transparent',
              }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* Back to project page */}
          <Link href="/internship/project"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(91,79,255,0.2)' }}>
            🏢 My Project
          </Link>
          <div className="flex items-center gap-2.5">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt={user.name || 'User'} width={32} height={32}
                className="rounded-full" style={{ border: '2px solid var(--border)' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'var(--accent)' }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--ink)' }}>{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-sm py-2">Logout</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Project banner */}
        {project && (
          <Link href="/internship/project"
            className="flex items-center justify-between p-4 rounded-2xl mb-6 animate-fade-up transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${project.company_color}12, ${project.company_color}06)`,
              border: `1px solid ${project.company_color}30`,
            }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{project.company_emoji}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: project.company_color }}>Currently interning at</p>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
                  {project.company_name} — {project.project_title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: project.company_color, color: 'white' }}>
              View Project →
            </div>
          </Link>
        )}

        {/* Welcome */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-display mb-1" style={{ color: 'var(--ink)' }}>
            Good to see you, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {user?.intern_role
              ? `${user.intern_role.charAt(0).toUpperCase() + user.intern_role.slice(1)} Intern`
              : 'Intern'}
            {sprint ? ` · ${sprint.title}` : ' · No active sprint'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up stagger-1">
          {[
            { label: 'Total tasks', value: stats.total,     color: 'var(--ink)'   },
            { label: 'Completed',   value: stats.completed, color: 'var(--green)' },
            { label: 'In review',   value: stats.review,    color: 'var(--amber)' },
            { label: 'Overdue',     value: stats.overdue,   color: 'var(--red)'   },
          ].map(stat => (
            <div key={stat.label} className="card p-5">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>{stat.label}</div>
              <div className="text-3xl font-display font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Sprint progress */}
        {sprint && (
          <div className="card p-5 mb-8 animate-fade-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Sprint progress — {sprint.title}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)',
              }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {new Date(sprint.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {new Date(sprint.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        )}

        {/* Kanban board */}
        <div className="animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-display" style={{ color: 'var(--ink)' }}>
              {sprint?.title || 'My Tasks'}
            </h2>
            <Link href="/internship/tasks"
              className="text-sm font-medium flex items-center gap-1.5"
              style={{ color: 'var(--accent)' }}>
              View all
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-display font-bold mb-1" style={{ color: 'var(--ink)' }}>No tasks yet</h3>
              <p className="text-sm mb-1" style={{ color: 'var(--ink-muted)' }}>
                Make sure tasks in the database have your user ID in <code className="text-xs bg-gray-100 px-1 rounded">assigned_to</code> and the correct <code className="text-xs bg-gray-100 px-1 rounded">project_id</code>.
              </p>
              <Link href="/internship/project"
                className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2 mt-4">
                🏢 View My Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {columns.map(col => (
                <KanbanColumn
                  key={col.key}
                  title={col.title}
                  tasks={tasks.filter(t => t.status === col.key)}
                  count={tasks.filter(t => t.status === col.key).length}
                  dot={col.dot}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}