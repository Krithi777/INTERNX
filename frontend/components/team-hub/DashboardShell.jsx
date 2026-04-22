'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { teamHubNav } from '@/lib/teamHubData'

export default function DashboardShell({ children }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="grid lg:grid-cols-[260px_1fr] min-h-screen">
        <aside className="border-r px-5 py-6" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(240,240,248,0.92) 100%)' }}>
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-display font-bold text-white text-lg" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #8b7fff 100%)' }}>X</div>
            <div><p className="font-display text-lg" style={{ color: 'var(--ink)' }}>InternX</p><p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Team dashboard</p></div>
          </Link>
          <div className="rounded-2xl p-4 mb-5" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--accent)' }}>Current squad</p>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Phoenix Pod</p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Hard project template with frontend, backend, and tester teams.</p>
          </div>
          <nav className="flex flex-col gap-1">
            {teamHubNav.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className="px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200" style={{ background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--ink-soft)', border: active ? '1px solid rgba(91,79,255,0.16)' : '1px solid transparent' }}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="rounded-2xl p-4 mt-6" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>After project completion</p>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>Let interns immediately pick the next project without leaving the product flow.</p>
            <Link href="/projects/next" className="btn-primary w-full justify-center">Choose next project</Link>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(248,248,252,0.92)', backdropFilter: 'blur(12px)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>InternX workspace</p>
                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>Team repo automation, sprint execution, and project continuity in one dashboard.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="btn-ghost" style={{ background: 'white', border: '1px solid var(--border)' }}>Sign In</Link>
                <a href="https://meet.google.com/" target="_blank" rel="noreferrer" className="btn-primary">Open Meet</a>
              </div>
            </div>
          </header>
          <main className="px-6 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
