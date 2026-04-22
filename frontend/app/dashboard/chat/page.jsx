import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { teamSummary } from '@/lib/teamHubData'

export default function ChatPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Chat and Meet" description="A lightweight collaboration module for project help, shared questions, and meeting access.">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Project chatbot</p>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>Reuse your mentor chat flow here, but add project context, sprint context, and team role context to the prompt.</p>
            <button className="btn-primary">Open team assistant</button>
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Google Meet room</p>
            <p className="text-sm mb-4 break-all" style={{ color: 'var(--ink-muted)' }}>{teamSummary.meetUrl}</p>
            <a href={teamSummary.meetUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ background: 'var(--surface-2)' }}>Go to Meet</a>
          </div>
        </div>
      </DashboardPanel>
    </div>
  )
}
