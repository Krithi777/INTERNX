import DashboardPanel from '@/components/team-hub/DashboardPanel'
import { calendarItems } from '@/lib/teamHubData'

export default function CalendarPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <DashboardPanel title="Calendar" description="Use this route for previous and upcoming sprint schedules, demos, retrospectives, and planning checkpoints.">
        <div className="grid md:grid-cols-2 gap-4">
          {calendarItems.map(item => (
            <div key={`${item.name}-${item.date}`} className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: item.type === 'upcoming' ? 'var(--accent)' : 'var(--ink-muted)' }}>{item.type}</p>
              <p className="text-lg mb-1" style={{ color: 'var(--ink)' }}>{item.name}</p>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{item.date}</p>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </div>
  )
}
