import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp, Check, ChevronDown, LoaderCircle, Mic, Paperclip, Square, Volume2, VolumeX, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../data'
import * as api from '../lib/api'
import { useBackend } from '../lib/backend'
import { useVoice } from '../lib/voice'
import { FridayMark } from './Marks'
import { LightField, type FieldState } from './LightField'
import { usePopover } from './Popover'

type Tool = { id: string; name: string; state: 'running' | 'done' | 'error' }
type Message = { id: number; role: 'user' | 'friday'; text: string; meta?: string; error?: boolean; tools?: Tool[] }

// What FRIDAY is doing when it runs each backend tool, while running and after.
const toolLabels: Record<string, [string, string]> = {
  system_stats: ['Checking system stats', 'Checked system stats'],
  service_health: ['Checking service health', 'Checked service health'],
  veronica_status: ['Checking on VERONICA', 'Checked on VERONICA'],
  veronica_generate: ['Asking VERONICA', 'Asked VERONICA'],
  search_conversations: ['Searching past conversations', 'Searched past conversations'],
  current_time: ['Checking the time', 'Checked the time'],
}
const toolLabel = (t: Tool) => {
  const [running, done] = toolLabels[t.name] ?? [`Running ${t.name}`, `Ran ${t.name}`]
  return t.state === 'running' ? `${running}…` : t.state === 'error' ? `${running} failed` : done
}

// `provider` is the FRIDAY backend's provider id; null lets its router decide.
const models = [
  { id: 'auto', provider: null, label: 'Auto', short: 'Auto · GPT / Claude / Local', note: 'Picks the right model for each request' },
  { id: 'claude', provider: 'anthropic', label: 'Claude', short: 'Claude', note: 'Anthropic, through Model Gateway' },
  { id: 'gpt', provider: 'openai', label: 'GPT', short: 'GPT', note: 'OpenAI, through Model Gateway' },
  { id: 'gemini', provider: 'gemini', label: 'Gemini', short: 'Gemini', note: 'Google, through Model Gateway' },
  { id: 'local', provider: 'ollama', label: 'Local', short: 'Local', note: 'Llama 3.1 8B on this Mac. Private, no tools' },
] as const

const providerNames: Record<string, string> = { anthropic: 'Claude', openai: 'GPT', gemini: 'Gemini', ollama: 'Local' }

const suggestions = ['Check system health', 'Open AI Lab', 'Deploy an application']

// Navigation is handled here rather than by a model: "open storage" just goes there.
const pageWords: [RegExp, string, string][] = [
  [/ai lab|veronica|\blab\b/, 'ai-lab', 'the AI Lab'],
  [/applications?|\bapps?\b/, 'applications', 'Applications'],
  [/compute|cpu|processor/, 'compute', 'Compute'],
  [/storage|disks?|backups?/, 'storage', 'Storage'],
  [/automations?/, 'automations', 'Automations'],
  [/activity|logs?/, 'activity', 'Activity'],
  [/settings/, 'settings', 'Settings'],
]
function navIntent(prompt: string) {
  const p = prompt.toLowerCase().trim()
  if (!/^(open|go to|show( me)?|take me to)\b/.test(p)) return null
  const hit = pageWords.find(([re]) => re.test(p))
  return hit ? { page: hit[1], name: hit[2] } : null
}

const OFFLINE_REPLY =
  'I can’t reach my backend, so I can’t answer that yet. Start SMASH Cloud from the project folder with “docker compose up -d”. This page connects on its own once it’s running.'

