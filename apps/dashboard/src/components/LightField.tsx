import { useEffect, useRef } from 'react'

export type FieldState = 'idle' | 'typing' | 'thinking'

const ENERGY: Record<FieldState, number> = { idle: 0.55, typing: 1.1, thinking: 1.9 }
const LINES = 36

// A field of thin wave lines receding in perspective. FRIDAY's only visual
// form: it breathes at rest, lifts while you type, and brightens while thinking.
export function LightField({ state }: { state: FieldState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef(ENERGY.idle)

  useEffect(() => {
    target.current = ENERGY[state]
  }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0
    let t = 2.4
    let energy = target.current
    let last = performance.now()
    let onScreen = true

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      if (!w || !h) return
      ctx.globalCompositeOperation = 'lighter'

      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, 'rgba(116,184,255,0)')
      grad.addColorStop(0.32, 'rgba(116,184,255,1)')
      grad.addColorStop(0.7, 'rgba(194,166,255,1)')
      grad.addColorStop(1, 'rgba(194,166,255,0)')
      ctx.strokeStyle = grad

      const lift = 0.75 + energy * 0.3
      for (let i = 0; i < LINES; i++) {
        const p = i / (LINES - 1) // 0 = far, 1 = near
        const depth = 0.3 + p * 0.7
        const baseY = h * (0.26 + p * 0.5)
        const amp = h * 0.17 * depth * lift
        const phase = p * 2.6

        ctx.beginPath()
        for (let x = 0; x <= w + 4; x += 4) {
          const u = x / w
          const env = Math.exp(-(((u - 0.66) / 0.34) ** 2))
          const wave =
            Math.sin(u * 5.4 + t * 0.55 + phase) * 0.6 +
            Math.sin(u * 9.3 - t * 0.8 + phase * 1.7) * 0.22 +
            Math.sin(u * 2.1 + t * 0.3) * 0.38
          const y = baseY + amp * env * wave
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const alpha = Math.min(1, (0.1 + Math.sin(p * Math.PI) ** 1.3 * 0.8) * (0.7 + energy * 0.3))
        // A wide, faint pass under the nearer lines gives them soft bloom.
        if (p > 0.45) {
          ctx.globalAlpha = alpha * 0.08
          ctx.lineWidth = 6
          ctx.stroke()
        }
        ctx.globalAlpha = alpha
        ctx.lineWidth = 0.6 + p * 0.8
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      energy += (target.current - energy) * Math.min(dt * 2.2, 1)
      t += dt * (0.22 + energy * 0.32)
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (reduced || raf || !onScreen || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) start()
      else stop()
    })
    io.observe(canvas)
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    start()
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="lightfield" aria-hidden="true" />
}
