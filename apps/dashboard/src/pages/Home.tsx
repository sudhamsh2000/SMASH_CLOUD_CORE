import { useEffect, useState } from 'react'
import { Bot, Cpu, HardDrive, MemoryStick, Timer } from 'lucide-react'
import {
  providers as fetchProviders, systemStats, usage as fetchUsage, UnauthorizedError,
  type ProviderInfo, type SystemStats, type UsageRow,
} from '../lib/api'

const gb = (b: number) => `${(b / 1024 ** 3).toFixed(1)} GB`
const uptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d ? `${d}d ${h}h` : `${h}h ${m}m`
}

function Meter({ label, icon: Icon, percent, detail }: { label: string; icon: typeof Cpu; percent: number; detail: string }) {
  return (
    <div className="card stat">
      <div className="stat-head"><Icon size={16} /><span>{label}</span></div>
      <div className="stat-value">{percent.toFixed(0)}<span className="unit">%</span></div>
      <div className="bar"><div style={{ width: `${Math.min(percent, 100)}%` }} /></div>
      <div className="muted small">{detail}</div>
    </div>
  )
}

export default function Home({ onOpenFriday, onUnauthorized }: { onOpenFriday: () => void; onUnauthorized: () => void }) {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [provs, setProvs] = useState<ProviderInfo[]>([])
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = (e: unknown) => {
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError(e instanceof Error ? e.message : String(e))
    }
    const load = () => systemStats().then(setStats).catch(handle)
    load()
    fetchProviders().then(r => setProvs(r.providers)).catch(handle)
    fetchUsage().then(setUsage).catch(handle)
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [onUnauthorized])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Home</h1>
        <p className="muted">{stats ? `${stats.platform} · up ${uptime(stats.uptime_seconds)}` : 'Loading…'}</p>
      </header>
      {error && <div className="error">{error}</div>}

      {stats && (
        <section className="grid stats">
          <Meter label="CPU" icon={Cpu} percent={stats.cpu_percent} detail={`${stats.cpu_count} cores`} />
          <Meter label="Memory" icon={MemoryStick} percent={stats.memory.percent} detail={`${gb(stats.memory.used)} of ${gb(stats.memory.total)}`} />
          <Meter label="Disk" icon={HardDrive} percent={stats.disk.percent} detail={`${gb(stats.disk.used)} of ${gb(stats.disk.total)}`} />
          <div className="card stat">
            <div className="stat-head"><Timer size={16} /><span>Uptime</span></div>
            <div className="stat-value">{uptime(stats.uptime_seconds)}</div>
            <div className="muted small">Docker VM on this Mac</div>
          </div>
        </section>
      )}

      <section className="grid two">
        <div className="card">
          <div className="card-head">
            <h2>FRIDAY models</h2>
            <button className="ghost" onClick={onOpenFriday}><Bot size={15} /> Open FRIDAY</button>
          </div>
          <ul className="list">
            {provs.map(p => (
              <li key={p.id}>
                <span className={`dot ${p.available ? 'on' : ''}`} />
                <span>{p.label}</span>
                <span className="muted mono small">{p.model}</span>
                <span className="muted small right">{p.available ? 'ready' : 'no key'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-head"><h2>Token usage</h2></div>
          {usage.length === 0 ? <p className="muted small">No replies yet.</p> : (
            <table>
              <thead><tr><th>Model</th><th>Replies</th><th>In</th><th>Out</th><th>Avg latency</th></tr></thead>
              <tbody>
                {usage.map(u => (
                  <tr key={`${u.provider}-${u.model}`}>
                    <td className="mono small">{u.model}</td>
                    <td>{u.replies}</td>
                    <td>{u.input_tokens.toLocaleString()}</td>
                    <td>{u.output_tokens.toLocaleString()}</td>
                    <td>{u.avg_latency_ms != null ? `${(u.avg_latency_ms / 1000).toFixed(1)}s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
