import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { Sparkline } from '../components/Sparkline'
import { Legend, Meter, Panel, StackBar } from '../components/ui'
import { applications, compute, metrics } from '../data'
import type { PageProps } from './types'

export default function ComputePage({ go, openNav }: PageProps) {
  // Per-core load drifts gently, like the overview's CPU card (sample data).
  const [cores, setCores] = useState(compute.cores)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setCores((c) => c.map((v) => Math.max(4, Math.min(60, v + Math.round((Math.random() - 0.5) * 10)))))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const cpu = Math.round(cores.reduce((s, v) => s + v, 0) / cores.length)
  const used = compute.memory.reduce((s, m) => s + m.gb, 0)
  const free = metrics.memory.totalGb - used
  const top = [...applications].sort((a, b) => b.cpu - a.cpu).slice(0, 6)
  const { gpu } = compute

  return (
    <>
      <Header title="Compute" subtitle={`smash-01, up for ${compute.uptime}.`} onOpenNav={openNav} onNavigate={go} />

      <div className="grid-2">
        <Panel title="Processor" sub={`${compute.model}, ${compute.clock}`} action={<span className="chip">{compute.temperature} °C</span>}>
          <div className="big-reading">
            <span className="metric-value metric-value--xl">{cpu}<span className="unit">%</span></span>
            <span className="muted">Load average {compute.load.join(', ')}</span>
          </div>
          <ul className="cores" aria-label="Load per core">
            {cores.map((v, i) => (
              <li key={i}>
                <span className="core-bar" aria-hidden="true"><span style={{ transform: `scaleY(${v / 100})` }} /></span>
                <span className="core-label">{i + 1}</span>
                <span className="sr-only">Core {i + 1}: {v}%</span>
              </li>
            ))}
          </ul>
          <Sparkline values={metrics.cpu.series} min={0} max={50} />
        </Panel>

        <Panel title="Memory" sub={`${metrics.memory.totalGb} GB DDR5`}>
          <div className="big-reading">
            <span className="metric-value metric-value--xl">{used.toFixed(1)}<span className="unit"> GB used</span></span>
            <span className="muted">{free.toFixed(1)} GB available</span>
          </div>
          <StackBar parts={compute.memory.map((m) => ({ label: m.label, value: m.gb, color: m.color }))} total={metrics.memory.totalGb} />
          <Legend
            items={[
              ...compute.memory.map((m) => ({ label: m.label, value: `${m.gb} GB`, color: m.color })),
              { label: 'Available', value: `${free.toFixed(1)} GB`, color: 'rgba(255,255,255,0.08)' },
            ]}
          />
        </Panel>
      </div>

      <div className="grid-2 grid-2--wide-left">
        <Panel title="Busiest services" sub="Sorted by CPU use right now." className="panel--flush">
          <div className="table table--procs" role="table" aria-label="Busiest services">
            <div className="tr th" role="row">
              <span role="columnheader">Service</span>
              <span role="columnheader">CPU</span>
              <span role="columnheader"><span className="sr-only">CPU share</span></span>
              <span role="columnheader">Memory</span>
            </div>
            {top.map((a) => (
              <div className="tr" role="row" key={a.id}>
                <span role="cell" className="strong">{a.name}</span>
                <span role="cell" className="num">{a.cpu.toFixed(1)}%</span>
                <span role="cell"><Meter value={a.cpu} max={10} tone={a.id === 'veronica-trainer' ? 'violet' : 'blue'} /></span>
                <span role="cell" className="num muted-cell">{a.memory}</span>
              </div>
            ))}
          </div>
          <div className="panel-foot">
            <button className="text-btn" onClick={() => go('applications')}>See all applications</button>
          </div>
        </Panel>

        <Panel title="GPU" sub={gpu.name} action={<button className="text-btn" onClick={() => go('ai-lab')}>Open AI Lab</button>}>
          <div className="gpu-grid">
            <div>
              <span className="mini-label">Utilization</span>
              <span className="mini-value">{gpu.util}%</span>
              <Meter value={gpu.util} tone="violet" />
            </div>
            <div>
              <span className="mini-label">Memory</span>
              <span className="mini-value">{gpu.vramUsed} <span className="unit">of {gpu.vramTotal} GB</span></span>
              <Meter value={gpu.vramUsed} max={gpu.vramTotal} tone="blue" />
            </div>
          </div>
          <p className="note">In use by VERONICA training. Local FRIDAY models share it at lower priority.</p>
        </Panel>
      </div>
    </>
  )
}
