import { useState } from 'react'
import { login, UnauthorizedError } from '../lib/api'
import { useBackend } from '../lib/backend'
import { LightField } from './LightField'
import { SmashMark } from './Marks'

export function SignIn() {
  const { signedIn } = useBackend()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <main className="signin">
      <div className="signin-field" aria-hidden="true">
        <LightField state={busy ? 'thinking' : 'idle'} />
      </div>
      <form
        className="signin-card"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            signedIn(await login(username.trim(), password))
          } catch (err) {
            setError(err instanceof UnauthorizedError
              ? 'That username and password don’t match. Check SMASH_ADMIN_USERNAME and SMASH_ADMIN_PASSWORD in your .env file.'
              : `Couldn’t sign in: ${(err as Error).message}`)
            setBusy(false)
          }
        }}
      >
        <div className="brand signin-brand">
          <SmashMark />
          <div className="brand-text">
            <span className="brand-name">SMASH</span>
            <span className="brand-sub">PRIVATE COMPUTING ENVIRONMENT</span>
          </div>
        </div>
        <h1 className="signin-title">Sign in to smash-01</h1>
        <p className="signin-sub">Use the admin account from your .env file.</p>

        <label className="field">
          <span>Username</span>
          <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="signin-error" role="alert">{error}</p>}
        <button className="btn btn--primary signin-btn" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
