import { useMemo, useState } from 'react'
import { AppWindow, Ellipsis, Rocket } from 'lucide-react'
import { Header } from '../components/Header'
import { FridayMark, VeronicaMark } from '../components/Marks'
import { usePopover } from '../components/Popover'
import { Panel, SearchField, Segmented } from '../components/ui'
import { applications, type App } from '../data'
import type { PageProps } from './types'

const filters = ['All', 'Your apps', 'Core services', 'Needs attention'] as const
type Filter = (typeof filters)[number]

function AppIcon({ app }: { app: App }) {
  if (app.id === 'friday-core') return <FridayMark size={18} />
  if (app.id === 'veronica-trainer') return <VeronicaMark size={18} />
  return <span className="app-initial">{app.name[0]}</span>
}

function AppMenu({ app, notify, go }: { app: App; notify: (m: string) => void; go: (p: string) => void }) {
  const menu = usePopover()
  const act = (fn: () => void) => () => {
    menu.setOpen(false)
    fn()
  }
  return (
    <div className="popover-anchor" ref={menu.ref}>
      <button className="icon-btn icon-btn--sm" aria-label={`Actions for ${app.name}`} aria-haspopup="menu" aria-expanded={menu.open} onClick={() => menu.setOpen((o) => !o)}>
        <Ellipsis size={16} strokeWidth={1.5} />
      </button>
      <ul className={`popover popover--right menu${menu.open ? ' is-open' : ''}`} role="menu">
        <li><button role="menuitem" onClick={act(() => notify(`Restarting ${app.name}`))}>Restart</button></li>
        <li><button role="menuitem" onClick={act(() => go('activity'))}>View activity</button></li>
        <li><button role="menuitem" onClick={act(() => notify(`Checking ${app.name} for updates`))}>Check for updates</button></li>
      </ul>
    </div>
  )
}

export default function ApplicationsPage({ go, notify, openNav }: PageProps) {
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')

  const shown = useMemo(
    () =>
      applications.filter((a) => {
        if (filter === 'Your apps' && a.kind !== 'app') return false
        if (filter === 'Core services' && a.kind !== 'core') return false
        if (filter === 'Needs attention' && a.health === 'healthy') return false
        const q = query.toLowerCase()
        return !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      }),
    [filter, query],
  )
  const groups = [
    { title: 'Your apps', sub: 'Things you use every day, hosted on smash-01.', items: shown.filter((a) => a.kind === 'app') },
    { title: 'Core services', sub: 'The systems that run SMASH Cloud, FRIDAY and VERONICA.', items: shown.filter((a) => a.kind === 'core') },
  ].filter((g) => g.items.length)

  const totalCpu = applications.reduce((s, a) => s + a.cpu, 0)

  return (
    <>
      <Header title="Applications" subtitle="Everything running on SMASH Cloud, from your apps to the services underneath." onOpenNav={openNav} onNavigate={go}>
        <div className="header-actions">
          <button className="btn btn--primary" onClick={() => notify('Ask FRIDAY to prepare a deployment')}>
            <Rocket size={15} strokeWidth={1.75} />
            Deploy an application
          </button>
        </div>
      </Header>

      <div className="stat-strip">
        <div><span className="stat-value">{applications.length}</span><span className="stat-label">containers running</span></div>
        <div><span className="stat-value">{applications.filter((a) => a.health === 'healthy').length}</span><span className="stat-label">healthy</span></div>
        <div><span className="stat-value">{applications.filter((a) => a.health !== 'healthy').length}</span><span className="stat-label">rolling out</span></div>
        <div><span className="stat-value">{totalCpu.toFixed(1)}%</span><span className="stat-label">CPU in use</span></div>
      </div>

      <div className="toolbar">
        <Segmented options={filters} value={filter} onChange={setFilter} label="Filter applications" />
        <SearchField value={query} onChange={setQuery} placeholder="Search applications" />
      </div>

      {groups.map((g) => (
        <Panel key={g.title} title={g.title} sub={g.sub} className="panel--flush">
          <div className="table" role="table" aria-label={g.title}>
            <div className="tr th" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Version</span>
              <span role="columnheader">CPU</span>
              <span role="columnheader">Memory</span>
              <span role="columnheader">Uptime</span>
              <span role="columnheader">Status</span>
              <span role="columnheader"><span className="sr-only">Actions</span></span>
            </div>
            {g.items.map((a) => (
              <div className="tr" role="row" key={a.id}>
                <span role="cell" className="td-name">
                  <span className="service-icon"><AppIcon app={a} /></span>
                  <span className="service-text">
                    <span className="service-name">{a.name}</span>
                    <span className="service-desc">{a.description}</span>
                  </span>
                </span>
                <span role="cell" className="num">{a.version}</span>
                <span role="cell" className="num">{a.cpu.toFixed(1)}%</span>
                <span role="cell" className="num">{a.memory}</span>
                <span role="cell" className="num muted-cell">{a.uptime}</span>
                <span role="cell">
                  <span className={`health health--${a.health}`}>
                    <span className="dot" aria-hidden="true" />
                    {a.statusText}
                  </span>
                </span>
                <span role="cell"><AppMenu app={a} notify={notify} go={go} /></span>
              </div>
            ))}
          </div>
        </Panel>
      ))}

      {groups.length === 0 && (
        <div className="empty-state">
          <AppWindow size={22} strokeWidth={1.5} />
          <p>No applications match these filters.</p>
          <button className="text-btn" onClick={() => { setFilter('All'); setQuery('') }}>Clear filters</button>
        </div>
      )}
    </>
  )
}
