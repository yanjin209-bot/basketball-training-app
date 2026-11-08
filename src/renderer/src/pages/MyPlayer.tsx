import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ATTR_KEYS, ATTR_META, HANDS, PLAY_STYLES, POSITIONS, POSITION_WEIGHTS } from '@shared/config/career'
import { BADGE_MAP } from '@shared/config/badges'
import { validatePlayer } from '@shared/logic/validation'
import { attrMapOf } from '@shared/logic/skills'
import type { Snapshot } from '@shared/types'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { Icon } from '../art/icons'
import { PlayerArt } from '../art/PlayerArt'
import { AttributeRadar } from '../components/AttributeRadar'
import { BodyFields, EstimateFields, IdentityFields, PositionFields, StyleFields, toInput, type Draft } from '../components/PlayerForm'
import { Chips, PageHeader, SourceTag } from '../components/ui'
import { api } from '../lib/api'
import { errMsg } from '../lib/format'
import { AnimatedPlayerCard, ElasticButton, SpringModal, spring } from '../motion'
import { mutate, useApp } from '../store/app'

export function MyPlayer(): JSX.Element {
  const d = useApp((s) => s.dashboard)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [cmp, setCmp] = useState<number | null>(null)
  const toast = useApp((s) => s.toast)
  useEffect(() => {
    api
      .stats()
      .then((s) => setSnapshots(s.snapshots))
      .catch((e) => toast({ tone: 'error', title: '加载历史失败', detail: errMsg(e) }))
  }, [toast, d?.ovr])
  if (!d) return <div />
  const p = d.player
  const attrs = attrMapOf(d.attributes)
  const unlocked = d.badges.filter((b) => b.tier > 0).map((b) => ({ badgeId: b.badgeId, tier: b.tier }))
  const style = PLAY_STYLES.find((s) => s.id === p.style)!
  const snap = snapshots.find((s) => s.id === cmp) ?? null
  const weights = POSITION_WEIGHTS[p.position]

  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader tag="MY PLAYER" title="我的球员" sub="点击球员卡展开详情。历史球员卡来自每次能力测试与每周的真实快照。" right={<ElasticButton variant="secondary" icon={<Icon.edit width={16} height={16} />} onClick={() => setEditing(true)}>编辑资料</ElasticButton>} />
      <LayoutGroup>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-10">
          <div className="flex flex-col items-center">
            {!expanded && <AnimatedPlayerCard player={p} ovr={d.ovr} level={d.career.level} attrs={attrs} estimated={d.ovrEstimated} seasonName={`S${d.season.index}`} badges={unlocked} width={340} layoutId="my-card" onClick={() => setExpanded(true)} />}
            {expanded && <div style={{ width: 340, height: 340 * 1.42 }} />}
            <div className="mt-4 text-[12px] text-silver/45">悬停感受卡片空间感 · 点击展开</div>
          </div>

          <div className="space-y-6">
            <div className="panel panel-cut p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="tag-orange">PROFILE</div>
                  <div className="mt-1 font-display text-[40px] font-bold uppercase leading-none text-chalk">{p.nickname}</div>
                  <div className="mt-2 text-[14px] text-silver/70">
                    #{p.jersey} · {POSITIONS.find((x) => x.id === p.position)?.name} · {style.name}
                  </div>
                </div>
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-hoop to-hoop-deep ring-2 ring-white/10">
                  {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : <span className="num text-[34px] font-bold text-white">{p.jersey}</span>}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-5 gap-3">
                {[
                  ['身高', `${p.heightCm} cm`],
                  ['体重', `${p.weightKg} kg`],
                  ['惯用手', HANDS.find((h) => h.id === p.hand)?.name ?? ''],
                  ['生涯等级', `LV${d.career.level}`],
                  ['加入时间', p.createdAt.slice(0, 10)]
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-black/25 px-3 py-2.5">
                    <div className="tag text-[10px]">{l}</div>
                    <div className="mt-1 text-[15px] font-semibold text-chalk">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[13px] text-silver/60">{style.desc}</div>
            </div>

            <div className="panel rounded-xl p-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="tag-orange">CARD HISTORY</div>
                  <div className="font-display text-[20px] font-semibold text-chalk">历史球员卡对比</div>
                </div>
                <span className="text-[12px] text-silver/50">{snapshots.length} 张快照</span>
              </div>
              {snapshots.length < 2 ? (
                <div className="text-[13px] text-silver/55">完成能力测试后会生成新的球员卡快照，届时可以在这里对比成长。</div>
              ) : (
                <>
                  <Chips
                    size="sm"
                    options={snapshots
                      .slice()
                      .reverse()
                      .slice(0, 12)
                      .map((s) => ({ id: s.id, label: s.takenAt.slice(0, 10), sub: `OVR ${s.ovr} · ${s.reason}` }))}
                    value={cmp}
                    onChange={setCmp}
                  />
                  <AnimatePresence mode="wait">
                    {snap && (
                      <motion.div key={snap.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.page} className="mt-5 grid grid-cols-[auto_1fr] items-center gap-6">
                        <AnimatedPlayerCard player={p} ovr={snap.ovr} level={snap.level} attrs={snap.attributes} width={190} label={snap.takenAt.slice(0, 10)} />
                        <div>
                          <div className="mb-3 flex items-baseline gap-3">
                            <span className="num text-[34px] font-bold text-silver/60">{snap.ovr}</span>
                            <Icon.arrow width={20} height={20} className="text-hoop" />
                            <span className="num text-[44px] font-bold text-chalk">{d.ovr}</span>
                            <span className={`mono text-[16px] ${d.ovr - snap.ovr >= 0 ? 'text-win' : 'text-[#ff8b82]'}`}>
                              {d.ovr - snap.ovr >= 0 ? '+' : ''}
                              {d.ovr - snap.ovr}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {ATTR_KEYS.map((k) => {
                              const diff = attrs[k] - snap.attributes[k]
                              return (
                                <div key={k} className="flex items-center justify-between rounded bg-black/25 px-3 py-1.5 text-[13px]">
                                  <span className="text-silver/75">{ATTR_META[k].name}</span>
                                  <span className="mono">
                                    {snap.attributes[k]} → <span className="text-chalk">{attrs[k]}</span>
                                    <span className={`ml-1.5 ${diff > 0 ? 'text-win' : diff < 0 ? 'text-[#ff8b82]' : 'text-silver/40'}`}>{diff > 0 ? `+${diff}` : diff === 0 ? '' : diff}</span>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 展开的球员详情（共享元素过渡） */}
        <AnimatePresence>
          {expanded && (
            <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-10" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
              <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpanded(false)} />
              <motion.div layoutId="my-card" transition={spring.page} className="relative grid h-[min(640px,86vh)] w-[min(1100px,92vw)] grid-cols-[360px_1fr] overflow-hidden rounded-[22px] bg-[linear-gradient(160deg,#232831,#0d0f14)] ring-1 ring-hoop/30">
                <div className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(255,107,32,0.3),transparent_65%)]">
                  <div className="num outline-text absolute -left-4 top-2 text-[260px] font-bold leading-none">{p.jersey}</div>
                  <PlayerArt jersey={p.jersey} className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2" mirrored={p.hand === 'left'} />
                </div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2, ...spring.page } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex min-h-0 flex-col overflow-y-auto p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="tag-orange">PLAYER DETAIL</div>
                      <div className="font-display text-[48px] font-bold uppercase leading-none text-chalk">{p.nickname}</div>
                      <div className="mt-2 text-[14px] text-silver/70">
                        #{p.jersey} · {p.position} · {style.name} · LV{d.career.level} {d.career.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-gradient-orange text-[76px] font-bold leading-none">{d.ovr}</div>
                      <div className="tag">{d.ovrEstimated ? 'OVR · 含预估' : 'OVR'}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_1fr] gap-6">
                    <AttributeRadar attrs={attrs} height={250} />
                    <div className="space-y-2 self-center">
                      {d.attributes.map((a) => (
                        <div key={a.key} className="flex items-center justify-between rounded bg-black/25 px-3 py-2 text-[13px]">
                          <span className="text-silver/80">
                            {ATTR_META[a.key].name} <span className="text-silver/40">×{Math.round(weights[a.key] * 100)}%</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <SourceTag source={a.source} />
                            <span className="num w-7 text-right text-[18px] font-bold text-chalk">{a.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="tag-orange mb-2">BADGES</div>
                    {unlocked.length ? (
                      <div className="flex flex-wrap gap-3">
                        {unlocked.map((b) => (
                          <div key={b.badgeId} className="flex items-center gap-2 rounded-lg bg-black/25 py-1 pl-1 pr-3">
                            <BadgeEmblem badgeId={b.badgeId} tier={b.tier} size={36} />
                            <span className="text-[13px] text-chalk">{BADGE_MAP[b.badgeId].name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-silver/50">尚未解锁徽章</div>
                    )}
                  </div>
                  <div className="mt-auto flex justify-end pt-6">
                    <ElasticButton variant="secondary" icon={<Icon.back width={15} height={15} />} onClick={() => setExpanded(false)}>
                      收起
                    </ElasticButton>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      <EditProfile open={editing} onClose={() => setEditing(false)} />
    </div>
  )
}

function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const player = useApp((s) => s.player)
  const [d, setD] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useApp((s) => s.toast)
  useEffect(() => {
    if (open && player) setD({ ...player })
  }, [open, player])
  const set = (patch: Partial<Draft>): void => setD((x) => (x ? { ...x, ...patch } : x))
  const save = async (): Promise<void> => {
    if (!d) return
    const errs = validatePlayer(toInput(d))
    if (errs.length) return toast({ tone: 'error', title: '请检查输入', detail: errs.join('；') })
    setBusy(true)
    const r = await mutate(() => api.player.update(toInput(d)), '资料已更新')
    setBusy(false)
    if (r) onClose()
  }
  return (
    <SpringModal open={open} onClose={onClose} title="编辑球员资料" tag="EDIT PLAYER" width={820}>
      {d && (
        <div className="space-y-8">
          <IdentityFields d={d} set={set} />
          <BodyFields d={d} set={set} />
          <div>
            <div className="tag mb-2">场上位置</div>
            <PositionFields d={d} set={set} />
          </div>
          <div>
            <div className="tag mb-2">球员打法</div>
            <StyleFields d={d} set={set} />
          </div>
          <div>
            <div className="tag mb-2">能力自评（仅影响未测试的能力）</div>
            <EstimateFields d={d} set={set} />
          </div>
          <div className="flex justify-end gap-3">
            <ElasticButton variant="ghost" onClick={onClose}>
              取消
            </ElasticButton>
            <ElasticButton loading={busy} icon={<Icon.check width={16} height={16} />} onClick={() => void save()}>
              保存
            </ElasticButton>
          </div>
        </div>
      )}
    </SpringModal>
  )
}
