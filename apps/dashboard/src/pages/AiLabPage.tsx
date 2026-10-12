import { useEffect, useRef, useState } from 'react'
import { Sparkles, Square } from 'lucide-react'
import { Header } from '../components/Header'
import { VeronicaMark } from '../components/Marks'
import { LossChart, StateChip } from '../components/Veronica'
import { Panel, StackBar, Legend } from '../components/ui'
import { veronicaGenerate, UnauthorizedError } from '../lib/api'
import { useBackend } from '../lib/backend'
import { compact, useVeronica, useVeronicaRuns } from '../lib/veronica'
import type { PageProps } from './types'

function TryVeronica({ disabled }: { disabled: boolean }) {
  const backend = useBackend()
  const [prompt, setPrompt] = useState('It was a dark and stormy night,')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [temperature, setTemperature] = useState(0.8)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const run = async () => {
    if (!prompt.trim() || busy) return
    const controller = new AbortController()
    abort.current = controller
    setBusy(true)
    setError(null)
    setOutput('')
    try {
      await veronicaGenerate(
        prompt,
        { max_tokens: 160, temperature },
        {
          onDelta: (t) => setOutput((o) => o + t),
          onDone: () => {},
          onError: (m) => setError(m),
        },
        controller.signal,
      )
    } catch (e) {
      if (e instanceof UnauthorizedError) backend.signOut()
      else if ((e as Error).name !== 'AbortError') setError((e as Error).message)
    } finally {
      setBusy(false)
      abort.current = null
    }
  }

  return (
    <Panel title="Try VERONICA" sub="Give it the start of a passage and it continues. It has only read old books, so expect Victorian prose, not answers.">
      <form
        className="try"
        onSubmit={(e) => {
          e.preventDefault()
          void run()
        }}
      >
        <textarea className="try-input" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Prompt for VERONICA" disabled={disabled} />
        <div className="try-bar">
          <label className="try-temp">
            <span>Creativity</span>
            <span className="try-scale" aria-hidden="true">Safe</span>
            <input type="range" min={0.2} max={1.4} step={0.1} value={temperature} onChange={(e) => setTemperature(+e.target.value)} disabled={disabled} aria-valuetext={`${temperature.toFixed(1)}`} />
            <span className="try-scale" aria-hidden="true">Wild</span>
            <span className="num">{temperature.toFixed(1)}</span>
          </label>
          {busy ? (
            <button type="button" className="btn btn--ghost" onClick={() => abort.current?.abort()}>
              <Square size={12} strokeWidth={2.5} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button className="btn btn--primary" disabled={disabled || !prompt.trim()}>
              <Sparkles size={15} strokeWidth={1.75} />
              Continue the text
            </button>
          )}
        </div>
      </form>
      {disabled && <p className="note">Sign in to the running backend to try the model.</p>}
      {!disabled && temperature < 0.6 && (
        <p className="note">At low creativity a small model like VERONICA tends to repeat itself. 0.8 to 1.0 gives more varied text.</p>
      )}
      {(output || busy || error) && (
        <div className="try-output" aria-live="polite">
          <p>
            <span className="try-prompt">{prompt}</span>
            {output}
            {busy && <span className="caret" aria-hidden="true" />}
          </p>
          {error && <p className="signin-error">VERONICA couldn’t continue: {error}</p>}
        </div>
      )}
    </Panel>
  )
}

