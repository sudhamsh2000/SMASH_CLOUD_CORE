// Thin client for the SMASH Cloud API. All requests go to /api/* on the same origin,
// which the gateway routes to the right service.

const TOKEN_KEY = 'smash.token'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable */ }
}

export class UnauthorizedError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const res = await fetch(path, { ...init, headers })
  if (res.status === 401) { setToken(null); throw new UnauthorizedError('Session expired') }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `${res.status} ${res.statusText}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Auth ──────────────────────────────────────────────
export async function login(username: string, password: string) {
  const r = await request<{ access_token: string; username: string }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  })
  setToken(r.access_token)
  return r.username
}
export const me = () => request<{ username: string }>('/api/auth/me')

// ── System ────────────────────────────────────────────
export interface SystemStats {
  cpu_percent: number
  cpu_count: number
  memory: { total: number; used: number; percent: number }
  disk: { total: number; used: number; percent: number }
  network: { bytes_sent: number; bytes_recv: number }
  uptime_seconds: number
  platform: string
}
export const systemStats = () => request<SystemStats>('/api/system/stats')

// ── FRIDAY ────────────────────────────────────────────
export interface ProviderInfo { id: string; label: string; model: string; available: boolean }
export interface Conversation { id: string; title: string; created_at: string; updated_at: string }
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number | null
  created_at: string
  tool_calls?: ToolCall[] | null
}
export interface ToolCall { id: string; name: string; input?: unknown; output?: string; is_error?: boolean }
export interface UsageRow {
  provider: string | null; model: string | null; replies: number
  input_tokens: number; output_tokens: number; avg_latency_ms: number | null
}

const F = '/api/friday'
export const providers = () => request<{ default: string; providers: ProviderInfo[] }>(`${F}/providers`)
export const usage = () => request<UsageRow[]>(`${F}/usage`)
export const listConversations = (q?: string) =>
  request<Conversation[]>(`${F}/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`)
export const createConversation = () => request<Conversation>(`${F}/conversations`, { method: 'POST' })
export const getConversation = (id: string) =>
  request<Conversation & { messages: Message[] }>(`${F}/conversations/${id}`)
export const renameConversation = (id: string, title: string) =>
  request<Conversation>(`${F}/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) })
export const deleteConversation = (id: string) =>
  request<void>(`${F}/conversations/${id}`, { method: 'DELETE' })

export interface StreamHandlers {
  onAttempt?: (a: { provider: string; model: string }) => void
  onToolCall?: (t: { id: string; name: string; input: unknown }) => void
  onToolResult?: (t: { id: string; name: string; output: string; is_error: boolean }) => void
  onDelta: (text: string) => void
  onDone: (m: Message) => void
  onError: (message: string) => void
}

// POSTs JSON and reads a Server-Sent Events reply, calling `onEvent` per event.
async function postSSE(path: string, body: unknown, onEvent: (event: string, payload: any) => void, signal?: AbortSignal) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const token = getToken()
  const res = await fetch(path, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (res.status === 401) { setToken(null); throw new UnauthorizedError('Session expired') }
  if (!res.ok || !res.body) {
    const detail = await res.json().then((b) => b.detail).catch(() => null)
    onEvent('error', { message: detail ?? `${res.status} ${res.statusText}` })
    return
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const event = raw.match(/^event: (.*)$/m)?.[1]
      const data = raw.match(/^data: (.*)$/m)?.[1]
      if (event && data) onEvent(event, JSON.parse(data))
    }
  }
}

// Sends a message to FRIDAY and streams the reply.
export function sendMessage(
  conversationId: string, content: string, provider: string | null, h: StreamHandlers, signal?: AbortSignal, tools = true,
) {
  return postSSE(`${F}/conversations/${conversationId}/messages`, { content, provider, ...(tools ? {} : { tools: false }) }, (event, payload) => {
    if (event === 'attempt') h.onAttempt?.(payload)
    else if (event === 'delta') h.onDelta(payload.text)
    else if (event === 'tool_call') h.onToolCall?.(payload)
    else if (event === 'tool_result') h.onToolResult?.(payload)
    else if (event === 'done') h.onDone(payload)
    else if (event === 'error') h.onError(payload.message)
  }, signal)
}

// ── VERONICA ──────────────────────────────────────────
export type RunState = 'running' | 'done' | 'stopped' | 'failed' | 'stalled'
export interface VeronicaSummary {
  run: string | null
  state?: RunState
  device?: string
  params?: number
  architecture?: string
  step?: number
  total_steps?: number
  checkpoint?: string | null
  checkpoint_saved_at?: string | null
  val_loss?: number | null
  val_loss_delta?: number | null
  best_val_loss?: number | null
  tokens_per_sec?: number | null
  tokens_seen?: number | null
  eval_every?: number
  dataset?: { name: string; train_tokens: number; val_tokens: number; books: number } | null
  series?: { step: number[]; train: number[]; val: number[] }
  latest_sample?: { step: number; text: string } | null
}
export interface RunStatus {
  run: string
  state: RunState
  device?: string
  params?: number
  step?: number
  total_steps?: number
  best_val_loss?: number | null
  started_at?: string
  updated_at?: string
}

const V = '/api/veronica'
export const veronicaSummary = () => request<VeronicaSummary>(`${V}/summary`)
export const veronicaRuns = () => request<RunStatus[]>(`${V}/runs`)

export function veronicaGenerate(
  prompt: string,
  opts: { max_tokens?: number; temperature?: number },
  h: { onDelta: (text: string) => void; onDone: (tokens: number) => void; onError: (message: string) => void },
  signal?: AbortSignal,
) {
  return postSSE(`${V}/generate`, { prompt, ...opts }, (event, payload) => {
    if (event === 'delta') h.onDelta(payload.text)
    else if (event === 'done') h.onDone(payload.tokens)
    else if (event === 'error') h.onError(payload.message)
  }, signal)
}

// ── Voice (ElevenLabs, proxied by FRIDAY so the key stays server-side) ──
export const voiceInfo = () => request<{ available: boolean; model: string }>(`${F}/voice`)

export async function speech(text: string, signal?: AbortSignal): Promise<Response> {
  const token = getToken()
  const res = await fetch(`${F}/speech`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ text }),
  })
  if (res.status === 401) { setToken(null); throw new UnauthorizedError('Session expired') }
  if (!res.ok || !res.body) {
    const detail = await res.json().then((b) => b.detail).catch(() => null)
    throw new Error(detail ?? `${res.status} ${res.statusText}`)
  }
  return res
}
