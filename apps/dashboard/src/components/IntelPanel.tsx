import { Boxes, RotateCcw, ScrollText, SquareTerminal } from 'lucide-react'
import { activity, intelligence } from '../data'
import { useVeronica } from '../lib/veronica'

const controls = [
  { label: 'Open terminal', icon: SquareTerminal, page: null },
  { label: 'View logs', icon: ScrollText, page: 'activity' },
  { label: 'Manage models', icon: Boxes, page: 'friday' },
  { label: 'Restart service', icon: RotateCcw, page: 'applications' },
]

export function IntelPanel({ notify, onNavigate }: { notify: (msg: string) => void; onNavigate: (page: string) => void }) {
  const { view: veronica } = useVeronica()
  const statuses = intelligence.map((s) =>
    s.name === 'VERONICA' && veronica.live
      ? { ...s, value: veronica.empty ? 'No run yet' : `${veronica.stateLabel}, ${Math.round((veronica.step / (veronica.totalSteps || 1)) * 100)}%` }
      : s,
  )
  return (
    <aside className="intel" aria-label="System intelligence">
      <section className="intel-section">
        <h2 className="intel-title">System Intelligence</h2>
        <ul className="intel-status">
          {statuses.map((s) => (
            <li key={s.name}>
              <button onClick={() => onNavigate(s.page)}>
                <span>{s.name}</span>
                <span className={`status-val status-val--${s.tone}`}>
                  <span className="dot" aria-hidden="true" />
                  {s.value}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="intel-section">
        <div className="intel-title-row">
          <h2 className="intel-title">Recent Activity</h2>
          <button className="text-btn" onClick={() => onNavigate('activity')}>View all</button>
        </div>
        <ol className="feed">
          {activity.map((a) => (
            <li key={a.title}>
              <span className="feed-node" aria-hidden="true" />
              <div className="feed-body">
                <p className="feed-title">{a.title}</p>
                <p className="feed-detail">{a.detail}</p>
              </div>
              <span className="feed-time">{a.time}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="intel-section">
        <h2 className="intel-title">Quick Controls</h2>
        <div className="controls">
          {controls.map(({ label, icon: Icon, page }) => (
            <button key={label} className="control" onClick={() => (page ? onNavigate(page) : notify('Terminal access arrives with the next release'))}>
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  )
}
