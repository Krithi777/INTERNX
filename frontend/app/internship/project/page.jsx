'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import api from '@/lib/api'

function FolderTree({ name, node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const isFile = node === null
  const isArray = Array.isArray(node)
  const indent = depth * 16

  if (isFile) {
    return (
      <div className="flex items-center gap-2 py-0.5 group" style={{ paddingLeft: indent + 4 }}>
        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ink-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>{name}</span>
      </div>
    )
  }

  if (isArray) {
    return (
      <div>
        {node.map(file => (
          <FolderTree key={file} name={file} node={null} depth={depth} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 py-0.5 w-full hover:opacity-80 transition-opacity"
        style={{ paddingLeft: indent }}>
        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{open ? '▾' : '▸'}</span>
        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--ink)' }}>{name}</span>
      </button>
      {open && (
        <div>
          {Object.entries(node).map(([k, v]) => (
            <FolderTree key={k} name={k} node={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function SetupGuideModal({ onClose }) {
  const steps = [
    { number: '01', title: 'Add GitHub Repo URL', description: 'Go to the Overview tab on your project page. Find the "GitHub Repository" card and paste your GitHub repo URL — e.g. https://github.com/your-org/your-repo. Click Save.', code: null, tip: 'This is saved per user — each intern has their own repo URL for the same project.' },
    { number: '02', title: 'Create a GitHub Token', description: 'Go to github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Select the "repo" scope and generate it. Copy the token — you will need it in the next step.', code: null, tip: 'The token starts with ghp_. Save it somewhere safe — GitHub only shows it once.' },
    { number: '03', title: 'Install Node.js', description: "Download and install Node.js from nodejs.org if you haven't already. This is required to run the InternX CLI.", code: null, tip: 'Check if already installed: open a terminal and type node --version' },
    { number: '04', title: 'Install InternX CLI', description: 'Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Mac) and run:', code: 'npm install -g internx-cli', tip: 'This installs the CLI globally and registers the internx:// protocol on your OS. Only needed once.' },
    { number: '05', title: 'Save your GitHub Token', description: 'Paste the token you created in step 02 into this command and run it in your terminal:', code: 'internx login --token ghp_your_token_here', tip: 'Your token is saved locally on your machine. InternX uses it to clone repos on your behalf.' },
    { number: '06', title: 'Click "Connect VS Code"', description: 'Come back here and click the Connect VS Code button. Your browser will ask permission to open InternX — click Open or Allow.', code: null, tip: 'Watch for a small browser popup near the address bar. It may appear briefly.' },
    { number: '07', title: 'VS Code opens automatically', description: 'InternX will clone the repo, create your personal branch, scaffold the folder structure, and open VS Code — all automatically.', code: null, tip: 'This may take 10–20 seconds the first time while the repo clones.' },
    { number: '08', title: 'Submit work for AI review', description: "When you're done coding, open the VS Code terminal and run this single command to commit, push, and create a PR:", code: 'internx pr --message "What I built"', tip: 'No git add or git commit needed — internx pr handles everything.' },
  ]

  const [activeStep, setActiveStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const step = steps[activeStep]

  const handleCopy = () => {
    if (step.code) {
      navigator.clipboard.writeText(step.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-lg rounded-2xl animate-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>VS Code Setup Guide</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>One-time setup · ~5 minutes</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-1.5 px-6 py-3 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
          {steps.map((s, i) => (
            <button key={i} onClick={() => setActiveStep(i)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeStep === i ? '#24292e' : 'var(--surface-2)', color: activeStep === i ? 'white' : 'var(--ink-muted)' }}>
              {s.number}
            </button>
          ))}
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-black text-xs text-white"
              style={{ background: '#24292e' }}>{step.number}</div>
            <div>
              <h3 className="font-display font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>{step.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{step.description}</p>
            </div>
          </div>
          {step.code && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 font-mono text-xs"
              style={{ background: '#0d1117', border: '1px solid #30363d' }}>
              <span style={{ color: '#8b949e' }}>$</span>
              <span style={{ color: '#58a6ff', flex: 1 }}>{step.code}</span>
              <button onClick={handleCopy} className="flex-shrink-0 transition-opacity hover:opacity-100 opacity-60">
                {copied
                  ? <svg className="w-4 h-4" style={{ color: '#3fb950' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  : <svg className="w-4 h-4" style={{ color: '#8b949e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                }
              </button>
            </div>
          )}
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: 'var(--accent-soft)' }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>{step.tip}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => setActiveStep(i => Math.max(0, i - 1))} disabled={activeStep === 0}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
            style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>← Back</button>
          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Step {activeStep + 1} of {steps.length}</span>
          {activeStep < steps.length - 1 ? (
            <button onClick={() => setActiveStep(i => i + 1)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: '#24292e', color: 'white' }}>Next →</button>
          ) : (
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: '#16a34a', color: 'white' }}>✓ Got it!</button>
          )}
        </div>
      </div>
    </div>
  , document.body)
}

export default function ProjectPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vsCodeConnecting, setVsCodeConnecting] = useState(false)
  const [vsCodeConnected, setVsCodeConnected] = useState(false)
  const [vsCodeError, setVsCodeError] = useState(null)
  const [showOpenPrompt, setShowOpenPrompt] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  // ── Per-user repo URL state ──────────────────────────────────
  const [userRepoUrl, setUserRepoUrl] = useState('')
  const [repoInput, setRepoInput] = useState('')
  const [editingRepo, setEditingRepo] = useState(false)
  const [repoSaving, setRepoSaving] = useState(false)
  const [repoSaved, setRepoSaved] = useState(false)
  const [repoError, setRepoError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) { router.push('/auth/login'); return }
      loadProject()
    }, 100)
    return () => clearTimeout(timer)
  }, [user])

  const loadProject = async () => {
    try {
      const profileRes = await api.get('/api/auth/me')
      const profile = profileRes.data

      let projectData
      if (profile.project_id) {
        const projectRes = await api.get(`/api/projects/${profile.project_id}`)
        projectData = projectRes.data
      } else {
        const assignRes = await api.post('/api/projects/assign')
        projectData = assignRes.data
      }

      setProject(projectData)
      // user_repo_url is the per-user repo URL returned by the backend
      setUserRepoUrl(projectData.user_repo_url || '')
    } catch (err) {
      console.error('Failed to load project', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRepo = async () => {
    if (!repoInput.trim()) return
    setRepoSaving(true)
    setRepoError(null)
    try {
      await api.patch(`/api/projects/${project?.id}/repo`, { repo_url: repoInput.trim() })
      setUserRepoUrl(repoInput.trim())
      setEditingRepo(false)
      setRepoSaved(true)
      setTimeout(() => setRepoSaved(false), 3000)
    } catch (err) {
      setRepoError(err?.response?.data?.detail || 'Failed to save repo URL')
    } finally {
      setRepoSaving(false)
    }
  }

  const handleVsCodeConnect = async () => {
    setVsCodeConnecting(true)
    setVsCodeError(null)
    setShowOpenPrompt(false)

    try {
      const res = await api.post(`/api/projects/${project?.id}/setup-token`)
      const { setup_url } = res.data

      const a = document.createElement('a')
      a.href = setup_url
      a.click()

      setTimeout(() => {
        setVsCodeConnecting(false)
        setShowOpenPrompt(true)
      }, 2500)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to connect. Make sure internx-cli is installed.'
      setVsCodeError(msg)
      setVsCodeConnecting(false)
    }
  }

  const handleStartSprint = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <div className="text-center animate-fade-up">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-soft)' }}>
            <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <p className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Finding your project...</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>Matching you with a real internship experience</p>
        </div>
      </div>
    )
  }

  if (!project) return null

  const folderRoot = project.folder_structure ? Object.entries(project.folder_structure)[0] : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${project.company_color}10 0%, transparent 70%)`, filter: 'blur(80px)' }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-sm text-white" style={{ background: 'var(--accent)' }}>X</div>
            <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>InternX</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            🎯 Project Assignment
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="animate-fade-up mb-8">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm"
              style={{ background: `${project.company_color}15`, border: `2px solid ${project.company_color}30` }}>
              {project.company_emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold" style={{ color: project.company_color }}>{project.company_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>{project.company_tagline}</span>
              </div>
              <h1 className="text-3xl font-display font-bold mb-2" style={{ color: 'var(--ink)' }}>{project.project_title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {project.intern_role.charAt(0).toUpperCase() + project.intern_role.slice(1)} Intern
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: project.difficulty === 'advanced' ? '#fee2e2' : '#fef9c3', color: project.difficulty === 'advanced' ? '#dc2626' : '#854d0e' }}>
                  {project.difficulty === 'advanced' ? '🔥 Advanced' : '⚡ Intermediate'}
                </span>
                <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>⏱ {project.duration_weeks} weeks</span>
              </div>
            </div>

            {/* VS Code Connect Button — unchanged */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <button onClick={() => setShowGuide(true)} title="Setup guide"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-muted)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
              {vsCodeConnected ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  VS Code Connected
                </div>
              ) : (
                <button onClick={handleVsCodeConnect} disabled={vsCodeConnecting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: '#24292e', color: 'white', opacity: vsCodeConnecting ? 0.7 : 1 }}>
                  {vsCodeConnecting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 00-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 00-1.276.057L.327 7.261A1 1 0 00.326 8.74L3.899 12 .326 15.26a1 1 0 00.001 1.479L1.65 17.94a.999.999 0 001.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 001.704.29l4.942-2.377A1.5 1.5 0 0024 19.86V4.14a1.5 1.5 0 00-.85-1.553zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
                      </svg>
                      Connect VS Code
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {showGuide && <SetupGuideModal onClose={() => setShowGuide(false)} />}

          {showOpenPrompt && !vsCodeConnected && (
            <div className="mt-4 p-4 rounded-2xl animate-fade-up" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#92400e' }}>👀 Did VS Code open?</p>
              <p className="text-xs mb-3" style={{ color: '#a16207' }}>
                Windows shows an <strong>"Allow this site to open InternX?"</strong> popup — click <strong>Open</strong> when it appears.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setVsCodeConnected(true); setShowOpenPrompt(false) }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  ✓ Yes, it opened
                </button>
                <button onClick={() => { setShowOpenPrompt(false); handleVsCodeConnect() }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  ✗ No — try again
                </button>
              </div>
            </div>
          )}

          {vsCodeError && (
            <div className="mt-4 p-4 rounded-2xl animate-fade-up" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#dc2626' }}>⚠️ Connection failed</p>
              <p className="text-xs mb-3" style={{ color: '#b91c1c' }}>{vsCodeError}</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Make sure you've installed the CLI:{' '}
                <code className="px-1.5 py-0.5 rounded" style={{ background: '#0d1117', color: '#58a6ff' }}>npm install -g internx-cli</code>
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit animate-fade-up stagger-1" style={{ background: 'var(--surface-2)' }}>
          {['overview', 'tech stack', 'team', 'folder structure'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize"
              style={{ background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? 'var(--ink)' : 'var(--ink-muted)', boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {tab}
            </button>
          ))}
        </div>

        <div className="animate-fade-up stagger-2">

          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 card p-7">
                <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--ink)' }}>About this project</h2>
                <p className="leading-relaxed text-sm" style={{ color: 'var(--ink-soft)' }}>{project.project_description}</p>
                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--ink)' }}>What you'll learn</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Real-world codebase navigation','Code review process','Sprint-based delivery','Working with design specs','Writing production code','Receiving & applying feedback'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-display font-bold text-sm mb-4" style={{ color: 'var(--ink)' }}>Sprint Plan</h3>
                  <div className="space-y-3">
                    {[{week:'Week 1',label:'Setup & Core Features',color:'var(--accent)'},{week:'Week 2',label:'Polish, Tests & Ship',color:'var(--green)'}].map(s => (
                      <div key={s.week} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <div>
                          <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{s.week}</div>
                          <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Per-user GitHub Repo Card ── */}
                <div className="card p-5">
                  <h3 className="font-display font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>GitHub Repository</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
                    {userRepoUrl ? 'Your repo — VS Code automation ready' : 'Add your GitHub repo URL to enable VS Code automation'}
                  </p>

                  {userRepoUrl && !editingRepo ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-mono truncate"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-soft)' }}>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ink-muted)' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        <span className="truncate">{userRepoUrl.replace('https://github.com/', '')}</span>
                      </div>
                      <button onClick={() => { setRepoInput(userRepoUrl); setEditingRepo(true) }}
                        className="flex-shrink-0 p-2 rounded-lg transition-opacity hover:opacity-70"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-muted)' }} title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input type="url" value={editingRepo ? repoInput : userRepoUrl}
                        onChange={e => editingRepo ? setRepoInput(e.target.value) : setUserRepoUrl(e.target.value)}
                        placeholder="https://github.com/you/your-repo"
                        className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none transition-all"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                        onKeyDown={e => e.key === 'Enter' && handleSaveRepo()}
                        autoFocus={editingRepo}
                      />
                      {repoError && <p className="text-xs" style={{ color: '#dc2626' }}>{repoError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleSaveRepo} disabled={repoSaving || !(editingRepo ? repoInput : userRepoUrl).trim()}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                          style={{ background: '#24292e', color: 'white' }}>
                          {repoSaving ? 'Saving...' : repoSaved ? '✓ Saved!' : 'Save Repo URL'}
                        </button>
                        {editingRepo && (
                          <button onClick={() => setEditingRepo(false)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card p-5">
                  <h3 className="font-display font-bold text-sm mb-3" style={{ color: 'var(--ink)' }}>About {project.company_name}</h3>
                  <div className="space-y-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
                    {[['Stage','Series D'],['Team size','800–1200'],['Location','San Francisco'],['Industry', project.intern_role === 'frontend' || project.intern_role === 'fullstack' ? 'SaaS' : project.intern_role === 'backend' ? 'Fintech' : 'Productivity']].map(([k,v]) => (
                      <div key={k} className="flex justify-between">
                        <span style={{ color: 'var(--ink-muted)' }}>{k}</span>
                        <span className="font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tech stack' && (
            <div className="card p-7">
              <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--ink)' }}>Tech Stack</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>Technologies you'll work with during this internship</p>
              <div className="flex flex-wrap gap-3">
                {project.tech_stack.map((tech, i) => (
                  <div key={tech} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: `hsl(${i * 47}, 70%, 55%)` }} />
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card p-7">
              <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--ink)' }}>Your Team</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>People you'll be working with at {project.company_name}</p>
              <div className="grid grid-cols-2 gap-4">
                {(project.team || []).map((member) => (
                  <div key={member.name} className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: member.color }}>{member.avatar}</div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                        {member.name}
                        {member.name === 'You' && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>You</span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'folder structure' && (
            <div className="grid grid-cols-2 gap-5">
              <div className="card p-6">
                <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>Starter Folder Structure</h2>
                <p className="text-xs mb-5" style={{ color: 'var(--ink-muted)' }}>This is the codebase structure you'll be working in</p>
                {folderRoot && (
                  <div className="rounded-xl p-4 font-mono" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                    <FolderTree name={folderRoot[0]} node={folderRoot[1]} depth={0} />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-display font-bold text-sm mb-3" style={{ color: 'var(--ink)' }}>🔌 Connect VS Code to get started</h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--ink-soft)' }}>
                    Install the InternX VS Code extension to get the starter code scaffolded in your editor automatically.
                  </p>
                  <div className="space-y-2 text-xs mb-4" style={{ color: 'var(--ink-soft)' }}>
                    {['Starter code auto-scaffolded','Tasks visible in sidebar','Submit work from VS Code','AI review inline in editor'].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleVsCodeConnect} disabled={vsCodeConnected || vsCodeConnecting}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: vsCodeConnected ? '#dcfce7' : '#24292e', color: vsCodeConnected ? '#16a34a' : 'white' }}>
                    {vsCodeConnected ? '✓ Connected' : vsCodeConnecting ? 'Connecting...' : '→ Connect VS Code'}
                  </button>
                  {vsCodeConnecting && (
                    <div className="mt-3 p-3 rounded-xl text-xs animate-fade-up" style={{ background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' }}>
                      <p className="font-semibold mb-0.5">👀 Watch for a browser popup!</p>
                      <p>Click <strong>"Open"</strong> when Windows asks to allow InternX.</p>
                    </div>
                  )}
                </div>
                <div className="card p-5">
                  <h3 className="font-display font-bold text-sm mb-2" style={{ color: 'var(--ink)' }}>Manual setup</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>Or set up locally without the extension</p>
                  <div className="rounded-lg p-3 font-mono text-xs" style={{ background: '#0d1117', color: '#58a6ff' }}>
                    <div style={{ color: '#8b949e' }}># Clone starter repo</div>
                    <div>git clone internx/starter/{project.intern_role}</div>
                    <div style={{ color: '#8b949e' }}># Install deps</div>
                    <div>npm install</div>
                    <div style={{ color: '#8b949e' }}># Start dev server</div>
                    <div>npm run dev</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-between items-center py-6 border-t animate-fade-up stagger-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="font-display font-bold" style={{ color: 'var(--ink)' }}>Ready to start?</p>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Your sprint is set up with {project.duration_weeks * 4} tasks across {project.duration_weeks} weeks
            </p>
          </div>
          <button onClick={handleStartSprint}
            className="btn-primary px-8 py-3.5 text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
            Go to Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}
