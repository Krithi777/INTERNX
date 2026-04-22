'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store/authStore'
import api from '@/lib/api'

// ─── Role config ─────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  frontend:  { label: 'Frontend',    color: '#5b4fff', bg: '#ede9ff',  icon: '⚡' },
  backend:   { label: 'Backend',     color: '#3b82f6', bg: '#eff6ff',  icon: '⚙️' },
  fullstack: { label: 'Full Stack',  color: '#f59e0b', bg: '#fffbeb',  icon: '🔥' },
  devops:    { label: 'DevOps',      color: '#00c896', bg: '#e0fff7',  icon: '🚀' },
  design:    { label: 'Design',      color: '#ec4899', bg: '#fdf2f8',  icon: '✦'  },
  tester:    { label: 'QA / Tester', color: '#8b5cf6', bg: '#f5f3ff',  icon: '🧪' },
  intern:    { label: 'Intern',      color: '#5b4fff', bg: '#ede9ff',  icon: '🎓' },
}

// ─── Certificate SVG ──────────────────────────────────────────────────────────
function buildCertSVG({ name, role, project, date, certId }) {
  const enc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 636" width="900" height="636">
  <defs>
    <linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8f8fc"/><stop offset="100%" stop-color="#ede9ff"/></linearGradient>
    <linearGradient id="gacc" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#5b4fff"/><stop offset="100%" stop-color="#8b7fff"/></linearGradient>
    <linearGradient id="ggold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#c9a84c"/><stop offset="100%" stop-color="#f0d080"/></linearGradient>
  </defs>
  <rect width="900" height="636" fill="url(#gbg)"/>
  <rect x="14" y="14" width="872" height="608" rx="12" fill="none" stroke="url(#gacc)" stroke-width="2.5"/>
  <rect x="22" y="22" width="856" height="592" rx="10" fill="none" stroke="url(#gacc)" stroke-width="0.7" stroke-dasharray="8,5"/>
  <rect x="14" y="14" width="872" height="90" rx="12" fill="url(#gacc)"/>
  <rect x="14" y="84" width="872" height="20" fill="url(#gacc)"/>
  <rect x="38" y="28" width="54" height="54" rx="13" fill="rgba(255,255,255,0.2)"/>
  <text x="65" y="63" font-family="Georgia,serif" font-size="28" font-weight="800" fill="white" text-anchor="middle">X</text>
  <text x="106" y="51" font-family="Georgia,serif" font-size="21" font-weight="700" fill="white">InternX Academy</text>
  <text x="106" y="71" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.75)" letter-spacing="2.5">OFFICIAL CERTIFICATION PROGRAM</text>
  <rect x="718" y="30" width="152" height="46" rx="9" fill="rgba(255,255,255,0.17)"/>
  <text x="794" y="56" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="white" text-anchor="middle" letter-spacing="1.5">CERTIFICATE OF</text>
  <text x="794" y="71" font-family="Arial,sans-serif" font-size="9.5" fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="1.5">INTERNSHIP COMPLETION</text>
  <g fill="none" stroke="#c9a84c" stroke-width="1.3" opacity="0.65">
    <path d="M50 130 Q50 118 63 118"/><line x1="50" y1="150" x2="50" y2="130"/><line x1="50" y1="118" x2="80" y2="118"/>
    <path d="M850 130 Q850 118 837 118"/><line x1="850" y1="150" x2="850" y2="130"/><line x1="850" y1="118" x2="820" y2="118"/>
    <path d="M50 510 Q50 522 63 522"/><line x1="50" y1="490" x2="50" y2="510"/><line x1="50" y1="522" x2="80" y2="522"/>
    <path d="M850 510 Q850 522 837 522"/><line x1="850" y1="490" x2="850" y2="510"/><line x1="850" y1="522" x2="820" y2="522"/>
  </g>
  <circle cx="450" cy="152" r="24" fill="url(#gacc)" opacity="0.12"/>
  <circle cx="450" cy="152" r="17" fill="none" stroke="url(#gacc)" stroke-width="1.5"/>
  <text x="450" y="158" font-size="15" text-anchor="middle" fill="#5b4fff">✦</text>
  <text x="450" y="204" font-family="Georgia,serif" font-size="14" fill="#8888a0" text-anchor="middle" font-style="italic" letter-spacing="1">This is to certify that</text>
  <text x="450" y="264" font-family="Georgia,serif" font-size="43" font-weight="700" fill="#0a0a0f" text-anchor="middle">${enc(name)}</text>
  <line x1="185" y1="278" x2="715" y2="278" stroke="url(#ggold)" stroke-width="1.6"/>
  <text x="450" y="315" font-family="Arial,sans-serif" font-size="13" fill="#3d3d4e" text-anchor="middle">has successfully completed an internship as</text>
  <text x="450" y="348" font-family="Georgia,serif" font-size="23" font-weight="700" fill="#5b4fff" text-anchor="middle">${enc(role)}</text>
  <text x="450" y="385" font-family="Arial,sans-serif" font-size="13" fill="#3d3d4e" text-anchor="middle">for the project</text>
  <text x="450" y="415" font-family="Georgia,serif" font-size="19" font-weight="600" fill="#0a0a0f" text-anchor="middle">&quot;${enc(project)}&quot;</text>
  <line x1="110" y1="448" x2="790" y2="448" stroke="#e2e2ee" stroke-width="1"/>
  <line x1="138" y1="502" x2="305" y2="502" stroke="#c8c8de" stroke-width="1"/>
  <text x="221" y="518" font-family="Arial,sans-serif" font-size="11" fill="#3d3d4e" text-anchor="middle" font-weight="600">Dr. Aryan Mehta</text>
  <text x="221" y="533" font-family="Arial,sans-serif" font-size="10.5" fill="#8888a0" text-anchor="middle">Program Director, InternX</text>
  <circle cx="450" cy="492" r="38" fill="none" stroke="url(#gacc)" stroke-width="1.5"/>
  <circle cx="450" cy="492" r="29" fill="url(#gacc)" opacity="0.09"/>
  <text x="450" y="487" font-family="Arial,sans-serif" font-size="11" text-anchor="middle" fill="#5b4fff" font-weight="700" letter-spacing="1">INTERN</text>
  <text x="450" y="502" font-family="Arial,sans-serif" font-size="11" text-anchor="middle" fill="#5b4fff" font-weight="700" letter-spacing="1">X</text>
  <text x="450" y="515" font-family="Arial,sans-serif" font-size="8" text-anchor="middle" fill="#8888a0" letter-spacing="1.5">ACADEMY</text>
  <line x1="595" y1="502" x2="762" y2="502" stroke="#c8c8de" stroke-width="1"/>
  <text x="678" y="518" font-family="Arial,sans-serif" font-size="11" fill="#3d3d4e" text-anchor="middle" font-weight="600">Priya Nair</text>
  <text x="678" y="533" font-family="Arial,sans-serif" font-size="10.5" fill="#8888a0" text-anchor="middle">Chief Learning Officer</text>
  <text x="450" y="580" font-family="Arial,sans-serif" font-size="10" fill="#8888a0" text-anchor="middle">Issued: ${enc(date)}  ·  Certificate ID: ${enc(certId)}  ·  internxacademy.dev</text>