// Demonstration answers while the backend is offline, for the suggested prompts only.
function offlineReply(prompt: string) {
  const p = prompt.toLowerCase()
  if (p.includes('health'))
    return 'These are sample readings because my backend is offline: CPU load is normal, memory is at 18.4 of 32 GB, and all 12 containers are healthy.'
  if (p.includes('deploy'))
    return 'Once my backend is running, share a Git repository or a container image and I’ll prepare a deployment plan for you to review.'
  return OFFLINE_REPLY
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning.'
  if (h < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export type FridayHandle = {
  ask: (text: string) => void
  focus: () => void
  load: (messages: ChatMessage[], conversationId?: string) => void
  reset: () => void
}

type Props = {
  variant?: 'card' | 'page'
  onNavigate?: (page: string) => void
  onActiveChange?: (active: boolean) => void
  onConversationSaved?: () => void
}

export const Friday = forwardRef<FridayHandle, Props>(function Friday({ variant = 'card', onNavigate, onActiveChange, onConversationSaved }, handle) {
  const backend = useBackend()
  const voice = useVoice()
  // Read inside stream callbacks, which outlive the render that created them.
  const voiceRef = useRef(voice)
  useEffect(() => {
    voiceRef.current = voice
  })
  const live = backend.status === 'ready'
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false) // waiting for or streaming a reply
  const [waiting, setWaiting] = useState(false) // no text has arrived yet
  const [listening, setListening] = useState(false)
  const [model, setModel] = useState<(typeof models)[number]>(models[0])
  const [attachment, setAttachment] = useState<string | null>(null)
  const picker = usePopover()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const convRef = useRef<string | null>(null)
  const nextId = useRef(1)
  const [available, setAvailable] = useState<Record<string, boolean> | null>(null)

  // Which models the gateway can reach right now, so the picker can say so.
  useEffect(() => {
    if (!live) return
    api
      .providers()
      .then((r) => setAvailable(Object.fromEntries(r.providers.map((p) => [p.id, p.available]))))
      .catch(() => setAvailable(null))
  }, [live])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      abortRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, waiting])

  const autosize = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const addFriday = (text: string, extra: Partial<Message> = {}) => {
    const id = nextId.current++
    setMessages((m) => [...m, { id, role: 'friday', text, ...extra }])
    return id
  }
  const patch = (id: number, fn: (m: Message) => Message) => setMessages((all) => all.map((m) => (m.id === id ? fn(m) : m)))

  // Reveal a locally written reply word by word, the way a streamed one arrives.
  const typeOut = (text: string, then?: () => void) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timers.current.push(
      window.setTimeout(() => {
        setWaiting(false)
        if (reduced) {
          addFriday(text)
          setBusy(false)
          then?.()
          return
        }
        const words = text.split(' ')
        const id = addFriday('')
        words.forEach((_, i) => {
          timers.current.push(window.setTimeout(() => patch(id, (m) => ({ ...m, text: words.slice(0, i + 1).join(' ') })), i * 28))
        })
        timers.current.push(
          window.setTimeout(() => {
            setBusy(false)
            then?.()
          }, words.length * 28),
        )
      }, 600),
    )
  }

  const askModel = async (prompt: string) => {
    const controller = new AbortController()
    abortRef.current = controller
    let replyId: number | null = null
    try {
      if (!convRef.current) convRef.current = (await api.createConversation()).id
      // The reply message exists from the first token or tool call onward.
      const ensureReply = () => {
        if (replyId === null) {
          setWaiting(false)
          replyId = addFriday('')
        }
        return replyId
      }
      await api.sendMessage(
        convRef.current,
        prompt,
        model.provider,
        {
          onDelta: (text) => patch(ensureReply(), (m) => ({ ...m, text: m.text + text })),
          onToolCall: (t) =>
            patch(ensureReply(), (m) => ({ ...m, tools: [...(m.tools ?? []), { id: t.id, name: t.name, state: 'running' }] })),
          onToolResult: (t) =>
            patch(ensureReply(), (m) => ({
              ...m,
              tools: (m.tools ?? []).map((x) => (x.id === t.id ? { ...x, state: t.is_error ? 'error' : 'done' } : x)),
            })),
          onDone: (msg) => {
            const meta = `${providerNames[msg.provider ?? ''] ?? msg.provider ?? 'Model'}${msg.latency_ms ? `, ${(msg.latency_ms / 1000).toFixed(1)} s` : ''}`
            if (replyId === null) replyId = addFriday(msg.content, { meta })
            else {
              const id = replyId
              patch(id, (m) => ({ ...m, text: msg.content, meta }))
            }
            const v = voiceRef.current
            if (v.available && v.autoSpeak) v.speak(replyId, msg.content)
            onConversationSaved?.()
          },
          onError: (message) => {
            setWaiting(false)
            addFriday(`I couldn’t get an answer: ${message}`, { error: true })
          },
        },
        controller.signal,
        // Small local models print tool calls as text instead of making them.
        model.provider !== 'ollama',
      )
    } catch (e) {
      setWaiting(false)
      if (e instanceof api.UnauthorizedError) {
        addFriday('Your session has expired. Sign in again to keep talking.', { error: true })
        backend.signOut()
      } else if ((e as Error).name === 'AbortError') {
        if (replyId !== null) {
          const id = replyId
          patch(id, (m) => ({ ...m, meta: 'Stopped' }))
        }
      } else {
        addFriday(`I couldn’t reach my backend: ${(e as Error).message}`, { error: true })
        backend.recheck()
      }
    } finally {
      abortRef.current = null
      setWaiting(false)
      setBusy(false)
    }
  }

  const send = (text: string) => {
    const prompt = text.trim()
    if (!prompt || busy) return
    setMessages((m) => [...m, { id: nextId.current++, role: 'user', text: prompt }])
    setDraft('')
    setAttachment(null)
    setListening(false)
    requestAnimationFrame(autosize)
    setBusy(true)
    setWaiting(true)

    const nav = navIntent(prompt)
    if (nav && onNavigate) {
      typeOut(`Opening ${nav.name}.`, () => timers.current.push(window.setTimeout(() => onNavigate(nav.page), 500)))
    } else if (live) {
      void askModel(prompt)
    } else {
      typeOut(offlineReply(prompt))
    }
  }

  const stop = () => {
    voice.stop()
    abortRef.current?.abort()
    timers.current.forEach(clearTimeout)
    timers.current = []
    setWaiting(false)
    setBusy(false)
  }

  const reset = () => {
    stop()
    convRef.current = null
    setMessages([])
    inputRef.current?.focus()
  }

  const load = (history: ChatMessage[], conversationId?: string) => {
    stop()
    convRef.current = conversationId ?? null
    setMessages(
      history.map((m) => ({
        ...m,
        id: nextId.current++,
        tools: m.tools?.map((t) => ({ id: t.id, name: t.name, state: t.is_error ? ('error' as const) : ('done' as const) })),
      })),
    )
  }

  useImperativeHandle(handle, () => ({ ask: send, focus: () => inputRef.current?.focus(), load, reset }))

  const active = messages.length > 0
  useEffect(() => onActiveChange?.(active), [active, onActiveChange])

  const fieldState: FieldState = waiting ? 'thinking' : busy || draft || listening || voice.speakingId !== null ? 'typing' : 'idle'
  const chip =
    busy ? { text: waiting ? 'Thinking' : 'Answering', tone: 'chip--violet' }
    : live ? { text: 'Ready', tone: 'chip--mint' }
    : backend.status === 'checking' ? { text: 'Connecting', tone: '' }
    : backend.status === 'signed-out' ? { text: 'Signed out', tone: '' }
    : { text: 'Offline', tone: 'chip--amber' }

  return (
    <section className={`friday friday--${variant}${active ? ' is-active' : ''}`} aria-labelledby="friday-title">
      <div className="friday-field">
        <LightField state={fieldState} />
      </div>

      <div className="friday-head">
        <div className="system-id">
          <FridayMark />
          <div>
            <h2 id="friday-title" className="system-name">FRIDAY</h2>
            <p className="system-role">PERSONAL INTELLIGENCE</p>
          </div>
        </div>
        <div className="friday-head-end">
          {voice.available && (
            <button
              className={`icon-btn icon-btn--sm voice-toggle${voice.autoSpeak ? ' is-on' : ''}`}
              aria-pressed={voice.autoSpeak}
              aria-label={voice.autoSpeak ? 'Stop reading replies aloud' : 'Read replies aloud'}
              title={voice.autoSpeak ? 'Reading replies aloud' : 'Read replies aloud'}
              onClick={() => {
                if (voice.autoSpeak) voice.stop()
                voice.setAutoSpeak(!voice.autoSpeak)
              }}
            >
              {voice.autoSpeak ? <Volume2 size={16} strokeWidth={1.5} /> : <VolumeX size={16} strokeWidth={1.5} />}
            </button>
          )}
          {active && (
            <button className="text-btn" onClick={reset}>
              New conversation
            </button>
          )}
          <span className={`chip ${chip.tone}`}>
            <span className="dot" aria-hidden="true" />
            {chip.text}
          </span>
        </div>
      </div>

      <div className="collapse friday-greeting" aria-hidden={active}>
        <div>
          <p className="greeting">
            {greeting()}
            <br />
            <span className="greeting-ask">What would you like to work on?</span>
          </p>
        </div>
      </div>

      <div className="collapse friday-thread-wrap">
        <div>
          <div className="friday-thread" ref={threadRef} aria-live="polite">
            {messages.map((m) =>
              m.role === 'user' ? (
                <p key={m.id} className="msg msg--user">{m.text}</p>
              ) : (
                <div key={m.id} className={`msg msg--friday${m.error ? ' msg--error' : ''}`}>
                  <FridayMark size={16} />
                  <div>
                    {m.tools && m.tools.length > 0 && (
                      <ul className="tool-chips" aria-label="What FRIDAY checked">
                        {m.tools.map((t) => (
                          <li key={t.id} className={`tool-chip tool-chip--${t.state}`}>
                            <span className="tool-dot" aria-hidden="true" />
                            {toolLabel(t)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.text &&
                      (m.error ? (
                        <p>{m.text}</p>
                      ) : (
                        <div className="md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      ))}
                    {(m.meta || (voice.available && !m.error && m.text && !busy)) && (
                      <div className="msg-foot">
                        {m.meta && <span className="msg-meta">{m.meta}</span>}
                        {voice.available && !m.error && m.text && (
                          <button
                            className={`listen${voice.speakingId === m.id ? ' is-on' : ''}`}
                            onClick={() => (voice.speakingId === m.id || voice.loadingId === m.id ? voice.stop() : voice.speak(m.id, m.text))}
                            aria-label={voice.speakingId === m.id ? 'Stop speaking' : 'Listen to this reply'}
                          >
                            {voice.loadingId === m.id ? (
                              <LoaderCircle size={13} strokeWidth={1.75} className="spin" />
                            ) : voice.speakingId === m.id ? (
                              <Square size={10} strokeWidth={2.5} fill="currentColor" />
                            ) : (
                              <Volume2 size={13} strokeWidth={1.75} />
                            )}
                            {voice.speakingId === m.id ? 'Stop' : 'Listen'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {waiting && (
              <div className="msg msg--friday">
                <FridayMark size={16} />
                <span className="typing" aria-label="FRIDAY is thinking">
                  <i /><i /><i />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form
        className={`composer${draft ? ' has-text' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        {attachment && (
          <div className="attachment">
            <Paperclip size={13} strokeWidth={1.5} />
            <span>{attachment}</span>
            <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}>
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        )}
        <div className="composer-field">
          {listening ? (
            <div className="listening" aria-live="polite">
              <span className="levels" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              Listening…
            </div>
          ) : (
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              placeholder="Ask FRIDAY anything..."
              aria-label="Message FRIDAY"
              onChange={(e) => {
                setDraft(e.target.value)
                autosize()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
            />
          )}
        </div>
        <div className="composer-bar">
          <div className="composer-left">
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => {
                setAttachment(e.target.files?.[0]?.name ?? null)
                e.target.value = ''
              }}
            />
            <button type="button" className="icon-btn" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
              <Paperclip size={17} strokeWidth={1.5} />
            </button>
            <div className="popover-anchor" ref={picker.ref}>
              <button
                type="button"
                className="model-btn"
                aria-haspopup="listbox"
                aria-expanded={picker.open}
                onClick={() => picker.setOpen((o) => !o)}
              >
                <span>{model.short}</span>
                <ChevronDown size={14} strokeWidth={1.5} className="chev" />
              </button>
              <ul className={`popover popover--up models${picker.open ? ' is-open' : ''}`} role="listbox" aria-label="Model">
                {models.map((m) => {
                  const off = live && available !== null && m.provider !== null && available[m.provider] === false
                  return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={m.id === model.id}
                      aria-disabled={off}
                      disabled={off}
                      onClick={() => {
                        setModel(m)
                        picker.setOpen(false)
                      }}
                    >
                      <span className="opt-text">
                        <span>{m.label}</span>
                        <span className="muted">{off ? 'Not running on smash-01 right now' : m.note}</span>
                      </span>
                      {m.id === model.id && <Check size={15} strokeWidth={1.75} className="opt-check" />}
                    </button>
                  </li>
                  )
                })}
              </ul>
            </div>
          </div>
          <div className="composer-right">
            <button
              type="button"
              className={`icon-btn mic${listening ? ' is-on' : ''}`}
              aria-label={listening ? 'Stop listening' : 'Speak to FRIDAY'}
              aria-pressed={listening}
              onClick={() => setListening((l) => !l)}
            >
              {listening ? <Square size={14} strokeWidth={2} /> : <Mic size={17} strokeWidth={1.5} />}
            </button>
            {busy ? (
              <button type="button" className="send-btn is-stop" aria-label="Stop answering" onClick={stop}>
                <Square size={12} strokeWidth={2.5} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" className="send-btn" aria-label="Send" disabled={!draft.trim()}>
                <ArrowUp size={17} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion" onClick={() => send(s)} disabled={busy}>
            {s}
          </button>
        ))}
        {voice.error && <span className="voice-error">Voice: {voice.error}</span>}
        <span className="preview-note">
          {live ? `Signed in as ${backend.user}` : backend.status === 'offline' ? 'Backend offline, showing sample answers' : ''}
        </span>
      </div>
    </section>
  )
})
