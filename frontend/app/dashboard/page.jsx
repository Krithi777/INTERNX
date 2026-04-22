'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { taskApi } from '@/lib/taskApi'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import api from '@/lib/api'

const ROLE_CONFIG = {
  frontend:  { label: 'Frontend',   color: '#5b4fff', bg: '#ede9ff',  icon: '⚡' },
  backend:   { label: 'Backend',    color: '#3b82f6', bg: '#eff6ff',  icon: '⚙️' },
  fullstack: { label: 'Full Stack', color: '#f59e0b', bg: '#fffbeb',  icon: '🔥' },
  devops:    { label: 'DevOps',     color: '#00c896', bg: '#e0fff7',  icon: '🚀' },
  design:    { label: 'Design',     color: '#ec4899', bg: '#fdf2f8',  icon: '✦'  },
  tester:    { label: 'QA/Tester',  color: '#8b5cf6', bg: '#f5f3ff',  icon: '🧪' },
}

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
}

function TaskCard({ task }) {
  const router   = useRouter()
  const status   = STATUS_CONFIG[task.status]   || STATUS_CONFIG.todo
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      onClick={() => router.push(`/internship/tasks/${task.id}`)}
      className="p-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{ background: 'white', border: '1.5px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,79,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold leading-snug line-clamp-2 font-display" style={{ color: 'var(--ink)' }}>
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
          {task.intern_role && (() => {
            const rc = ROLE_CONFIG[task.intern_role]
            return rc ? (
              <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ color: rc.color, background: rc.bg }}>
                {rc.icon} {rc.label}
              </span>
            ) : null
          })()}
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