export default function AiLabPage({ go, openNav }: PageProps) {
  const { view: v, error } = useVeronica()
  const runs = useVeronicaRuns()
  const progress = v.totalSteps ? v.step / v.totalSteps : 0
  const tokensTotal = v.dataset ? v.dataset.trainTokens + v.dataset.valTokens : 0

  return (
    <>
      <Header
        title="AI Lab"
        subtitle={v.live ? 'VERONICA, your own language model, training live on this Mac.' : 'Where VERONICA, your own language model, is trained and evaluated. Showing sample data until you sign in.'}
        onOpenNav={openNav}
        onNavigate={go}
      />

      {error && <p className="banner">Couldn’t refresh VERONICA’s status: {error}. Showing the last reading.</p>}

      <section className="lab-hero veronica" aria-labelledby="run-title">
        <div className="lab-hero-main">
          <div className="veronica-head">
            <div className="system-id">
              <VeronicaMark />
              <div>
                <h2 id="run-title" className="system-name">VERONICA</h2>
                <p className="system-role">CUSTOM MODEL RESEARCH</p>
              </div>
            </div>
            <StateChip view={v} />
          </div>
          {v.empty ? (
            <p className="veronica-empty">No training run yet. Once one starts, its progress shows up here.</p>
          ) : (
            <>
              <div className="run">
                <div className="run-top">
                  <span className="run-version run-version--lg">{v.run}</span>
                  <span className="muted">{v.params}</span>
                </div>
                <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Training progress">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
                <p className="run-steps">
                  Step {v.step.toLocaleString()} of {v.totalSteps.toLocaleString()}
                  {v.eta && `, ${v.eta}`}
                  {v.state === 'stalled' && '. The trainer hasn’t reported in over 15 minutes.'}
                </p>
              </div>
              <dl className="readouts">
                <div>
                  <dt>Validation loss</dt>
                  <dd>
                    {v.valLoss != null ? v.valLoss.toFixed(2) : '—'}{' '}
                    {v.valDelta != null && <span className={v.valDelta <= 0 ? 'ok-text' : 'warn-text'}>{v.valDelta > 0 ? '+' : ''}{v.valDelta.toFixed(2)}</span>}
                  </dd>
                </div>
                <div><dt>Best so far</dt><dd>{v.bestValLoss != null ? v.bestValLoss.toFixed(2) : '—'}</dd></div>
                <div><dt>Throughput</dt><dd>{v.tokensPerSec != null ? compact(v.tokensPerSec) : '—'} <span className="muted">tokens/s</span></dd></div>
                <div><dt>Tokens seen</dt><dd>{v.tokensSeen != null ? compact(v.tokensSeen) : '—'}</dd></div>
              </dl>
            </>
          )}
        </div>
        <div className="lab-hero-chart">
          <LossChart view={v} W={520} H={190} />
        </div>
      </section>

      <div className="grid-2">
        <TryVeronica disabled={!v.live || v.empty} />

        <Panel title="Latest sample" sub={v.sample ? `Written by VERONICA at step ${v.sample.step.toLocaleString()}, unedited.` : 'The trainer saves a sample at every evaluation.'}>
          {v.sample ? <blockquote className="sample-text">{v.sample.text}</blockquote> : <p className="note">No sample yet.</p>}
        </Panel>

        <Panel title="Runs" sub="Every VERONICA version trained here." className="panel--flush">
          <div className="table table--runs" role="table" aria-label="Runs">
            <div className="tr th" role="row">
              <span role="columnheader">Version</span>
              <span role="columnheader">Size</span>
              <span role="columnheader">Steps</span>
              <span role="columnheader">Best val.</span>
              <span role="columnheader">Status</span>
            </div>
            {runs.map((r) => (
              <div className="tr" role="row" key={r.run}>
                <span role="cell" className="strong">{r.run}</span>
                <span role="cell" className="num">{r.params}</span>
                <span role="cell" className="num muted-cell">{r.steps}</span>
                <span role="cell" className="num">{r.loss}</span>
                <span role="cell">
                  <span className={`health ${r.training ? 'health--training' : r.state === 'Finished' || r.state === 'Completed' ? 'health--healthy' : ''}`}>
                    <span className="dot" aria-hidden="true" />
                    {r.state}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Model and data" sub={v.architecture ?? undefined}>
          <dl className="facts">
            <div><dt>Checkpoint</dt><dd>{v.checkpoint ? <code>{v.checkpoint}</code> : 'None yet'}{v.checkpointAge && <span className="muted">{v.checkpointAge}</span>}</dd></div>
            <div><dt>Hardware</dt><dd>{v.device}</dd></div>
            {v.dataset && (
              <div>
                <dt>Dataset</dt>
                <dd>{v.dataset.name}{v.dataset.books ? <span className="muted">{v.dataset.books} books</span> : null}</dd>
              </div>
            )}
          </dl>
          {v.dataset && tokensTotal > 0 && (
            <>
              <StackBar
                parts={[
                  { label: 'Training', value: v.dataset.trainTokens, color: 'var(--blue)' },
                  { label: 'Validation', value: v.dataset.valTokens, color: 'var(--violet)' },
                ]}
                total={tokensTotal}
              />
              <Legend
                items={[
                  { label: 'Training tokens', value: compact(v.dataset.trainTokens), color: 'var(--blue)' },
                  { label: 'Validation tokens', value: compact(v.dataset.valTokens), color: 'var(--violet)' },
                ]}
              />
            </>
          )}
        </Panel>
      </div>
    </>
  )
}
