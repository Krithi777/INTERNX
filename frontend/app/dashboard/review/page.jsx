import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { reviewSuggestions } from '@/lib/teamHubData'

export default function ReviewPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Review" description="Suggested review improvements based on the multi-team product workflow you described.">
        <div className="space-y-3">{reviewSuggestions.map((suggestion, index) => <div key={suggestion} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}><p className="text-xs mb-1" style={{ color: 'var(--accent)' }}>Suggestion 0{index + 1}</p><p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{suggestion}</p></div>)}</div>
      </DashboardPanel>
    </div>
  )
}