function KanbanColumn({ title, tasks, dot }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
          <span className="text-sm font-semibold font-display" style={{ color: 'var(--ink)' }}>{title}</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
          {tasks.length}
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

// Mini team widget for the sidebar
function TeamWidget({ projectId }) {
  const [teamData, setTeamData] = useState(null)

  useEffect(() => {
    if (!projectId) return
    api.get(`/api/projects/${projectId}/team`)
      .then(r => setTeamData(r.data))
      .catch(() => {})
  }, [projectId])

  if (!teamData) return null

  const isActive = teamData.project_status === 'active'
  const total = (teamData.slots || []).reduce((a, s) => a + s.total_slots, 0)
  const filled = teamData.team?.length || 0

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
          {isActive ? '✅ My Team' : '⏳ Team Forming'}
        </h3>
        <Link href="/internship/team" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          View all →
        </Link>
      </div>

      {/* Member avatars */}
      <div className="flex -space-x-1.5 mb-3">
        {(teamData.team || []).map(m => {
          const rc = ROLE_CONFIG[m.intern_role] || { color: '#5b4fff' }
          return (
            <div key={m.user_id}
              title={`${m.name} · ${m.intern_role}`}
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: rc.color, borderColor: 'white' }}>
              {m.name?.[0]?.toUpperCase() || '?'}
            </div>
          )
        })}
        {total - filled > 0 && (
          <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold animate-pulse"
            style={{ background: 'var(--border)', borderColor: 'white', color: 'var(--ink-muted)' }}>
            +{total - filled}
          </div>
        )}
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>{filled}/{total} members joined</div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${total > 0 ? (filled / total) * 100 : 0}%`, background: isActive ? 'var(--green)' : 'var(--amber)' }} />
      </div>

      {teamData.internx_repo && (
        <a href={teamData.internx_repo} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: '#24292e', color: 'white' }}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
          Team Repo ↗
        </a>
      )}
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
        const res = await api.get('/api/auth/me')
        const me = res.data

        // No role yet → send to onboarding (which will also assign a project)
        if (!me.intern_role) {
          router.push('/auth/onboarding')
          return
        }

        // No project yet → send to project page (lobby will handle joining)
        if (!me.project_id) {
          router.push('/internship/project')
          return
        }

        // Load the assigned project
        const projectRes = await api.get(`/api/projects/${me.project_id}`)
        setProject(projectRes.data)
      } catch (err) {
        console.error('Failed to load user/project:', err)
      }

      await loadData()
    }, 100)
    return () => clearTimeout(timer)
  }, [user])

  const loadData = async () => {
    try {
      const [tasksRes, sprintRes] = await Promise.all([
        taskApi.getMyTasks(),
        taskApi.getActiveSprint().catch(() => ({ data: [] })),
      ])
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
      setSprint(Array.isArray(sprintRes.data) ? (sprintRes.data[0] || null) : null)
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total:     tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    review:    tasks.filter(t => t.status === 'review').length,
    overdue:   tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  }
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const userRc = ROLE_CONFIG[user?.intern_role]
  const columns = [
    { key: 'todo',        title: 'To Do',       dot: '#8888a0' },
    { key: 'in_progress', title: 'In Progress',  dot: '#3b82f6' },
    { key: 'review',      title: 'In Review',    dot: '#f59e0b' },
    { key: 'done',        title: 'Done',         dot: '#00c896' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Loading your workspace...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Navbar */}
      <header className="sticky top-0 z-40 px-6 h-16 flex items-center justify-between"
        style={{ background: 'rgba(248,248,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm" style={{ background: 'var(--accent)' }}>X</div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>InternX</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Dashboard',  href: '/dashboard',          active: true  },
            { label: 'Tasks',      href: '/internship/tasks',   active: false },
            { label: 'My Project', href: '/internship/project', active: false },
            { label: 'My Team',    href: '/internship/team',    active: false },
            { label: 'AI Mentor',  href: '/mentor',             active: false },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ color: item.active ? 'var(--accent)' : 'var(--ink-soft)', background: item.active ? 'var(--accent-soft)' : 'transparent' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt={user.name || 'User'} width={32} height={32} className="rounded-full" style={{ border: '2px solid var(--border)' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--ink)' }}>{user?.name}</span>
          </div>
          <button onClick={() => { clearAuth(); router.push('/auth/login') }} className="btn-ghost text-sm py-2">Logout</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Project banner — only shown when user has an assigned project */}
        {project && (
          <Link href="/internship/project"
            className="flex items-center justify-between p-4 rounded-2xl mb-6 animate-fade-up transition-all hover:scale-[1.01]"
            style={{ background: `linear-gradient(135deg, ${project.company_color}12, ${project.company_color}06)`, border: `1px solid ${project.company_color}30` }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{project.company_emoji}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: project.company_color }}>
                  Currently interning at
                  {project.project_status === 'active' && <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: '#dcfce7', color: '#16a34a' }}>TEAM ACTIVE</span>}
                  {project.project_status === 'open' && <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>FORMING</span>}
                </p>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
                  {project.company_name} — {project.project_title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: project.company_color, color: 'white' }}>
              View Project →
            </div>
          </Link>
        )}

        {/* No project yet — nudge to project page */}
        {!project && (
          <div className="flex items-center justify-between p-4 rounded-2xl mb-6 animate-fade-up"
            style={{ background: 'var(--accent-soft)', border: '1px solid rgba(91,79,255,0.2)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>No project assigned yet</p>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>Join a project to get started</p>
              </div>
            </div>
            <Link href="/internship/project"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Find a Project →
            </Link>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-display mb-1" style={{ color: 'var(--ink)' }}>
                Good to see you, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <div className="flex items-center gap-2">
                {userRc && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: userRc.bg, color: userRc.color }}>
                    {userRc.icon} {userRc.label} Intern
                  </span>
                )}
                {sprint && <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>· {sprint.title}</span>}
              </div>
            </div>
            <Link href="/internship/team" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
              👥 My Team
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main content — 3 cols */}
          <div className="xl:col-span-3 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up stagger-1">
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
              <div className="card p-5 animate-fade-up stagger-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Sprint — {sprint.title}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)' }} />
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

            {/* Kanban */}
            <div className="animate-fade-up stagger-3">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-display" style={{ color: 'var(--ink)' }}>
                  {sprint?.title || 'My Tasks'}
                </h2>
                <Link href="/internship/tasks" className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  View all
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>

              {tasks.length === 0 ? (
                <div className="card p-16 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="font-display font-bold mb-1" style={{ color: 'var(--ink)' }}>No tasks yet</h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>
                    {!project
                      ? 'Join a project first to get tasks assigned to you.'
                      : project?.project_status === 'open'
                        ? 'Tasks will appear once your full team is assembled.'
                        : 'Head to your project page to get started.'}
                  </p>
                  <Link href="/internship/project" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
                    🏢 {project ? 'View My Project' : 'Find a Project'}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {columns.map(col => (
                    <KanbanColumn
                      key={col.key}
                      title={col.title}
                      tasks={tasks.filter(t => t.status === col.key)}
                      dot={col.dot}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — 1 col */}
          <div className="space-y-4 animate-fade-up stagger-2">
            {/* Team widget */}
            {project?.id && <TeamWidget projectId={project.id} />}

            {/* Quick links */}
            <div className="card p-5">
              <h3 className="font-display font-bold text-sm mb-3" style={{ color: 'var(--ink)' }}>Quick Links</h3>
              <div className="space-y-2">
                {[
                  { href: '/internship/project', icon: '🏢', label: 'My Project' },
                  { href: '/internship/team',    icon: '👥', label: 'My Team' },
                  { href: '/internship/tasks',   icon: '✅', label: 'All Tasks' },
                  { href: '/mentor',             icon: '🤖', label: 'AI Mentor' },
                ].map(({ href, icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                    <span>{icon}</span>
                    <span>{label}</span>
                    <svg className="w-3.5 h-3.5 ml-auto opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Your role card */}
            {userRc && (
              <div className="card p-5" style={{ background: `linear-gradient(135deg, ${userRc.bg}, white)`, border: `1.5px solid ${userRc.color}30` }}>
                <div className="text-2xl mb-2">{userRc.icon}</div>
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: userRc.color }}>Your Role</p>
                <p className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>{userRc.label} Intern</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                  Assigned to {userRc.label.toLowerCase()} tasks in your project
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}