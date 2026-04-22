import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { setupChecklist, teamSummary } from '@/lib/teamHubData'

export default function SetupPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Setup" description="Starter structure for VS Code integration, GitHub team repo creation, and environment onboarding.">
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-4">
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Checklist</p>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{setupChecklist.map(item => <li key={item}>- {item}</li>)}</ul>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--border)' }}><p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Proposed team repo</p><p className="font-semibold break-all" style={{ color: 'var(--ink)' }}>{teamSummary.repoName}</p></div>
            <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--border)' }}><p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>VS Code starter folders</p><p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Add `.vscode/extensions.json`, `.vscode/settings.json`, and workspace recommendations once the repo automation flow is connected.</p></div>
          </div>
        </div>
      </DashboardPanel>
    </div>
  )
}
