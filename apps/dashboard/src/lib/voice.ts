import { useCallback, useEffect, useRef, useState } from 'react'
import { speech, voiceInfo } from './api'
import { useBackend } from './backend'

const AUTO_KEY = 'smash.friday.autoSpeak'

function readAuto() {
  try {
    return localStorage.getItem(AUTO_KEY) === '1'
  } catch {
    return false
  }
}

// Plays a streamed MP3 response. Uses MediaSource so playback starts with the first
// chunk; falls back to buffering the whole clip where MediaSource can't take MP3.
async function play(res: Response, audio: HTMLAudioElement, signal: AbortSignal) {
  if (window.MediaSource && MediaSource.isTypeSupported('audio/mpeg') && res.body) {
    const source = new MediaSource()
    audio.src = URL.createObjectURL(source)
    await new Promise((r) => source.addEventListener('sourceopen', r, { once: true }))
    const buffer = source.addSourceBuffer('audio/mpeg')
    const reader = res.body.getReader()
    let started = false
    for (;;) {
      if (signal.aborted) return
      const { value, done } = await reader.read()
      if (done) break
      buffer.appendBuffer(value)
      await new Promise((r) => buffer.addEventListener('updateend', r, { once: true }))
      if (!started) {
        started = true
        void audio.play().catch(() => {})
      }
    }
    if (source.readyState === 'open') source.endOfStream()
  } else {
    const blob = await res.blob()
    if (signal.aborted) return
    audio.src = URL.createObjectURL(blob)
    await audio.play()
  }
}

export type Voice = {
  available: boolean
  speakingId: number | null
  loadingId: number | null
  error: string | null
  autoSpeak: boolean
  setAutoSpeak: (on: boolean) => void
  speak: (id: number, text: string) => void
  stop: () => void
}

// FRIDAY's voice. `available` is false until ELEVENLABS_API_KEY and
// ELEVENLABS_VOICE_ID are set on the backend.
export function useVoice(): Voice {
  const { status } = useBackend()
  const [available, setAvailable] = useState(false)
  const [speakingId, setSpeakingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoSpeak, setAuto] = useState(readAuto)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (status !== 'ready') return
    voiceInfo()
      .then((v) => setAvailable(v.available))
      .catch(() => setAvailable(false))
  }, [status])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    const a = audioRef.current
    if (a) {
      a.pause()
      if (a.src) URL.revokeObjectURL(a.src)
      a.removeAttribute('src')
    }
    setSpeakingId(null)
    setLoadingId(null)
  }, [])

  useEffect(() => stop, [stop])

  const speak = useCallback(
    (id: number, text: string) => {
      stop()
      if (!text.trim()) return
      const audio = audioRef.current ?? (audioRef.current = new Audio())
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setLoadingId(id)
      audio.onplaying = () => {
        setLoadingId(null)
        setSpeakingId(id)
      }
      audio.onended = () => setSpeakingId((s) => (s === id ? null : s))
      speech(text, controller.signal)
        .then((res) => play(res, audio, controller.signal))
        .catch((e: Error) => {
          if (e.name === 'AbortError') return
          setError(e.message)
          setLoadingId(null)
          setSpeakingId(null)
        })
    },
    [stop],
  )

  const setAutoSpeak = useCallback((on: boolean) => {
    setAuto(on)
    try {
      localStorage.setItem(AUTO_KEY, on ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }, [])

  return { available, speakingId, loadingId, error, autoSpeak, setAutoSpeak, speak, stop }
}
