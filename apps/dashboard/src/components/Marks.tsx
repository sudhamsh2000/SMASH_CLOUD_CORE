// Identity marks for the three systems. They share one drawing language:
// thin strokes and a single wave, echoing FRIDAY's light field.

export function SmashMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="smash-g" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0" stopColor="#74B8FF" />
          <stop offset="1" stopColor="#C2A6FF" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="8.25" fill="#10141C" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <path d="M6 15.5c2.2 0 2.9-5 5.3-5s2.8 7 5.4 7 3-4.5 5.3-4.5" stroke="url(#smash-g)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function FridayMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="friday-g" x1="0" y1="0" x2="20" y2="0">
          <stop offset="0" stopColor="#74B8FF" />
          <stop offset="1" stopColor="#C2A6FF" />
        </linearGradient>
      </defs>
      <path d="M2 10c2 0 2.6-4 4.6-4S9 14 11 14s2.4-6 4.4-6S17.4 10 18 10" stroke="url(#friday-g)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 13c2.4 0 3.2-2 5-2s3 2 5 2 3.4-2 6-2" stroke="url(#friday-g)" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function VeronicaMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" stroke="rgba(194,166,255,0.35)" strokeWidth="1.2" />
      <path d="M4.5 6.5c2.5 0 3.4 6.5 5.5 6.5s3-2.7 5.5-3" stroke="#C2A6FF" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.5" cy="10" r="1.3" fill="#C2A6FF" />
    </svg>
  )
}
