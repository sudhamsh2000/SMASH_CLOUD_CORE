import { useEffect, useRef, useState } from 'react'
import { CircleCheck, HardDrive, UploadCloud } from 'lucide-react'
import { Header } from '../components/Header'
import { Legend, Meter, Panel, StackBar } from '../components/ui'
import { storage } from '../data'
import type { PageProps } from './types'

export default function StoragePage({ go, notify, openNav }: PageProps) {
  const [backup, setBackup] = useState<number | null>(null)
  const timer = useRef(0)
  const usedGb = storage.categories.reduce((s, c) => s + c.gb, 0)
  const totalGb = storage.totalTb * 1000

  useEffect(() => () => clearInterval(timer.current), [])

  // Simulated manual backup so the action shows its progress.
  const backUpNow = () => {
    if (backup !== null) return
    setBackup(0)
    timer.current = window.setInterval(() => {
      setBackup((p) => {
        const next = (p ?? 0) + 7
        if (next >= 100) {
          clearInterval(timer.current)
          notify('Backup complete')
          return null
        }
        return next
      })
    }, 180)
  }

  return (
    <>
      <Header title="Storage" subtitle={`${(usedGb / 1000).toFixed(2)} TB used of ${storage.totalTb} TB, across two volumes.`} onOpenNav={openNav} onNavigate={go}>
        <div className="header-actions">
          <button className="btn btn--primary" onClick={backUpNow} disabled={backup !== null}>
            <UploadCloud size={15} strokeWidth={1.75} />
            {backup === null ? 'Back up now' : `Backing up, ${backup}%`}
          </button>
        </div>
      </Header>

      <Panel title="What’s using space" sub={`${((totalGb - usedGb) / 1000).toFixed(2)} TB free`}>
        <StackBar parts={storage.categories.map((c) => ({ label: c.label, value: c.gb, color: c.color }))} total={totalGb} />
        <Legend items={storage.categories.map((c) => ({ label: c.label, value: `${c.gb} GB`, color: c.color }))} />
      </Panel>

      <div className="grid-2">
        {storage.volumes.map((vol) => (
          <Panel key={vol.name} title={vol.name} sub={vol.detail} action={<span className="chip chip--mint"><span className="dot" aria-hidden="true" />{vol.health}</span>}>
            <div className="big-reading">
              <span className="metric-value metric-value--xl">{vol.usedTb}<span className="unit"> TB of {vol.totalTb} TB</span></span>
              <span className="muted"><HardDrive size={13} strokeWidth={1.5} /> {vol.temp}</span>
            </div>
            <Meter value={vol.usedTb} max={vol.totalTb} tone="blue" />
          </Panel>
        ))}
      </div>

      <Panel
        title="Backups"
        sub="Nightly at 02:00, kept for 30 days. Offsite copies are encrypted before upload."
        action={<button className="text-btn" onClick={() => go('automations')}>Change schedule</button>}
        className="panel--flush"
      >
        {backup !== null && (
          <div className="backup-live">
            <span>Backing up PostgreSQL and files</span>
            <Meter value={backup} tone="mint" />
          </div>
        )}
        <div className="table table--backups" role="table" aria-label="Recent backups">
          <div className="tr th" role="row">
            <span role="columnheader">What</span>
            <span role="columnheader">Where</span>
            <span role="columnheader">Size</span>
            <span role="columnheader">When</span>
            <span role="columnheader">Result</span>
          </div>
          {storage.backups.map((b, i) => (
            <div className="tr" role="row" key={i}>
              <span role="cell" className="strong">{b.what}</span>
              <span role="cell" className="muted-cell">{b.where}</span>
              <span role="cell" className="num">{b.size}</span>
              <span role="cell" className="num muted-cell">{b.when}</span>
              <span role="cell" className="ok-cell"><CircleCheck size={14} strokeWidth={1.75} /> Completed</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