</svg>`
}

async function svgToPngDataUrl(svgStr) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = 1800
      canvas.height = 1272
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 1800, 1272)
      ctx.drawImage(img, 0, 0, 1800, 1272)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

function triggerDownload(href, filename) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function openPrintWindow(svgStr, name) {
  const w = window.open('', '_blank', 'width=960,height=700')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>InternX Certificate – ${name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#f0f0f8;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif}
    .wrap{background:white;padding:32px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,.12);max-width:960px;width:100%}
    svg{width:100%;height:auto;display:block}
    .actions{display:flex;gap:12px;justify-content:center;padding:24px 0 0}
    button{padding:10px 24px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:14px}
    .btn-print{background:#5b4fff;color:white}
    .btn-close{background:#f0f0f8;color:#3d3d4e}
    @media print{.actions{display:none}body{background:white}.wrap{box-shadow:none;padding:0}@page{size:A4 landscape;margin:0}}
  </style></head>
  <body><div class="wrap">${svgStr}
  <div class="actions">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div></div></body></html>`)
  w.document.close()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 8 }) {
  return (
    <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, loading }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>{label}</p>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      {loading ? <Skeleton h={28} w={60} r={6} /> : <p style={{ fontSize: 26, fontFamily: 'Syne,sans-serif', fontWeight: 700, color: color || 'var(--ink)' }}>{value}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { user: storeUser, setAuth } = useAuthStore()

  const [profile, setProfile]       = useState(null)
  const [project, setProject]       = useState(null)
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const [editOpen, setEditOpen]     = useState(false)
  const [draftName, setDraftName]   = useState('')
  const [draftBio, setDraftBio]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')

  const [certMenuOpen, setCertMenuOpen] = useState(false)
  const [certState, setCertState]       = useState('idle') // idle|busy|done
  const certMenuRef = useRef(null)

  // close cert menu on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (certMenuRef.current && !certMenuRef.current.contains(e.target)) setCertMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // fetch profile + project + tasks
  useEffect(() => {
    if (!storeUser) { router.push('/auth/login'); return }
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const meRes = await api.get('/api/auth/me')
        const me = meRes.data
        if (!mounted) return
        setProfile(me)
        setDraftName(me.name || '')
        setDraftBio(me.bio || '')

        const taskPromise = api.get('/api/tasks/my-tasks').catch(() => ({ data: [] }))
        const projPromise = me.project_id
          ? api.get(`/api/projects/${me.project_id}`).catch(() => ({ data: null }))
          : Promise.resolve({ data: null })

        const [taskRes, projRes] = await Promise.all([taskPromise, projPromise])
        if (!mounted) return
        setTasks(taskRes.data || [])
        setProject(projRes.data)
      } catch (err) {
        if (mounted) setError('Could not load profile. Please refresh.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [storeUser, router])

  async function saveProfile() {
    if (!draftName.trim()) return
    setSaving(true)
    try {
      const res = await api.put('/api/auth/me', { name: draftName.trim(), bio: draftBio.trim() || null })
      setProfile(res.data)
      // update auth store so navbar reflects new name
      if (storeUser) {
        setAuth({ ...storeUser, name: res.data.name, bio: res.data.bio }, storeUser.token ?? JSON.parse(localStorage.getItem('internx-auth') || '{}')?.state?.token)
      }
      setSaveMsg('✓ Profile updated')
      setEditOpen(false)
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('⚠ Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCert(format) {
    setCertMenuOpen(false)
    setCertState('busy')
    try {
      const certId  = 'IXA-' + Date.now().toString(36).toUpperCase()
      const date    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const rc      = ROLE_CONFIG[profile?.intern_role] || ROLE_CONFIG.intern
      const svgStr  = buildCertSVG({
        name:    profile?.name || 'Intern',
        role:    rc.label,
        project: project?.project_title || project?.title || 'InternX Programme',
        date,
        certId,
      })
      const slug = (profile?.name || 'Intern').replace(/\s+/g, '-')

      if (format === 'svg') {
        const blob = new Blob([svgStr], { type: 'image/svg+xml' })
        triggerDownload(URL.createObjectURL(blob), `InternX-Certificate-${slug}.svg`)
      } else if (format === 'png') {
        const dataUrl = await svgToPngDataUrl(svgStr)
        triggerDownload(dataUrl, `InternX-Certificate-${slug}.png`)
      } else if (format === 'pdf' || format === 'print') {
        openPrintWindow(svgStr, profile?.name || 'Intern')
      }
      setCertState('done')
      setTimeout(() => setCertState('idle'), 3000)
    } catch (e) {
      console.error(e)
      setCertState('idle')
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const completedTasks  = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const reviewTasks     = tasks.filter(t => t.status === 'review').length
  const scoredTasks     = tasks.filter(t => typeof t.score === 'number')
  const avgScore        = scoredTasks.length ? (scoredTasks.reduce((s, t) => s + t.score, 0) / scoredTasks.length).toFixed(1) : '—'

  const rc          = ROLE_CONFIG[profile?.intern_role] || ROLE_CONFIG.intern
  const initials    = profile ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'
  const joinedDate  = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12 }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <p style={{ color: 'var(--ink-muted)' }}>{error}</p>
      <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Hero card ──────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(91,79,255,.05)' }}>
        {/* Banner */}
        <div style={{ height: 112, background: `linear-gradient(120deg, ${rc.color}dd 0%, ${rc.color}88 60%, ${rc.color}44 100%)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div style={{ position: 'absolute', right: -24, top: -24, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', right: 20, bottom: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: -44, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              {/* Avatar */}
              {loading ? (
                <div style={{ width: 80, height: 80, borderRadius: 18, background: 'var(--surface-2)', border: '4px solid white' }} />
              ) : profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.name} width={80} height={80} style={{ borderRadius: 18, border: '4px solid white', objectFit: 'cover', boxShadow: `0 6px 20px ${rc.color}55` }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 18, background: `linear-gradient(135deg, ${rc.color}, ${rc.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 28, color: 'white', border: '4px solid white', boxShadow: `0 6px 20px ${rc.color}55`, flexShrink: 0 }}>
                  {initials}
                </div>
              )}

              {/* Name + role */}
              <div style={{ paddingBottom: 2 }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton h={22} w={160} r={6} />
                    <Skeleton h={14} w={100} r={5} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--ink)', margin: 0 }}>{profile?.name}</h1>
                      {saveMsg && <span style={{ fontSize: 11, fontWeight: 600, color: saveMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', background: saveMsg.startsWith('✓') ? 'var(--green-soft)' : 'var(--red-soft)', padding: '3px 10px', borderRadius: 8 }}>{saveMsg}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '3px 0 0' }}>
                      {rc.icon} {rc.label} Intern · Joined {joinedDate}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Status + edit button */}
            {!loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingBottom: 2 }}>
                <span style={{ background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(0,200,150,.25)', borderRadius: 10, fontSize: 12, fontWeight: 600, padding: '5px 13px' }}>● Active intern</span>
                <button
                  onClick={() => { setDraftName(profile?.name || ''); setDraftBio(profile?.bio || ''); setEditOpen(true) }}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', padding: '5px 13px', cursor: 'pointer' }}
                >
                  ✏ Edit profile
                </button>
              </div>
            )}
          </div>

          {/* Role badge row */}
          {!loading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <span style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.color}30`, borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '5px 13px' }}>
                {rc.icon} {rc.label}
              </span>
              {profile?.github_username && (
                <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--ink-soft)', padding: '5px 13px', textDecoration: 'none', fontWeight: 500 }}>
                  🐙 @{profile.github_username}
                </a>
              )}
              {profile?.email && (
                <span style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--ink-muted)', padding: '5px 13px' }}>
                  ✉ {profile.email}
                </span>
              )}
            </div>
          )}

          {/* Project strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12 }}>
            {loading ? <Skeleton h={14} w="100%" r={6} /> : (
              <>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px var(--green-soft)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Current project</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{project?.project_title || project?.title || 'Not assigned yet'}</span>
                {project && <span style={{ marginLeft: 'auto', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 7, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>{project.difficulty || 'Active'}</span>}
              </>
            )}
          </div>

          {/* Bio */}
          {!loading && profile?.bio && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              "{profile.bio}"
            </p>
          )}
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatCard label="Tasks completed" value={completedTasks} color="var(--green)"   icon="✅" loading={loading} />
        <StatCard label="In review"        value={reviewTasks}    color="var(--accent)"  icon="👁"  loading={loading} />
        <StatCard label="In progress"      value={inProgressTasks} color="var(--amber)"  icon="⚡" loading={loading} />
        <StatCard label="Avg task score"   value={avgScore === '—' ? '—' : `${avgScore}%`} color="var(--blue)" icon="⭐" loading={loading} />
      </div>

      {/* ── Certificate card ──────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #ede9ff 0%, #f8f8fc 60%, white 100%)', border: '1px solid rgba(91,79,255,.22)', borderRadius: 20, padding: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(91,79,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 30, bottom: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(91,79,255,.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏆</div>
              <div>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: 0 }}>Certificate of Completion</h2>
                <p style={{ fontSize: 11, color: 'var(--ink-muted)', margin: 0 }}>InternX Academy — Official Document</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6, lineHeight: 1.6 }}>
              Awarded for completing <strong>{project?.project_title || project?.title || 'your project'}</strong> as <strong>{rc.label} Intern</strong>. Signed by Program Director Dr. Aryan Mehta and Chief Learning Officer Priya Nair.
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
              Unique certificate ID generated at download time. Open in any browser and Print → Save as PDF for a shareable copy.
            </p>
          </div>

          {/* Download button + dropdown */}
          <div style={{ position: 'relative' }} ref={certMenuRef}>
            <button
              onClick={() => setCertMenuOpen(o => !o)}
              disabled={loading || certState === 'busy'}
              className="btn-primary"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.5 : 1 }}
            >
              {certState === 'busy' ? (
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              ) : certState === 'done' ? '✓ Done!' : '⬇ Download Certificate'}
              {certState === 'idle' && <span style={{ fontSize: 10, opacity: .7 }}>▼</span>}
            </button>

            {certMenuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: 6, minWidth: 200, zIndex: 50 }}>
                {[
                  { fmt: 'svg',   icon: '📄', label: 'Download SVG',    sub: 'Vector, infinitely scalable' },
                  { fmt: 'png',   icon: '🖼',  label: 'Download PNG',    sub: 'High-res 1800 × 1272 px' },
                  { fmt: 'pdf',   icon: '📑',  label: 'Save as PDF',     sub: 'Opens print dialog' },
                  { fmt: 'print', icon: '🖨',  label: 'Print certificate', sub: 'Print-ready preview' },
                ].map(opt => (
                  <button key={opt.fmt} onClick={() => handleCert(opt.fmt)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-muted)', margin: 0 }}>{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit profile modal ────────────────────────────── */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,15,.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)', animation: 'fadeUp .25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)', margin: 0 }}>Edit profile</h2>
              <button onClick={() => setEditOpen(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--ink-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 7, letterSpacing: '.04em' }}>DISPLAY NAME</label>
                <input
                  autoFocus
                  className="input-field"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveProfile(); if (e.key === 'Escape') setEditOpen(false) }}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 7, letterSpacing: '.04em' }}>BIO <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={draftBio}
                  onChange={e => setDraftBio(e.target.value)}
                  placeholder="A short bio about yourself…"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ flex: 1, justifyContent: 'center', opacity: saving ? .7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn-ghost" onClick={() => setEditOpen(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Account info row ──────────────────────────────── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 14 }}>⚙ Account details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { label: 'Display name', value: profile?.name, action: () => { setDraftName(profile?.name || ''); setDraftBio(profile?.bio || ''); setEditOpen(true) }, actionLabel: '✏ Edit' },
            { label: 'Role', value: rc.label },
            { label: 'Email', value: profile?.email },
            { label: 'User ID', value: profile?.id ? profile.id.slice(0, 8) + '…' : '—' },
            { label: 'Account status', value: '● Active intern', green: true },
            { label: 'Member since', value: joinedDate },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 3, fontWeight: 500 }}>{row.label}</p>
                {loading ? <Skeleton h={13} w={80} r={4} /> : (
                  <p style={{ fontSize: 13, fontWeight: 600, color: row.green ? 'var(--green)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.value || '—'}
                  </p>
                )}
              </div>
              {row.action && !loading && (
                <button onClick={row.action} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, padding: '3px 9px', cursor: 'pointer', color: 'var(--ink-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>{row.actionLabel}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  )
}