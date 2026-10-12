import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Header } from '../components/Header'
import { Friday, type FridayHandle } from '../components/Friday'
import { Panel, SearchField } from '../components/ui'
import { conversations as sampleConversations, providers as sampleProviders } from '../data'
import * as api from '../lib/api'
import { useBackend } from '../lib/backend'
import type { PageProps } from './types'

type ListItem = { id: string; title: string; time: string }
type ProviderRow = { id: string; name: string; note: string; tokens: number }

const providerLabels: Record<string, { name: string; note: string }> = {
  anthropic: { name: 'Claude', note: 'Anthropic' },
  openai: { name: 'GPT', note: 'OpenAI' },
  gemini: { name: 'Gemini', note: 'Google' },
  ollama: { name: 'Local', note: 'Ollama on smash-01' },
}

function relativeDay(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days < 1 && d.getDate() === new Date().getDate()) return 'Today'
  if (days < 2) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function FridayPage({ go, openNav }: PageProps) {
  const { status } = useBackend()
  const live = status === 'ready'
  const friday = useRef<FridayHandle>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [remote, setRemote] = useState<ListItem[] | null>(null)
  const [usage, setUsage] = useState<ProviderRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Conversations and usage come from the FRIDAY service when signed in.
  const refresh = useCallback(() => {
    if (!live) return
    api
      .listConversations(query || undefined)
      .then((list) => {
        setRemote(list.map((c) => ({ id: c.id, title: c.title || 'New conversation', time: relativeDay(c.updated_at) })))
        setLoadError(null)
      })
      .catch((e: Error) => setLoadError(e.message))
    api
      .usage()
      .then((rows) => {
        const byProvider = new Map<string, number>()
        rows.forEach((r) => {
          const id = r.provider ?? 'unknown'
          byProvider.set(id, (byProvider.get(id) ?? 0) + r.input_tokens + r.output_tokens)
        })
        setUsage(
          [...byProvider.entries()]
            .map(([id, tokens]) => ({ id, tokens, ...(providerLabels[id] ?? { name: id, note: '' }) }))
            .sort((a, b) => b.tokens - a.tokens),
        )
      })
      .catch(() => setUsage(null))
  }, [live, query])

  useEffect(() => {
    const id = window.setTimeout(refresh, query ? 250 : 0)
    return () => clearTimeout(id)
  }, [refresh, query])

  const sampleList = useMemo(
    () => sampleConversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())).map(({ id, title, time }) => ({ id, title, time })),
    [query],
  )
  const list = live ? (remote ?? []) : sampleList
  const rows: ProviderRow[] = live ? (usage ?? []) : sampleProviders
  const total = rows.reduce((sum, p) => sum + p.tokens, 0)

  const open = async (id: string) => {
    setSelected(id)
    if (!live) {
      friday.current?.load(sampleConversations.find((c) => c.id === id)?.messages ?? [])
      return
    }
    try {
      const c = await api.getConversation(id)
      friday.current?.load(
        c.messages.map((m) => ({
          role: m.role === 'assistant' ? 'friday' : 'user',
          text: m.content,
          tools: m.tool_calls ?? undefined,
        })),
        c.id,
      )
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }

  // Clear the selection when the user starts a fresh conversation inside the panel.
  const onActiveChange = useCallback((active: boolean) => {
    if (!active) setSelected(null)
  }, [])

  return (
    <>
      <Header title="FRIDAY" subtitle="Your assistant. It answers with Claude, GPT, Gemini or a local model and can act across SMASH Cloud." onOpenNav={openNav} onNavigate={go} />

      <div className="friday-layout">
        <div className="friday-side">
          <Panel
            title="Conversations"
            sub={live ? undefined : 'Samples until FRIDAY’s backend is running'}
            action={
              <button
                className="icon-btn icon-btn--sm"
                aria-label="New conversation"
                onClick={() => {
                  friday.current?.reset()
                  setSelected(null)
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
            }
          >
            <SearchField value={query} onChange={setQuery} placeholder="Search conversations" />
            <ul className="convo-list">
              {list.map((c) => (
                <li key={c.id}>
                  <button className={selected === c.id ? 'is-on' : ''} aria-current={selected === c.id ? 'true' : undefined} onClick={() => void open(c.id)}>
                    <span className="convo-title">{c.title}</span>
                    <span className="convo-time">{c.time}</span>
                  </button>
                </li>
              ))}
              {loadError && <li className="empty">Couldn’t load conversations: {loadError}</li>}
              {!loadError && list.length === 0 && (
                <li className="empty">{query ? `No conversations match “${query}”.` : 'No conversations yet. Ask FRIDAY something to start one.'}</li>
              )}
            </ul>
          </Panel>

          <Panel title={live ? 'Model usage' : 'Models today'} sub={total ? `${(total / 1000).toFixed(1)}k tokens through Model Gateway${live ? '' : ', sample'}` : 'No replies yet'}>
            <ul className="provider-list">
              {rows.map((p) => (
                <li key={p.id}>
                  <span className="provider-name">
                    <span className="dot" aria-hidden="true" />
                    {p.name}
                    <span className="muted">{p.note}</span>
                  </span>
                  <span className="provider-tokens">{(p.tokens / 1000).toFixed(1)}k</span>
                  <span className="provider-bar" aria-hidden="true">
                    <span style={{ transform: `scaleX(${total ? p.tokens / total : 0})` }} />
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Friday ref={friday} variant="page" onNavigate={go} onActiveChange={onActiveChange} onConversationSaved={refresh} />
      </div>
    </>
  )
}
