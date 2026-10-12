import { useId } from 'react'
import { smoothPath, toPoints } from '../lib/chart'

type Props = { values: number[]; width?: number; height?: number; color?: string; min?: number; max?: number }

export function Sparkline({ values, width = 200, height = 36, color = 'var(--violet)', min, max }: Props) {
  const id = useId()
  const pts = toPoints(values, width, height, min, max)
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.16" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} className="spark-area" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.25" pathLength={1} className="draw" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} className="spark-dot" />
    </svg>
  )
}
