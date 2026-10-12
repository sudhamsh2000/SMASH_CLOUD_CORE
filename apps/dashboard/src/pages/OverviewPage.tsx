import { useEffect, useRef } from 'react'
import { Header, LiveStatus } from '../components/Header'
import { Friday, type FridayHandle } from '../components/Friday'
import { Metrics } from '../components/Metrics'
import { Infrastructure } from '../components/Infrastructure'
import { Veronica } from '../components/Veronica'
import type { PageProps } from './types'

export default function OverviewPage({ go, notify, openNav }: PageProps) {
  const friday = useRef<FridayHandle>(null)

  // "/" focuses FRIDAY from anywhere, so the assistant is always one key away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        friday.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Header title="Your environment, at a glance." subtitle="Everything connected. Everything under your control." onOpenNav={openNav} onNavigate={go}>
        <LiveStatus />
      </Header>
      <Friday ref={friday} onNavigate={go} />
      <Metrics onNavigate={go} />
      <div className="lower">
        <Infrastructure notify={notify} onNavigate={go} />
        <Veronica onOpenLab={() => go('ai-lab')} />
      </div>
    </>
  )
}
