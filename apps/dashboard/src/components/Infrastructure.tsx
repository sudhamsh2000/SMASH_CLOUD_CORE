import { Database, Ellipsis, Network, Rocket, Route } from 'lucide-react'
import type { Service } from '../data'
import { services } from '../data'
import { FridayMark } from './Marks'
import { usePopover } from './Popover'

const icons = { gateway: Route, database: Database, api: Network, deploy: Rocket }

function ServiceIcon({ kind }: { kind: Service['icon'] }) {
  if (kind === 'friday') return <FridayMark size={18} />
  const Icon = icons[kind]
  return <Icon size={17} strokeWidth={1.5} />
}

function RowMenu({ service, notify, onNavigate }: { service: Service; notify: (msg: string) => void; onNavigate: (page: string) => void }) {
  const menu = usePopover()
  const act = (msg: string) => {
    menu.setOpen(false)
    notify(msg)
  }
  return (
    <div className="popover-anchor" ref={menu.ref}>
      <button className="icon-btn icon-btn--sm" aria-label={`Actions for ${service.name}`} aria-haspopup="menu" aria-expanded={menu.open} onClick={() => menu.setOpen((o) => !o)}>
        <Ellipsis size={16} strokeWidth={1.5} />
      </button>
      <ul className={`popover popover--right menu${menu.open ? ' is-open' : ''}`} role="menu">
        <li><button role="menuitem" onClick={() => {
          menu.setOpen(false)
          onNavigate('activity')
        }}>View logs</button></li>
        <li><button role="menuitem" onClick={() => act(`Restarting ${service.name}`)}>Restart</button></li>
        <li><button role="menuitem" onClick={() => {
          menu.setOpen(false)
          onNavigate('applications')
        }}>Open in Applications</button></li>
      </ul>
    </div>
  )
}

export function Infrastructure({ notify, onNavigate }: { notify: (msg: string) => void; onNavigate: (page: string) => void }) {
  return (
    <section className="infra" aria-labelledby="infra-title">
      <div className="infra-head">
        <h2 id="infra-title" className="section-title section-title--lg">Your infrastructure</h2>
        <p className="section-sub">Services and applications running across SMASH Cloud.</p>
      </div>
      <ul className="service-list">
        {services.map((s) => (
          <li key={s.id} className="service">
            <span className="service-icon">
              <ServiceIcon kind={s.icon} />
            </span>
            <span className="service-text">
              <span className="service-name">{s.name}</span>
              <span className="service-desc">{s.description}</span>
            </span>
            <span className="service-reading">{s.reading}</span>
            <span className={`health health--${s.health}`}>
              <span className="dot" aria-hidden="true" />
              {s.statusText}
            </span>
            <RowMenu service={s} notify={notify} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <div className="infra-foot">
        <span className="muted">5 services, 12 containers</span>
        <button className="text-btn" onClick={() => onNavigate('applications')}>View all applications</button>
      </div>
    </section>
  )
}
