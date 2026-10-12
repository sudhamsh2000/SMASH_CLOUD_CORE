import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Header } from '../components/Header'
import { FridayMark } from '../components/Marks'
import { Toggle } from '../components/ui'
import { automations } from '../data'
import type { PageProps } from './types'

export default function AutomationsPage({ go, notify, openNav }: PageProps) {
  const [state, setState] = useState(() => Object.fromEntries(automations.map((a) => [a.id, a.on])))
  const active = Object.values(state).filter(Boolean).length

  return (
    <>
      <Header title="Automations" subtitle={`${active} of ${automations.length} running. They keep SMASH Cloud backed up, secure and up to date.`} onOpenNav={openNav} onNavigate={go}>
        <div className="header-actions">
          <button className="btn btn--primary" onClick={() => go('friday')}>
            <Plus size={15} strokeWidth={1.75} />
            New automation
          </button>
        </div>
      </Header>

      <button className="ask-friday" onClick={() => go('friday')}>
        <FridayMark />
        <span>
          <span className="ask-title">Describe an automation and FRIDAY will set it up</span>
          <span className="muted">For example: “Every Friday evening, pause VERONICA training and run a full backup.”</span>
        </span>
      </button>

      <ul className="auto-list">
        {automations.map((a) => (
          <li key={a.id} className={`auto${state[a.id] ? '' : ' is-off'}`}>
            <div className="auto-text">
              <span className="auto-name">{a.name}</span>
              <span className="auto-trigger">{a.trigger}</span>
            </div>
            <span className="auto-system">{a.system}</span>
            <span className="auto-last">{state[a.id] ? a.last : 'Off'}</span>
            <button className="text-btn" disabled={!state[a.id]} onClick={() => notify(`Running “${a.name}” now`)}>
              Run now
            </button>
            <Toggle
              on={state[a.id]}
              label={a.name}
              onChange={(on) => {
                setState((s) => ({ ...s, [a.id]: on }))
                notify(`${a.name} turned ${on ? 'on' : 'off'}`)
              }}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
