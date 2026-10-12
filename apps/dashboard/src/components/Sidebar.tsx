import { useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, AppWindow, Cpu, FlaskConical, HardDrive, LayoutGrid, Settings2, Workflow, X } from 'lucide-react'
import { FridayMark, SmashMark } from './Marks'

type NavItem = { id: string; label: string; icon: LucideIcon | 'friday' }

const groups: NavItem[][] = [
  [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'friday', label: 'FRIDAY', icon: 'friday' },
    { id: 'applications', label: 'Applications', icon: AppWindow },
    { id: 'ai-lab', label: 'AI Lab', icon: FlaskConical },
  ],
  [
    { id: 'compute', label: 'Compute', icon: Cpu },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'automations', label: 'Automations', icon: Workflow },
    { id: 'activity', label: 'Activity', icon: Activity },
  ],
]
const settings: NavItem = { id: 'settings', label: 'Settings', icon: Settings2 }

type Props = { active: string; onSelect: (id: string) => void; open: boolean; onClose: () => void }

export function Sidebar({ active, onSelect, open, onClose }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null)

  // The luminous indicator glides between items rather than jumping.
  useLayoutEffect(() => {
    const place = () => {
      const el = navRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`)
      if (el) setIndicator({ top: el.offsetTop, height: el.offsetHeight })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active])

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = item.id === active
    return (
      <li key={item.id}>
        <a
          href={`#${item.id}`}
          data-nav={item.id}
          className={`nav-item${isActive ? ' is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          title={item.label}
          onClick={(e) => {
            e.preventDefault()
            onSelect(item.id)
            onClose()
          }}
        >
          <span className="nav-icon">{Icon === 'friday' ? <FridayMark size={18} /> : <Icon size={18} strokeWidth={1.5} />}</span>
          <span className="nav-label">{item.label}</span>
        </a>
      </li>
    )
  }

  return (
    <>
      <div className={`scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Primary">
        <div className="brand">
          <SmashMark />
          <div className="brand-text">
            <span className="brand-name">SMASH</span>
            <span className="brand-sub">PRIVATE COMPUTING ENVIRONMENT</span>
          </div>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <nav ref={navRef} className="nav">
          {indicator && (
            <span className="nav-indicator" style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }} aria-hidden="true" />
          )}
          {groups.map((group, i) => (
            <ul key={i} className="nav-group">
              {group.map(renderItem)}
            </ul>
          ))}
          <ul className="nav-group nav-group--end">{renderItem(settings)}</ul>
        </nav>

        <div className="sidebar-foot">
          <div className="host" title="Connected to smash-01">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="host-text">
              <span className="host-name">smash-01</span>
              <span className="host-sub">Connected, 4 ms</span>
            </span>
          </div>
          <div className="profile">
            <span className="avatar" aria-hidden="true">S</span>
            <span className="profile-text">
              <span className="profile-name">Sudhamsh</span>
              <span className="profile-sub">Owner</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
