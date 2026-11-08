// 页面通用积木：面板、标题、字段、选项芯片、空状态
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { spring } from '../motion'

export function Panel({ children, className = '', cut = false }: { children: ReactNode; className?: string; cut?: boolean }): JSX.Element {
  return <div className={`panel rounded-xl ${cut ? 'panel-cut rounded-none' : ''} ${className}`}>{children}</div>
}

export function SectionTitle({ tag, title, right, className = '' }: { tag: string; title: string; right?: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className}`}>
      <div>
        <div className="tag-orange">{tag}</div>
        <h3 className="mt-1 font-display text-[20px] font-semibold tracking-wide text-chalk">{title}</h3>
      </div>
      {right}
    </div>
  )
}

export function PageHeader({ tag, title, sub, right }: { tag: string; title: string; sub?: string; right?: ReactNode }): JSX.Element {
  return (
    <div className="page-header mb-7 flex items-end justify-between gap-6">
      <div>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={spring.page} className="flex items-center gap-3">
          <span className="h-[3px] w-8 bg-hoop shadow-[0_0_12px_rgba(255,107,32,0.8)]" />
          <span className="tag-orange">{tag}</span>
        </motion.div>
        <h1 className="mt-2 font-display text-[44px] font-bold uppercase leading-none tracking-wide text-chalk">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-silver/65">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }): JSX.Element {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-label text-[12px] font-bold uppercase tracking-[0.14em] text-silver/80">{label}</span>
        {hint && <span className="text-[11px] text-silver/45">{hint}</span>}
      </div>
      {children}
      {error && <div className="mt-1 text-[12px] text-[#ff8b82]">{error}</div>}
    </label>
  )
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  size = 'md'
}: {
  options: Array<{ id: T; label: string; sub?: string }>
  value: T | null
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
}): JSX.Element {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <motion.button
            key={String(o.id)}
            type="button"
            onClick={() => onChange(o.id)}
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            transition={spring.press}
            className={`relative rounded-md border text-left transition-colors duration-200 ${size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-3.5 py-2 text-[13px]'} ${
              active ? 'border-hoop bg-hoop/15 text-chalk shadow-[0_0_0_1px_rgba(255,107,32,0.4),0_8px_20px_-10px_rgba(255,107,32,0.8)]' : 'border-white/10 bg-white/[0.03] text-silver/80 hover:border-white/25 hover:text-chalk'
            }`}
          >
            <div className="font-semibold">{o.label}</div>
            {o.sub && <div className={`mt-0.5 text-[11px] ${active ? 'text-hoop' : 'text-silver/45'}`}>{o.sub}</div>}
          </motion.button>
        )
      })}
    </div>
  )
}

export function NumberInput({ value, onChange, min, max, step = 1, placeholder, className = '' }: { value: number | ''; onChange: (v: number | '') => void; min?: number; max?: number; step?: number; placeholder?: string; className?: string }): JSX.Element {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`field mono ${className}`}
      value={value}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text: string; action?: ReactNode }): JSX.Element {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.page} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-hoop/80">{icon}</div>}
      <div className="font-display text-[18px] font-semibold text-chalk">{title}</div>
      <p className="mt-1.5 max-w-sm text-[13px] text-silver/60">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function StatTile({ label, value, sub, accent = false }: { label: string; value: ReactNode; sub?: string; accent?: boolean }): JSX.Element {
  return (
    <div className="rounded-lg bg-black/25 px-4 py-3 ring-1 ring-inset ring-white/[0.05]">
      <div className="tag text-[10px]">{label}</div>
      <div className={`num mt-1 text-[28px] font-bold leading-none ${accent ? 'text-hoop' : 'text-chalk'}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-silver/50">{sub}</div>}
    </div>
  )
}

export function SourceTag({ source }: { source: 'tested' | 'mixed' | 'estimated' }): JSX.Element {
  const m = { tested: ['已测试', 'text-win bg-win/10'], mixed: ['部分测试', 'text-champ bg-champ/10'], estimated: ['预估', 'text-silver/70 bg-white/5'] }[source]
  return <span className={`rounded px-1.5 py-0.5 font-label text-[10px] font-bold tracking-wider ${m[1]}`}>{m[0]}</span>
}
