import { createContext, useContext } from 'react'
import { getToken, me, UnauthorizedError } from './api'

// Where the dashboard stands with the SMASH backend behind the gateway.
//  offline     no answer from /api: the dashboard runs on sample data
//  signed-out  backend is up but there is no valid session
//  ready       signed in; FRIDAY talks to real models
export type BackendStatus = 'checking' | 'offline' | 'signed-out' | 'ready'

export type Backend = {
  status: BackendStatus
  user: string | null
  signedIn: (user: string) => void
  signOut: () => void
  recheck: () => void
}

export const BackendContext = createContext<Backend>({
  status: 'offline',
  user: null,
  signedIn: () => {},
  signOut: () => {},
  recheck: () => {},
})

export const useBackend = () => useContext(BackendContext)

export async function probeBackend(): Promise<{ status: BackendStatus; user: string | null }> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return { status: 'offline', user: null }
  } catch {
    return { status: 'offline', user: null }
  }
  if (!getToken()) return { status: 'signed-out', user: null }
  try {
    const { username } = await me()
    return { status: 'ready', user: username }
  } catch (e) {
    return { status: e instanceof UnauthorizedError ? 'signed-out' : 'offline', user: null }
  }
}
