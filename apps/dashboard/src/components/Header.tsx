import type { ReactNode } from 'react'
import { Bell, Menu } from 'lucide-react'
import { SmashMark } from './Marks'
import { usePopover } from './Popover'

const notifications = [
  { title: 'Deployment Manager is rolling out 1 update', time: '3 min ago', page: 'applications' },
  { title: 'VERONICA saved checkpoint ckpt-18000', time: '41 min ago', page: 'ai-lab' },
]

type Props = {
  title: string
  subtitle: string
  children?: ReactNode
  onOpenNav: () => void
  onNavigate: (page: string) => void
}

export function Header({ title, subtitle, children, onOpenNav, onNavigate }: Props) {
  const bell = usePopover()
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <header className="header">
      <div className="mobile-bar">
        <button className="icon-btn" onClick={onOpenNav} aria-label="Open navigation">
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <SmashMark size={24} />
        <span className="brand-name">SMASH</span>
      </div>

      <div className="header-copy">
        <h1 tabIndex={-1}>{title}</h1>
        <p className="header-sub">{subtitle}</p>
        {children && <div className="header-extra">{children}</div>}
      </div>

      <div className="header-tools">
        <time className="header-date" dateTime={new Date().toISOString().slice(0, 10)}>{date}</time>
        <div className="popover-anchor" ref={bell.ref}>
          <button
            className="icon-btn has-badge"
            aria-label={`Notifications, ${notifications.length} new`}
            aria-expanded={bell.open}
            onClick={() => bell.setOpen((o) => !o)}
          >
            <Bell size={18} strokeWidth={1.5} />
          </button>
          <div className={`popover popover--right notif${bell.open ? ' is-open' : ''}`} role="dialog" aria-label="Notifications">
            <p className="popover-title">Notifications</p>
            <ul>
              {notifications.map((n) => (
                <li key={n.title}>
                  <button
                    onClick={() => {
                      bell.setOpen(false)
                      onNavigate(n.page)
                    }}
                  >
                    <span>{n.title}</span>
                    <span className="muted">{n.time}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button className="avatar avatar--sm" aria-label="Settings for Sudhamsh" onClick={() => onNavigate('settings')}>
          S
        </button>
      </div>
    </header>
  )
}

export function LiveStatus() {
  return (
    <p className="live-status">
      <span className="pulse-dot" aria-hidden="true" />
      All core systems operational
    </p>
  )
}
