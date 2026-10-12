import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { SearchField, Segmented } from '../components/ui'
import { events } from '../data'
import type { PageProps } from './types'

const systems = ['All', 'SMASH Cloud', 'FRIDAY', 'VERONICA', 'Security'] as const
type System = (typeof systems)[number]

export default function ActivityPage({ go, openNav }: PageProps) {
  const [system, setSystem] = useState<System>('All')
  const [query, setQuery] = useState('')

  const days = useMemo(() => {
    const q = query.toLowerCase()
    const shown = events.filter(
      (e) => (system === 'All' || e.system === system) && (!q || e.title.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q)),
    )
    const byDay = new Map<string, typeof events>()
    shown.forEach((e) => byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]))
    return [...byDay.entries()]
  }, [system, query])

  return (
    <>
      <Header title="Activity" subtitle="Everything that happened across SMASH Cloud, FRIDAY and VERONICA." onOpenNav={openNav} onNavigate={go} />

      <div className="toolbar">
        <Segmented options={systems} value={system} onChange={setSystem} label="Filter by system" />
        <SearchField value={query} onChange={setQuery} placeholder="Search activity" />
      </div>

      <div className="timeline">
        {days.map(([day, items]) => (
          <section key={day} className="day" aria-label={day}>
            <h2 className="day-title">{day}</h2>
            <ol className="feed feed--wide">
              {items.map((e, i) => (
                <li key={i}>
                  <span className={`feed-node feed-node--${e.tone ?? 'info'}`} aria-hidden="true" />
                  <div className="feed-body">
                    <p className="feed-title">{e.title}</p>
                    <p className="feed-detail">{e.detail}</p>
                  </div>
                  <span className="feed-system">{e.system}</span>
                  <span className="feed-time">{e.time}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {days.length === 0 && (
          <div className="empty-state">
            <p>No activity matches these filters.</p>
            <button className="text-btn" onClick={() => { setSystem('All'); setQuery('') }}>Clear filters</button>
          </div>
        )}
      </div>
    </>
  )
}
