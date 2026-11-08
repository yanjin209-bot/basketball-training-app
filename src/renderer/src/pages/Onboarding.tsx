import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { PLAY_STYLES, POSITIONS } from '@shared/config/career'
import { attrMapOf, computeAttributes, computeOvr } from '@shared/logic/skills'
import { validatePlayer } from '@shared/logic/validation'
import type { Player } from '@shared/types'
import { PlayerArt } from '../art/PlayerArt'
import { Icon } from '../art/icons'
import { BodyFields, EstimateFields, IdentityFields, PositionFields, StyleFields, emptyDraft, toInput, type Draft } from '../components/PlayerForm'
import { api } from '../lib/api'
import { errMsg } from '../lib/format'
import { AnimatedPlayerCard, ElasticButton, spring } from '../motion'
import { useApp } from '../store/app'

const STEPS = [
  { id: 'identity', tag: 'STEP 01', title: '你的球场身份', sub: '昵称与球衣号码会出现在你的球员卡上' },
  { id: 'body', tag: 'STEP 02', title: '身体数据', sub: '用于训练建议与 AI 教练分析' },
  { id: 'position', tag: 'STEP 03', title: '场上位置', sub: '不同位置的 OVR 权重不同' },
  { id: 'style', tag: 'STEP 04', title: '球员打法', sub: '决定 AI 教练的训练侧重' },
  { id: 'estimate', tag: 'STEP 05', title: '能力自评', sub: '初始预估，之后由真实测试取代' }
] as const

