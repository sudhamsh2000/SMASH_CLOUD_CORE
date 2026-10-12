import type { PointerEvent } from 'react'

export function toPoints(values: number[], width: number, height: number, min?: number, max?: number) {
  const lo = min ?? Math.min(...values)
  const hi = max ?? Math.max(...values)
  const span = hi - lo || 1
  const pad = 2
  return values.map((v, i) => [
    (i / (values.length - 1)) * width,
    pad + (1 - (v - lo) / span) * (height - pad * 2),
  ])
}

// Smooth path through points (Catmull-Rom converted to cubic Béziers).
export function smoothPath(pts: number[][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[i + 2] ?? pts[i + 1]
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
  }
  return d
}

// Soft illumination that follows the pointer across a surface.
export const trackGlow = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}
