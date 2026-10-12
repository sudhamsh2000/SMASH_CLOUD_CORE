import { useState, type FormEvent } from 'react'
import { login } from '../lib/api'

export default function Login({ onLogin }: { onLogin: (user: string) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onLogin(await login(username, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login card" onSubmit={submit}>
        <div className="brand big">
          <span className="brand-mark" aria-hidden>▲</span>
          <span>SMASH<span className="muted"> Cloud</span></span>
        </div>
        <p className="muted small">Sign in with the owner account from your .env file.</p>
        <label>
          <span>Username</span>
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