export function Onboarding(): JSX.Element {
  const [phase, setPhase] = useState<'intro' | 'form' | 'debut'>('intro')
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [d, setD] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Player | null>(null)
  const toast = useApp((s) => s.toast)
  const set = (patch: Partial<Draft>): void => setD((x) => ({ ...x, ...patch }))

  const stepErrors = (): string[] => {
    const all = validatePlayer(toInput(d))
    const map: Record<string, RegExp> = { identity: /昵称|号码|头像/, body: /身高|体重|惯用手/, position: /位置/, style: /打法/, estimate: /自评/ }
    return all.filter((e) => map[STEPS[step].id].test(e))
  }

  const next = async (): Promise<void> => {
    const errs = stepErrors()
    if (errs.length) {
      toast({ tone: 'error', title: '请检查输入', detail: errs.join('；') })
      return
    }
    if (step < STEPS.length - 1) {
      setDir(1)
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      const r = await api.player.create(toInput(d))
      setCreated(r.data)
      setPhase('debut')
    } catch (e) {
      toast({ tone: 'error', title: '创建失败', detail: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }
  const back = (): void => {
    if (step === 0) return setPhase('intro')
    setDir(-1)
    setStep(step - 1)
  }

  if (phase === 'intro') {
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.18, scale: 1 }} transition={{ duration: 1.2 }} className="num outline-text pointer-events-none absolute select-none text-[42vh] font-bold leading-none">
          RISE
        </motion.div>
        <div className="relative flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, letterSpacing: '1em' }} animate={{ opacity: 1, letterSpacing: '0.5em' }} transition={{ duration: 0.9 }} className="tag-orange text-[13px]">
            YOUR CAREER STARTS NOW
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.15 }} className="mt-4 font-display text-[110px] font-bold leading-none tracking-tight text-chalk">
            COURT<span className="text-hoop">//</span>RISE
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 text-[17px] text-silver/75">
            现实篮球训练 × 生涯养成 × AI 私人教练
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.55 }} className="mt-12">
            <ElasticButton size="xl" iconRight={<Icon.arrow />} onClick={() => setPhase('form')} autoFocus>
              创建我的球员
            </ElasticButton>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 text-[12px] text-silver/45">
            所有数据保存在本机，离线可用
          </motion.div>
        </div>
      </div>
    )
  }

  if (phase === 'debut' && created) {
    const attrs = attrMapOf(computeAttributes(created.estimates, []))
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <motion.div className="absolute h-[2px] w-full bg-gradient-to-r from-transparent via-hoop to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7 }} />
        <div className="relative flex items-center gap-16">
          <motion.div initial={{ opacity: 0, y: 120, rotateY: -60, scale: 0.6 }} animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }} transition={{ ...spring.pop, delay: 0.25 }} style={{ perspective: 1000 }}>
            <AnimatedPlayerCard player={created} ovr={computeOvr(created.position, attrs)} level={1} attrs={attrs} estimated width={330} seasonName="S1" />
          </motion.div>
          <div className="max-w-md">
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.6 }} className="tag-orange text-[13px]">
              WELCOME TO THE LEAGUE
            </motion.div>
            <motion.h2 initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.7 }} className="mt-3 font-display text-[64px] font-bold uppercase leading-none text-chalk">
              {created.nickname}
            </motion.h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-3 text-[16px] text-silver/75">
              #{created.jersey} · {POSITIONS.find((p) => p.id === created.position)?.name} · {PLAY_STYLES.find((p) => p.id === created.style)?.name}
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 text-[14px] leading-relaxed text-silver/60">
              你的球员卡已生成。当前能力为自评预估，去「能力属性」完成标准化测试，让 OVR 变成真实数据。每一次真实训练都会转化为经验值。
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 1.1 }} className="mt-9">
              <ElasticButton size="xl" iconRight={<Icon.arrow />} onClick={() => void useApp.getState().bootstrap()} autoFocus>
                进入生涯大厅
              </ElasticButton>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  const S = STEPS[step]
  const Body = [IdentityFields, BodyFields, PositionFields, StyleFields, EstimateFields][step]
  return (
    <div className="relative flex min-h-0 flex-1 gap-10 px-14 pb-10 pt-4">
      {/* 实时预览 */}
      <div className="relative hidden w-[38%] max-w-[480px] shrink-0 flex-col items-center justify-end lg:flex">
        <div className="num outline-text pointer-events-none absolute top-6 select-none text-[300px] font-bold leading-none">{d.jersey === '' ? '—' : d.jersey}</div>
        <motion.div key={`${d.jersey}${d.hand}`} initial={{ scale: 0.97, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }} transition={spring.pop} className="relative h-[78%] w-full">
          <PlayerArt jersey={d.jersey === '' ? 0 : d.jersey} className="h-full w-full" mirrored={d.hand === 'left'} />
        </motion.div>
        <div className="relative mt-2 text-center">
          <div className="font-display text-[34px] font-bold uppercase leading-none text-chalk">{d.nickname.trim() || 'YOUR NAME'}</div>
          <div className="mt-1.5 text-[13px] text-silver/60">
            {d.position} · {PLAY_STYLES.find((s) => s.id === d.style)?.name}
          </div>
        </div>
      </div>

      {/* 步骤面板 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-hoop" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} style={{ originX: 0 }} transition={spring.fill} />
            </div>
          ))}
        </div>
        <div className="panel panel-cut relative flex min-h-0 flex-1 flex-col overflow-hidden p-8">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (k: number) => ({ x: k * 80, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (k: number) => ({ x: k * -80, opacity: 0 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: spring.page, opacity: { duration: 0.18 } }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="tag-orange">{S.tag}</div>
              <h2 className="mt-1 font-display text-[36px] font-bold text-chalk">{S.title}</h2>
              <p className="mb-7 mt-1 text-[14px] text-silver/60">{S.sub}</p>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <Body d={d} set={set} />
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
            <ElasticButton variant="ghost" icon={<Icon.back width={16} height={16} />} onClick={back}>
              {step === 0 ? '返回' : '上一步'}
            </ElasticButton>
            <ElasticButton size="lg" loading={busy} iconRight={<Icon.arrow width={18} height={18} />} onClick={() => void next()}>
              {step === STEPS.length - 1 ? '生成球员卡' : '下一步'}
            </ElasticButton>
          </div>
        </div>
      </div>
    </div>
  )
}
