import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { guideArticles, teamSummary } from '@/lib/teamHubData'

export default function GuidePage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Guide to All" description="Shared documentation area for every team so frontend, backend, and tester members build from the same understanding.">
        <div className="grid md:grid-cols-3 gap-4">
          {guideArticles.map(article => (
            <div key={article.title} className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-lg mb-2" style={{ color: 'var(--ink)' }}>{article.title}</p>
              <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>{article.description}</p>
              <div className="flex flex-wrap gap-2">{article.tags.map(tag => <span key={tag} className="badge" style={{ background: 'white', color: 'var(--accent)' }}>{tag}</span>)}</div>
            </div>
          ))}
        </div>
      </DashboardPanel>
      <DashboardPanel title="Documentation status" description="This is the shared entry point for repo conventions and onboarding references.">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}><p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Guide version</p><p className="font-semibold">{teamSummary.guideVersion}</p></div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}><p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Shared audience</p><p className="font-semibold">Frontend, backend, tester</p></div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}><p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Recommended source</p><p className="font-semibold">Markdown or CMS-backed docs</p></div>
        </div>
      </DashboardPanel>
    </div>
  )
}
