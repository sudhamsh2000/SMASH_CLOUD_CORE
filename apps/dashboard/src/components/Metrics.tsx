import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Boxes, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { metrics } from '../data'
import { Sparkline } from './Sparkline'
import { trackGlow } from '../lib/chart'

function Metric(props: { onOpen: () => void; icon: ReactNode; label: string; value: ReactNode; detail: ReactNode; series: number[]; color?: string; min?: number; max?: number }) {
  return (
    <button className="metric glow" onPointerMove={trackGlow} onClick={props.onOpen}>
      <span className="metric-label">
        {props.icon}
        {props.label}
      </span>
      <span className="metric-value">{props.value}</span>
      <span className="metric-detail">{props.detail}</span>
      <Sparkline values={props.series} color={props.color} min={props.min} max={props.max} />
    </button>
  )
}

export function Metrics({ onNavigate }: { onNavigate: (page: string) => void }) {
  // The CPU reading drifts gently so the overview feels live (sample data).
  const [cpu, setCpu] = useState(metrics.cpu.series)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setCpu((s) => {
        const next = Math.max(12, Math.min(42, s[s.length - 1] + Math.round((Math.random() - 0.5) * 8)))
        return [...s.slice(1), next]
      })
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const { memory, storage, services } = metrics
  const icon = { size: 15, strokeWidth: 1.5 }

  return (
    <section className="section" aria-labelledby="system-title">
      <div className="section-head">
        <h2 id="system-title" className="section-title">System</h2>
        <span className="sample-tag">Sample readings</span>
      </div>
      <div className="metrics">
        <Metric
          onOpen={() => onNavigate('compute')}
          icon={<Cpu {...icon} />}
          label="Compute"
          value={<>{cpu[cpu.length - 1]}<span className="unit">%</span></>}
          detail={metrics.cpu.detail}
          series={cpu}
          min={0}
          max={50}
        />
        <Metric
          onOpen={() => onNavigate('compute')}
          icon={<MemoryStick {...icon} />}
          label="Memory"
          value={<>{memory.usedGb}<span className="unit"> GB</span></>}
          detail={`${(memory.totalGb - memory.usedGb).toFixed(1)} GB available of ${memory.totalGb}`}
          series={memory.series}
          color="var(--blue)"
        />
        <Metric
          onOpen={() => onNavigate('storage')}
          icon={<HardDrive {...icon} />}
          label="Storage"
          value={<>{storage.usedTb}<span className="unit"> TB</span></>}
          detail={`${(storage.totalTb - storage.usedTb).toFixed(2)} TB free of ${storage.totalTb} TB`}
          series={storage.series}
          color="var(--blue)"
        />
        <Metric
          onOpen={() => onNavigate('applications')}
          icon={<Boxes {...icon} />}
          label="Services"
          value={<>{services.running}<span className="unit"> running</span></>}
          detail={<><span className="ok-text">All healthy</span>, {services.total} of {services.total}</>}
          series={services.series}
          color="var(--mint)"
        />
      </div>
    </section>
  )
}
