import { useState } from 'react'
import { Header } from '../components/Header'
import { Panel, Segmented, Toggle } from '../components/ui'
import { useBackend } from '../lib/backend'
import type { PageProps } from './types'

const modelOptions = ['Auto', 'GPT', 'Claude', 'Local'] as const

export default function SettingsPage({ go, notify, openNav }: PageProps) {
  const backend = useBackend()
  const [model, setModel] = useState<(typeof modelOptions)[number]>('Auto')
  const [s, setS] = useState({ memory: true, voice: true, ddns: true, twoStep: true, alerts: true, offsite: true })
  const flip = (key: keyof typeof s, label: string) => (on: boolean) => {
    setS((prev) => ({ ...prev, [key]: on }))
    notify(`${label} turned ${on ? 'on' : 'off'}`)
  }

  const row = (k: keyof typeof s, title: string, detail: string) => (
    <li className="setting" key={k}>
      <span className="setting-text">
        <span className="setting-title">{title}</span>
        <span className="setting-detail">{detail}</span>
      </span>
      <Toggle on={s[k]} onChange={flip(k, title)} label={title} />
    </li>
  )

  return (
    <>
      <Header title="Settings" subtitle="How SMASH Cloud, FRIDAY and VERONICA behave for you." onOpenNav={openNav} onNavigate={go} />

      <div className="grid-2">
        <Panel title="Profile">
          <div className="profile-card">
            <span className="avatar avatar--lg" aria-hidden="true">S</span>
            <span className="setting-text">
              <span className="setting-title">{backend.user ?? 'Sudhamsh'}</span>
              <span className="setting-detail">
                {backend.status === 'ready' ? 'Signed in to smash-01' : 'Backend offline, so nothing is signed in'}
              </span>
            </span>
            {backend.status === 'ready' && (
              <button className="btn btn--ghost profile-signout" onClick={backend.signOut}>
                Sign out
              </button>
            )}
          </div>
        </Panel>

        <Panel title="FRIDAY">
          <div className="setting setting--stack">
            <span className="setting-text">
              <span className="setting-title">Default model</span>
              <span className="setting-detail">Auto picks a model for each request. You can still switch in any conversation.</span>
            </span>
            <Segmented options={modelOptions} value={model} onChange={(m) => { setModel(m); notify(`FRIDAY will use ${m} by default`) }} label="Default model" />
          </div>
          <ul className="settings-list">
            {row('memory', 'Remember conversations', 'FRIDAY keeps context across conversations, stored on smash-01.')}
            {row('voice', 'Voice input', 'Speak to FRIDAY with the microphone button.')}
          </ul>
        </Panel>

        <Panel title="Network">
          <ul className="settings-list">
            {row('ddns', 'Keep my domain up to date', 'Updates your dynamic DNS when your home IP address changes.')}
            {row('offsite', 'Offsite backups', 'Encrypt and upload nightly backups to remote storage.')}
          </ul>
        </Panel>

        <Panel title="Security">
          <ul className="settings-list">
            {row('twoStep', 'Two-step sign-in', 'Ask for a code from your authenticator app when signing in.')}
            {row('alerts', 'Sign-in alerts', 'Tell me when a new device signs in.')}
          </ul>
        </Panel>
      </div>
    </>
  )
}
