import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

export function Panel({ title, sub, action, children, className = '' }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {sub && <p className="panel-sub">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle${on ? ' is-on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === value} className={o === value ? 'is-on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search">
      <Search size={15} strokeWidth={1.5} aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  )
}

// One stacked capacity bar; the remainder of `total` is drawn as free space.
export function StackBar({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="stackbar" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
      {parts.map((p) => (
        <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <ul className="legend-list">
      {items.map((i) => (
        <li key={i.label}>
          <i style={{ background: i.color }} aria-hidden="true" />
          <span>{i.label}</span>
          <span className="legend-value">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function Meter({ value, max = 100, tone = 'blue' }: { value: number; max?: number; tone?: 'blue' | 'violet' | 'mint' }) {
  return (
    <span className={`meter meter--${tone}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ transform: `scaleX(${Math.min(value / max, 1)})` }} />
    </span>
  )
}
