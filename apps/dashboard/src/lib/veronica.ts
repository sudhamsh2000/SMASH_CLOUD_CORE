import { useEffect, useState } from 'react'
import { runs as sampleRuns, veronica as sample } from '../data'
import { veronicaRuns, veronicaSummary, type RunState, type RunStatus, type VeronicaSummary } from './api'
import { useBackend } from './backend'

// What the VERONICA cards display, whether it comes from the live API or sample data.
export type VeronicaView = {
  live: boolean
  empty: boolean // signed in, but no training run exists yet
  run: string
  state: RunState
  stateLabel: string
  training: boolean
  params: string
  architecture: string | null
  step: number
  totalSteps: number
  eta: string | null
  checkpoint: string | null
  checkpointAge: string | null
  valLoss: number | null
  valDelta: number | null
  bestValLoss: number | null
  device: string
  tokensPerSec: number | null
  tokensSeen: number | null
  dataset: { name: string; trainTokens: number; valTokens: number; books: number } | null
  series: { step: number[]; train: number[]; val: number[] }
  sample: { step: number; text: string } | null
}

const stateLabels: Record<RunState, string> = {
  running: 'Training',
  done: 'Finished',
  stopped: 'Stopped',
  failed: 'Failed',
  stalled: 'Stalled',
}

export const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n)

export function ago(iso: string | null | undefined) {
  if (!iso) return null
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`
}

function eta(s: VeronicaSummary) {
  if (s.state !== 'running' || !s.step || !s.total_steps || !s.tokens_per_sec || !s.tokens_seen) return null
  const stepsPerSec = s.tokens_per_sec / (s.tokens_seen / s.step)
  const min = Math.round((s.total_steps - s.step) / stepsPerSec / 60)
  if (min < 1) return 'finishing now'
  if (min < 60) return `about ${min} min left`
  const h = Math.floor(min / 60)
  return `about ${h} h ${min % 60} min left`
}

const deviceName = (d?: string) =>
  d === 'mps' ? 'Apple Silicon GPU' : d === 'cuda' ? 'NVIDIA GPU' : d === 'cpu' ? 'CPU' : (d ?? 'Unknown device')

function fromSummary(s: VeronicaSummary): VeronicaView {
  const state = s.state ?? 'stopped'
  return {
    live: true,
    empty: false,
    run: s.run ?? '',
    state,
    stateLabel: stateLabels[state],
    training: state === 'running',
    params: s.params ? `${compact(s.params)} parameters` : '',
    architecture: s.architecture ?? null,
    step: s.step ?? 0,
    totalSteps: s.total_steps ?? 0,
    eta: eta(s),
    checkpoint: s.checkpoint ?? null,
    checkpointAge: ago(s.checkpoint_saved_at),
    valLoss: s.val_loss ?? null,
    valDelta: s.val_loss_delta ?? null,
    bestValLoss: s.best_val_loss ?? null,
    device: deviceName(s.device),
    tokensPerSec: s.tokens_per_sec ?? null,
    tokensSeen: s.tokens_seen ?? null,
    dataset: s.dataset
      ? { name: s.dataset.name, trainTokens: s.dataset.train_tokens, valTokens: s.dataset.val_tokens, books: s.dataset.books }
      : null,
    series: s.series ?? { step: [], train: [], val: [] },
    sample: s.latest_sample ?? null,
  }
}

const sampleView: VeronicaView = {
  live: false,
  empty: false,
  run: sample.version,
  state: 'running',
  stateLabel: 'Training',
  training: true,
  params: sample.params,
  architecture: '24 layers, d_model 2048, 16 heads, context 2048',
  step: sample.step,
  totalSteps: sample.totalSteps,
  eta: 'about 1 day 9 h left',
  checkpoint: sample.checkpoint,
  checkpointAge: sample.checkpointAge,
  valLoss: sample.valLoss,
  valDelta: sample.valDelta,
  bestValLoss: sample.valLoss,
  device: sample.gpu,
  tokensPerSec: 41_200,
  tokensSeen: 9_400_000_000,
  dataset: { name: 'Mixed web, books and code', trainTokens: 22_200_000_000, valTokens: 110_000_000, books: 0 },
  series: { step: sample.val.map((_, i) => i * 1000), train: sample.train, val: sample.val },
  sample: null,
}

const emptyView: VeronicaView = { ...sampleView, live: true, empty: true, run: '', stateLabel: 'No run yet', training: false, series: { step: [], train: [], val: [] } }

// Live VERONICA status when signed in, refreshed every 30 seconds; sample data otherwise.
export function useVeronica(): { view: VeronicaView; error: string | null } {
  const { status } = useBackend()
  const [summary, setSummary] = useState<VeronicaSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'ready') return
    let alive = true
    const load = () =>
      veronicaSummary()
        .then((s) => {
          if (!alive) return
          setSummary(s)
          setError(null)
        })
        .catch((e: Error) => alive && setError(e.message))
    load()
    const id = window.setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [status])

  if (status !== 'ready' || !summary) return { view: sampleView, error: status === 'ready' ? error : null }
  return { view: summary.run ? fromSummary(summary) : emptyView, error }
}

export type RunRow = { run: string; params: string; steps: string; loss: string; state: string; training: boolean }

export function useVeronicaRuns(): RunRow[] {
  const { status } = useBackend()
  const [runs, setRuns] = useState<RunStatus[] | null>(null)

  useEffect(() => {
    if (status !== 'ready') return
    veronicaRuns().then(setRuns).catch(() => setRuns(null))
  }, [status])

  if (status !== 'ready' || !runs)
    return sampleRuns.map((r) => ({ run: r.version, params: r.params, steps: r.steps, loss: r.loss, state: r.status, training: r.status === 'Training' }))
  return runs.map((r) => ({
    run: r.run,
    params: r.params ? compact(r.params) : '',
    steps: r.total_steps ? `${(r.step ?? 0).toLocaleString()} / ${r.total_steps.toLocaleString()}` : String(r.step ?? ''),
    loss: r.best_val_loss != null ? r.best_val_loss.toFixed(2) : '',
    state: stateLabels[r.state] ?? r.state,
    training: r.state === 'running',
  }))
}
