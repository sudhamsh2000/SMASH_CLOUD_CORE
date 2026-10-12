import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Sidebar } from './components/Sidebar'
import { IntelPanel } from './components/IntelPanel'
import { SignIn } from './components/SignIn'
import { setToken } from './lib/api'
import { BackendContext, probeBackend, type Backend, type BackendStatus } from './lib/backend'
import type { PageProps } from './pages/types'
import OverviewPage from './pages/OverviewPage'
import FridayPage from './pages/FridayPage'
import ApplicationsPage from './pages/ApplicationsPage'
import AiLabPage from './pages/AiLabPage'
import ComputePage from './pages/ComputePage'
import StoragePage from './pages/StoragePage'
import AutomationsPage from './pages/AutomationsPage'
import ActivityPage from './pages/ActivityPage'
import SettingsPage from './pages/SettingsPage'

const pages: Record<string, { title: string; Page: ComponentType<PageProps> }> = {
  overview: { title: 'Overview', Page: OverviewPage },
  friday: { title: 'FRIDAY', Page: FridayPage },
  applications: { title: 'Applications', Page: ApplicationsPage },
  'ai-lab': { title: 'AI Lab', Page: AiLabPage },
  compute: { title: 'Compute', Page: ComputePage },
  storage: { title: 'Storage', Page: StoragePage },
  automations: { title: 'Automations', Page: AutomationsPage },
  activity: { title: 'Activity', Page: ActivityPage },
  settings: { title: 'Settings', Page: SettingsPage },
}

// Pages live in the URL hash so links, reloads and back/forward all work.
const readHash = () => {
  const id = window.location.hash.slice(1)
  return id in pages ? id : 'overview'
}

export default function App() {
  const [page, setPage] = useState(readHash)
  const [navOpen, setNavOpen] = useState(false)
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  const [status, setStatus] = useState<BackendStatus>('checking')
  const [user, setUser] = useState<string | null>(null)

  const recheck = useCallback(() => {
    void probeBackend().then((r) => {
      setStatus(r.status)
      setUser(r.user)
    })
  }, [])
  useEffect(recheck, [recheck])

  // While the backend is down, look again every 10 s so the dashboard connects
  // as soon as `docker compose up` finishes.
  useEffect(() => {
    if (status !== 'offline') return
    const id = window.setInterval(recheck, 10_000)
    return () => clearInterval(id)
  }, [status, recheck])

  const backend = useMemo<Backend>(
    () => ({
      status,
      user,
      recheck,
      signedIn: (name) => {
        setUser(name)
        setStatus('ready')
      },
      signOut: () => {
        setToken(null)
        setUser(null)
        setStatus('signed-out')
      },
    }),
    [status, user, recheck],
  )

  const notify = useCallback((msg: string) => setToast({ id: Date.now(), msg }), [])
  const go = useCallback((id: string) => {
    if (id in pages) window.location.hash = id
  }, [])
  const openNav = useCallback(() => setNavOpen(true), [])

  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // On navigation: reset scroll, retitle the tab, and move focus to the new heading.
  useEffect(() => {
    document.title = page === 'overview' ? 'SMASH Cloud' : `${pages[page].title} · SMASH Cloud`
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [page])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const { Page } = pages[page]
  const isOverview = page === 'overview'

  if (status === 'signed-out')
    return (
      <BackendContext.Provider value={backend}>
        <SignIn />
      </BackendContext.Provider>
    )

  return (
    <BackendContext.Provider value={backend}>
    <div className={`app${isOverview ? '' : ' no-intel'}`}>
      <Sidebar active={page} onSelect={go} open={navOpen} onClose={() => setNavOpen(false)} />
      <main className={`main main--${page}`} ref={mainRef}>
        <Page key={page} go={go} notify={notify} openNav={openNav} />
      </main>
      {isOverview && <IntelPanel notify={notify} onNavigate={go} />}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="toast">
            {toast.msg}
          </div>
        )}
      </div>
    </div>
    </BackendContext.Provider>
  )
}
