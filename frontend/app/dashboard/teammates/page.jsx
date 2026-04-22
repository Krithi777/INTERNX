import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { teammateSprintDetails } from '@/lib/teamHubData'

export default function TeammatesPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Teammates Sprint" description="This view is the placeholder for teammate task visibility, role ownership, blockers, and progress summaries.">
        <div className="grid md:grid-cols-3 gap-4">{teammateSprintDetails.map(member => <div key={member.name} className="card p-5"><p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent)' }}>{member.role}</p><p className="text-lg mb-1" style={{ color: 'var(--ink)' }}>{member.name}</p><p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>{member.focus}</p><span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>{member.status}</span></div>)}</div>
      </DashboardPanel>
    </div>
  )
}
