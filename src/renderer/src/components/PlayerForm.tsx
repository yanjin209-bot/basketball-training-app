// 球员资料表单片段（创建流程与编辑资料共用）
import { motion } from 'motion/react'
import { useRef } from 'react'
import { ATTR_KEYS, ATTR_META, HANDS, PLAY_STYLES, POSITIONS } from '@shared/config/career'
import type { PlayerInput } from '@shared/types'
import { Icon } from '../art/icons'
import { loadAvatar } from '../lib/image'
import { errMsg } from '../lib/format'
import { spring } from '../motion'
import { useApp } from '../store/app'
import { Chips, Field, NumberInput } from './ui'

export type Draft = Omit<PlayerInput, 'jersey' | 'heightCm' | 'weightKg'> & { jersey: number | ''; heightCm: number | ''; weightKg: number | '' }

export const emptyDraft = (): Draft => ({
  nickname: '',
  jersey: 23,
  heightCm: 180,
  weightKg: 72,
  hand: 'right',
  position: 'SG',
  style: 'allround',
  avatar: null,
  estimates: { shooting: 50, dribbling: 50, finishing: 50, defense: 50, athleticism: 50, iq: 50 }
})

export function toInput(d: Draft): PlayerInput {
  return { ...d, nickname: d.nickname.trim(), jersey: Number(d.jersey), heightCm: Number(d.heightCm), weightKg: Number(d.weightKg) }
}

type SetFn = (patch: Partial<Draft>) => void

export function IdentityFields({ d, set }: { d: Draft; set: SetFn }): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useApp((s) => s.toast)
  return (
    <div className="space-y-5">
      <Field label="昵称 / NICKNAME" hint="1–16 个字符">
        <input className="field text-[18px] font-semibold" maxLength={16} value={d.nickname} autoFocus placeholder="例如：闪电阿杰" onChange={(e) => set({ nickname: e.target.value })} />
      </Field>
      <Field label="球衣号码 / JERSEY" hint="0–99">
        <NumberInput value={d.jersey} min={0} max={99} onChange={(v) => set({ jersey: v === '' ? '' : Math.max(0, Math.min(99, Math.round(v))) })} className="text-[18px]" />
      </Field>
      <Field label="自定义头像 / AVATAR" hint="可选，自动裁剪为正方形">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
            {d.avatar ? <img src={d.avatar} alt="" className="h-full w-full object-cover" /> : <Icon.player width={26} height={26} className="text-silver/40" />}
          </div>
          <motion.button type="button" whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.95 }} transition={spring.press} onClick={() => fileRef.current?.click()} className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-chalk hover:border-hoop/60">
            选择图片
          </motion.button>
          {d.avatar && (
            <button type="button" className="text-[12px] text-silver/60 hover:text-chalk" onClick={() => set({ avatar: null })}>
              移除
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                set({ avatar: await loadAvatar(f) })
              } catch (err) {
                toast({ tone: 'error', title: '头像上传失败', detail: errMsg(err) })
              }
            }}
          />
        </div>
      </Field>
    </div>
  )
}

export function BodyFields({ d, set }: { d: Draft; set: SetFn }): JSX.Element {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="身高 / HEIGHT" hint="厘米 120–240">
          <NumberInput value={d.heightCm} min={120} max={240} onChange={(v) => set({ heightCm: v })} className="text-[18px]" />
        </Field>
        <Field label="体重 / WEIGHT" hint="公斤 30–180">
          <NumberInput value={d.weightKg} min={30} max={180} onChange={(v) => set({ weightKg: v })} className="text-[18px]" />
        </Field>
      </div>
      <Field label="惯用手 / HAND">
        <Chips options={HANDS.map((h) => ({ id: h.id, label: h.name }))} value={d.hand} onChange={(hand) => set({ hand })} />
      </Field>
    </div>
  )
}

export function PositionFields({ d, set }: { d: Draft; set: SetFn }): JSX.Element {
  return (
    <div className="grid grid-cols-5 gap-3">
      {POSITIONS.map((p) => {
        const active = d.position === p.id
        return (
          <motion.button
            key={p.id}
            type="button"
            onClick={() => set({ position: p.id })}
            whileHover={{ y: -6, scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.press}
            className={`relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-xl border transition-colors ${active ? 'border-hoop bg-hoop/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
          >
            {active && <motion.div layoutId="pos-glow" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,107,32,0.35),transparent_70%)]" transition={spring.slide} />}
            <div className={`num relative text-[44px] font-bold leading-none ${active ? 'text-hoop' : 'text-chalk'}`}>{p.id}</div>
            <div className="relative mt-2 text-[13px] text-chalk">{p.name}</div>
            <div className="tag relative mt-1 text-[9px]">{p.en}</div>
          </motion.button>
        )
      })}
    </div>
  )
}

export function StyleFields({ d, set }: { d: Draft; set: SetFn }): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {PLAY_STYLES.map((s) => {
        const active = d.style === s.id
        return (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => set({ style: s.id })}
            whileHover={{ x: 6 }}
            whileTap={{ scale: 0.98 }}
            transition={spring.press}
            className={`relative flex items-center gap-4 overflow-hidden rounded-lg border px-4 py-3 text-left transition-colors ${active ? 'border-hoop bg-hoop/12' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
          >
            {active && <motion.span layoutId="style-bar" className="absolute left-0 top-0 h-full w-1 bg-hoop" transition={spring.slide} />}
            <div className="min-w-[110px]">
              <div className={`font-display text-[17px] font-semibold ${active ? 'text-hoop' : 'text-chalk'}`}>{s.name}</div>
              <div className="tag text-[9px]">{s.en}</div>
            </div>
            <div className="flex-1 text-[13px] text-silver/70">{s.desc}</div>
            <div className="flex gap-1">
              {s.focus.map((f) => (
                <span key={f} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-silver/80">
                  {ATTR_META[f].name}
                </span>
              ))}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

export function EstimateFields({ d, set }: { d: Draft; set: SetFn }): JSX.Element {
  return (
    <div>
      <div className="mb-4 rounded-lg border border-champ/25 bg-champ/[0.06] px-4 py-3 text-[13px] text-champ/90">
        这些是<b>自评预估值</b>，只用于初始展示并会标记为“预估”。完成标准化能力测试后，评分将被真实数据替换。
      </div>
      <div className="space-y-4">
        {ATTR_KEYS.map((k) => (
          <div key={k}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[14px] text-chalk">
                {ATTR_META[k].name} <span className="tag ml-1 text-[9px]">{ATTR_META[k].en}</span>
              </span>
              <span className="num text-[22px] font-bold text-hoop">{d.estimates[k]}</span>
            </div>
            <input
              type="range"
              min={25}
              max={85}
              value={d.estimates[k]}
              onChange={(e) => set({ estimates: { ...d.estimates, [k]: Number(e.target.value) } })}
              className="w-full accent-[#FF6B20]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
