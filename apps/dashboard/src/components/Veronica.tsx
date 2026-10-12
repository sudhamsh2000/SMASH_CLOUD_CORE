import { smoothPath, trackGlow } from '../lib/chart'
import { compact, useVeronica, type VeronicaView } from '../lib/veronica'
import { VeronicaMark } from './Marks'

// Pick ~3 evenly spaced, round gridline values inside [lo, hi].
function gridValues(lo: number, hi: number) {
  const span = hi - lo
  const step = span > 2 ? 1 : span > 1 ? 0.5 : span > 0.4 ? 0.2 : 0.1
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(2))
  return out.length > 4 ? out.filter((_, i) => i % 2 === 0) : out
}

// Training and validation loss across the whole planned run, so the line's
// end shows how far training has got.
export function LossChart({ view, W = 320, H = 120 }: { view: VeronicaView; W?: number; H?: number }) {
  const { series, totalSteps } = view
  const n = series.val.length
  if (n < 2) {
    return (
      <figure className="loss loss--empty">
        <p>The loss curve appears after the second evaluation.</p>
      </figure>
    )
  }

  const all = [...series.val, ...series.train]
  const lo = Math.floor(Math.min(...all) * 10) / 10 - 0.1
  const hi = Math.ceil(Math.max(...all) * 10) / 10 + 0.1
  const xMax = Math.max(totalSteps, series.step[n - 1])
  const pts = (ys: number[]) => ys.map((y, i) => [(series.step[i] / xMax) * W, (1 - (y - lo) / (hi - lo)) * H])
  const val = pts(series.val)
  const train = pts(series.train)
  const last = val[val.length - 1]

  return (
    <figure className="loss">
      <svg
        viewBox={`0 -6 ${W + 26} ${H + 12}`}
        role="img"
        aria-label={`Validation loss from ${series.val[0].toFixed(2)} to ${series.val[n - 1].toFixed(2)} over ${series.step[n - 1].toLocaleString()} of ${xMax.toLocaleString()} steps`}
      >
        <defs>
          <linearGradient id="loss-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C2A6FF" stopOpacity="0.18" />
            <stop offset="1" stopColor="#C2A6FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="loss-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#74B8FF" />
            <stop offset="1" stopColor="#C2A6FF" />
          </linearGradient>
        </defs>
        {gridValues(lo, hi).map((g) => {
          const y = (1 - (g - lo) / (hi - lo)) * H
          return (
            <g key={g}>
              <line x1="0" x2={W} y1={y} y2={y} className="loss-grid" />
              <text x={W + 4} y={y + 3} className="loss-axis">{g.toFixed(1)}</text>
            </g>
          )
        })}
        {last[0] < W - 1 && <rect x={last[0]} y="0" width={W - last[0]} height={H} className="loss-ahead" />}
        <path d={smoothPath(train)} className="loss-train draw" pathLength={1} />
        <path d={`${smoothPath(val)} L${last[0]},${H} L${val[0][0]},${H} Z`} fill="url(#loss-fill)" className="spark-area" />
        <path d={smoothPath(val)} stroke="url(#loss-line)" className="loss-val draw" pathLength={1} />
        {view.training && <circle cx={last[0]} cy={last[1]} r="6" className="loss-halo" />}
        <circle cx={last[0]} cy={last[1]} r="2.5" fill="#C2A6FF" />
      </svg>
      <figcaption>
        <span className="legend"><i className="legend-val" />Validation</span>
        <span className="legend"><i className="legend-train" />Training</span>
        <span className="loss-steps">{xMax.toLocaleString()} steps planned</span>
      </figcaption>
    </figure>
  )
}

export function StateChip({ view }: { view: VeronicaView }) {
  const tone = view.training ? 'chip--violet' : view.state === 'done' ? 'chip--mint' : view.state === 'stalled' || view.state === 'failed' ? 'chip--amber' : ''
  return (
    <span className={`chip ${tone}`}>
      <span className={`dot${view.training ? ' dot--breathe' : ''}`} aria-hidden="true" />
      {view.stateLabel}
    </span>
  )
}

export function Veronica({ onOpenLab }: { onOpenLab: () => void }) {
  const { view: v } = useVeronica()
  const progress = v.totalSteps ? v.step / v.totalSteps : 0

  return (
    <section className="veronica glow" onPointerMove={trackGlow} aria-labelledby="veronica-title">
      <div className="veronica-head">
        <div className="system-id">
          <VeronicaMark />
          <div>
            <h2 id="veronica-title" className="system-name">VERONICA</h2>
            <p className="system-role">CUSTOM MODEL RESEARCH</p>
          </div>
        </div>
        <StateChip view={v} />
      </div>
      <p className="veronica-intro">
        Your own language model, trained here from scratch. FRIDAY doesn’t use it yet.
        {!v.live && <span className="muted"> Sample data until you sign in.</span>}
      </p>

      {v.empty ? (
        <p className="veronica-empty">No training run yet. Once one starts, its progress shows up here.</p>
      ) : (
        <>
          <div className="run">
            <div className="run-top">
              <span className="run-version">{v.run}</span>
              <span className="muted">{v.params}</span>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Training progress">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
            <p className="run-steps">
              Step {v.step.toLocaleString()} of {v.totalSteps.toLocaleString()}
              {v.eta && `, ${v.eta}`}
            </p>
          </div>

          <LossChart view={v} />

          <dl className="facts">
            <div>
              <dt>Validation loss</dt>
              <dd>
                {v.valLoss != null ? v.valLoss.toFixed(2) : 'Not measured yet'}
                {v.valDelta != null && (
                  <span className={v.valDelta <= 0 ? 'ok-text' : 'warn-text'}>
                    {v.valDelta > 0 ? '+' : ''}
                    {v.valDelta.toFixed(2)}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Latest checkpoint</dt>
              <dd>
                {v.checkpoint ? <code>{v.checkpoint}</code> : 'None yet'}
                {v.checkpointAge && <span className="muted">{v.checkpointAge}</span>}
              </dd>
            </div>
            <div>
              <dt>Hardware</dt>
              <dd>
                {v.device}
                {v.tokensPerSec != null && <span className="muted">{compact(v.tokensPerSec)} tokens/s</span>}
              </dd>
            </div>
          </dl>
        </>
      )}

      <button className="btn btn--primary" onClick={onOpenLab}>Open AI Lab</button>
    </section>
  )
}
