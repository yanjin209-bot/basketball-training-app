import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ATTR_KEYS, ATTR_META } from '@shared/config/career'
import type { SeasonSummary } from '@shared/types'
import { api } from '../lib/api'
import { errMsg, fmtDateCn } from '../lib/format'
import { ElasticButton, SpringModal, XPProgressBar, spring } from '../motion'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { useApp } from '../store/app'

const gradeColor: Record<SeasonSummary['grade'], string> = { S: 'text-gradient-gold', A: 'text-gradient-orange', B: 'text-gradient-silver', C: 'text-silver', D: 'text-silver/60' }

/** 赛季总结：结束后的游戏化结算画面，也可随时查看进行中的赛季 */
export function SeasonSummaryModal({ index, open, onClose, markSeen }: { index: number | null; open: boolean; onClose: () => void; markSeen?: boolean }): JSX.Element {
  const [s, setS] = useState<SeasonSummary | null>(null)
  const toast = useApp((x) => x.toast)
  useEffect(() => {
    if (!open || index == null) return
    setS(null)
    api.season.summary(index).then(setS).catch((e) => toast({ tone: 'error', title: '赛季数据加载失败', detail: errMsg(e) }))
  }, [open, index, toast])

  const close = async (): Promise<void> => {
    if (markSeen && index != null) {
      await api.season.markSeen(index)
      await useApp.getState().bootstrap()
    }
    onClose()
  }

  return (
    <SpringModal open={open} onClose={close} width={860} tag={s?.complete ? 'SEASON COMPLETE · 赛季结算' : 'SEASON IN PROGRESS · 赛季进行中'} title={s ? s.name : '加载中'}>
      {s && (
        <div>
          <div className="grid grid-cols-[200px_1fr] gap-7">
            <div className="flex flex-col items-center justify-center rounded-xl bg-black/30 py-6 ring-1 ring-inset ring-white/5">
              <div className="tag">赛季评级</div>
              <motion.div initial={{ scale: 0.3, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ ...spring.pop, delay: 0.2 }} className={`num text-[120px] font-bold leading-none ${gradeColor[s.grade]}`}>
                {s.grade}
              </motion.div>
              <div className="mt-1 text-[12px] text-silver/60">
                {fmtDateCn(s.start)} – {fmtDateCn(s.end)}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="tag">赛季等级</span>
                <span className="num text-[26px] font-bold text-hoop">{s.level}</span>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ['训练次数', s.sessions],
                  ['训练分钟', s.minutes],
                  ['赛季 XP', s.xp],
                  ['能力测试', s.testsTaken]
                ].map(([l, v], i) => (
                  <motion.div key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.1 + i * 0.05 }} className="rounded-lg bg-black/25 px-3 py-2.5">
                    <div className="tag text-[10px]">{l}</div>
                    <div className="num mt-1 text-[26px] font-bold text-chalk">{v}</div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {s.goals.map((g) => (
                  <div key={g.key}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="text-silver/80">{g.label}</span>
                      <span className="mono text-chalk">
                        {g.value}/{g.target}
                      </span>
                    </div>
                    <XPProgressBar value={g.value} max={g.target} height={6} color={g.value >= g.target ? 'green' : 'orange'} showShine={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="tag-orange mb-2">技术能力变化 · OVR {s.ovrStart} → {s.ovrEnd}</div>
              <div className="space-y-1.5">
                {ATTR_KEYS.map((k) => {
                  const d = s.attrEnd[k] - s.attrStart[k]
                  return (
                    <div key={k} className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-1.5 text-[13px]">
                      <span className="text-silver/80">{ATTR_META[k].name}</span>
                      <span className="mono">
                        {s.attrStart[k]} → <span className="text-chalk">{s.attrEnd[k]}</span>
                        <span className={`ml-2 ${d > 0 ? 'text-win' : d < 0 ? 'text-[#ff8b82]' : 'text-silver/40'}`}>{d > 0 ? `+${d}` : d === 0 ? '±0' : d}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <div className="tag-orange mb-2">最佳纪录</div>
              {s.bests.length ? (
                <div className="space-y-1.5">
                  {s.bests.map((b) => (
                    <div key={b.label} className="rounded bg-white/[0.03] px-3 py-1.5 text-[13px]">
                      <div className="text-silver/60">{b.label}</div>
                      <div className="text-chalk">{b.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-silver/50">本赛季还没有训练记录。</div>
              )}
              <div className="tag-orange mb-2 mt-4">赛季获得徽章</div>
              {s.badges.length ? (
                <div className="flex flex-wrap gap-2">
                  {s.badges.map((b) => (
                    <BadgeEmblem key={`${b.badgeId}${b.tier}`} badgeId={b.badgeId} tier={b.tier} size={44} />
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-silver/50">暂无</div>
              )}
            </div>
          </div>
          <div className="mt-7 flex justify-end">
            <ElasticButton size="lg" onClick={close}>
              {markSeen ? '进入新赛季' : '关闭'}
            </ElasticButton>
          </div>
        </div>
      )}
    </SpringModal>
  )
}
