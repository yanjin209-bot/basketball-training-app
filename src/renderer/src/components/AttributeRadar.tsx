import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { ATTR_KEYS, ATTR_META } from '@shared/config/career'
import type { AttrMap } from '@shared/types'

export function AttributeRadar({ attrs, compare, height = 300, animate = true }: { attrs: AttrMap; compare?: AttrMap; height?: number; animate?: boolean }): JSX.Element {
  const data = ATTR_KEYS.map((k) => ({ key: ATTR_META[k].name, v: attrs[k], c: compare?.[k] ?? 0 }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6B20" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#FF6B20" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        <PolarGrid stroke="rgba(187,195,207,0.14)" />
        <PolarAngleAxis dataKey="key" tick={{ fill: '#BBC3CF', fontSize: 13, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 99]} tick={false} axisLine={false} />
        {compare && <Radar dataKey="c" stroke="#BBC3CF" strokeDasharray="4 4" fill="#BBC3CF" fillOpacity={0.08} isAnimationActive={animate} />}
        <Radar dataKey="v" stroke="#FF6B20" strokeWidth={2.5} fill="url(#radar-fill)" dot={{ r: 3.5, fill: '#FF6B20', stroke: '#090B0F', strokeWidth: 2 }} isAnimationActive={animate} animationDuration={700} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
