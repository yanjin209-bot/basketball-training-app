import { useId } from 'react'
import { BADGE_MAP, TIER_META, type BadgeDef } from '@shared/config/badges'

const SHAPES: Record<BadgeDef['shape'], string> = {
  hex: 'M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z',
  shield: 'M50 4 L88 16 L88 50 C88 74 70 88 50 96 C30 88 12 74 12 50 L12 16 Z',
  circle: 'M50 4 A46 46 0 1 1 49.99 4 Z',
  diamond: 'M50 3 L95 50 L50 97 L5 50 Z',
  octagon: 'M31 5 L69 5 L95 31 L95 69 L69 95 L31 95 L5 69 L5 31 Z'
}

const GLYPHS: Record<BadgeDef['glyph'], JSX.Element> = {
  flame: <path d="M12 1.5c1.2 4.2 5.6 5.8 5.6 11.1a5.6 5.6 0 0 1-11.2 0c0-2.4 1.1-4 2.3-5.1 0 2.1.9 3.3 2.1 3.4.2-3.4-1.1-5.6 1.2-9.4z" />,
  target: (
    <g fill="none" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </g>
  ),
  orbit: (
    <g fill="none" strokeWidth="1.8">
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-25 12 12)" />
      <circle cx="21" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
    </g>
  ),
  bolt: <path d="M13.5 1.5 4 13.5h6.3L9 22.5l10-12.6h-6.4z" />,
  shield: (
    <g>
      <path d="M12 2 4 5v6c0 5.2 3.4 9.2 8 11 4.6-1.8 8-5.8 8-11V5z" />
      <path d="M8.2 11.8 11 14.6l5-5.2" fill="none" stroke="#0b0d11" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  chain: (
    <g fill="none" strokeWidth="2.4" strokeLinecap="round">
      <rect x="2.5" y="8" width="11" height="8" rx="4" />
      <rect x="10.5" y="8" width="11" height="8" rx="4" />
    </g>
  ),
  crown: <path d="M2.5 7.5 7 11.5l5-7 5 7 4.5-4L19.5 19h-15zM4.5 20.5h15v1.6h-15z" />,
  star: <path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7z" />,
  laurel: (
    <g>
      <circle cx="12" cy="10" r="4.2" />
      <path d="M5 6c-2 4-1 9 3.5 12M19 6c2 4 1 9-3.5 12" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.2 9.2l2.3.4M4.6 13l2.3-.2M6.4 16.2l2-.9M19.8 9.2l-2.3.4M19.4 13l-2.3-.2M17.6 16.2l-2-.9" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

interface Props {
  badgeId: string
  tier: number // 0 = 未解锁
  size?: number
  className?: string
}

/** 原创徽章：形状 × 图案 × 金属等级色，未解锁时灰暗 */
export function BadgeEmblem({ badgeId, tier, size = 88, className = '' }: Props): JSX.Element {
  const uid = useId().replace(/:/g, '')
  const def = BADGE_MAP[badgeId]
  const locked = tier <= 0
  const meta = TIER_META[Math.max(0, Math.min(3, (tier || 1) - 1))]
  const base = locked ? '#3a404a' : meta.color
  const g = (n: string): string => `${n}-${uid}`
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={locked ? { filter: 'grayscale(1)' } : undefined} aria-label={`${def?.name ?? ''}徽章`}>
      <defs>
        <linearGradient id={g('metal')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={locked ? 0.15 : 0.85} />
          <stop offset="0.25" stopColor={base} />
          <stop offset="0.7" stopColor={base} stopOpacity="0.85" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={g('inner')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2129" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>
        <linearGradient id={g('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity={locked ? 0.05 : 0.35} />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {!locked && <path d={SHAPES[def?.shape ?? 'hex']} fill={meta.glow} transform="translate(50 52) scale(1.06) translate(-50 -50)" opacity="0.5" style={{ filter: 'blur(4px)' }} />}
      <path d={SHAPES[def?.shape ?? 'hex']} fill={`url(#${g('metal')})`} />
      <path d={SHAPES[def?.shape ?? 'hex']} fill={`url(#${g('inner')})`} transform="translate(50 50) scale(0.82) translate(-50 -50)" />
      <path d={SHAPES[def?.shape ?? 'hex']} fill="none" stroke={base} strokeOpacity={locked ? 0.4 : 0.9} strokeWidth="1.4" transform="translate(50 50) scale(0.74) translate(-50 -50)" />
      <g transform="translate(29 28) scale(1.75)" fill={locked ? '#59606b' : base} stroke={locked ? '#59606b' : base} color={locked ? '#59606b' : base}>
        {GLYPHS[def?.glyph ?? 'star']}
      </g>
      {tier >= 4 && (
        <g fill="#FFE2A3">
          <path d="M50 1.5 52 6 50 10.5 48 6Z" />
        </g>
      )}
      <path d={SHAPES[def?.shape ?? 'hex']} fill={`url(#${g('sheen')})`} />
      {/* 等级星标 */}
      {!locked && (
        <g transform="translate(50 86)">
          {Array.from({ length: tier }).map((_, i) => (
            <circle key={i} cx={(i - (tier - 1) / 2) * 6} cy="0" r="1.8" fill="#fff" opacity="0.9" />
          ))}
        </g>
      )}
    </svg>
  )
}
