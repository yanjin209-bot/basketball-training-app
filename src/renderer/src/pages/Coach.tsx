import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { AiConfigPublic, ChatMessage, CoachReply } from '@shared/types'
import { CoachAvatar } from '../art/CoachAvatar'
import { Icon } from '../art/icons'
import { PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { errMsg } from '../lib/format'
import { Markdown } from '../lib/Markdown'
import { ElasticButton, spring } from '../motion'
import { useApp } from '../store/app'

interface Msg extends ChatMessage {
  id: number
  source?: CoachReply['source']
  error?: string
}

const QUICK = ['分析我近期的训练表现', '帮我制定下周训练计划', '我现在最大的短板是什么？', '罚球命中率怎么提升？', '如何安排恢复日？']

let mid = 1
// 会话在切换页面时保留
let memory: Msg[] = []

export function Coach(): JSX.Element {
  const [cfg, setCfg] = useState<AiConfigPublic | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>(memory)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<false | 'chat' | 'weekly' | 'plan'>(false)
  const scroller = useRef<HTMLDivElement>(null)
  const go = useApp((s) => s.go)
  const toast = useApp((s) => s.toast)
  const d = useApp((s) => s.dashboard)

  useEffect(() => {
    api.ai.getConfig().then(setCfg).catch(() => setCfg(null))
  }, [])
  useEffect(() => {
    memory = msgs
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const online = !!cfg?.hasKey
  const push = (m: Omit<Msg, 'id'>): void => setMsgs((xs) => [...xs, { ...m, id: mid++ }])

  const send = async (text: string): Promise<void> => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    const history: ChatMessage[] = [...msgs, { role: 'user' as const, content: t }].map(({ role, content }) => ({ role, content }))
    push({ role: 'user', content: t })
    setBusy('chat')
    try {
      const r = await api.ai.chat(history)
      push({ role: 'assistant', content: r.content, source: r.source, error: r.error })
    } catch (e) {
      toast({ tone: 'error', title: '教练暂时无法回复', detail: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }
  const report = async (kind: 'weekly' | 'plan'): Promise<void> => {
    if (busy) return
    push({ role: 'user', content: kind === 'weekly' ? '生成我的近期训练报告' : '生成下周训练计划' })
    setBusy(kind)
    try {
      const r = await api.ai.report(kind)
      push({ role: 'assistant', content: r.content, source: r.source, error: r.error })
    } catch (e) {
      toast({ tone: 'error', title: '报告生成失败', detail: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col px-10 pb-8 pt-4">
      <PageHeader tag="AI PERSONAL COACH" title="AI 私人教练" sub="教练只基于你的真实训练数据分析，不会编造成绩，也无权修改 XP、OVR 与徽章。" />
      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="panel panel-cut p-5">
            <div className="flex items-center gap-4">
              <CoachAvatar size={72} online={online} />
              <div>
                <div className="font-display text-[22px] font-semibold text-chalk">雷恩教练</div>
                <div className="tag text-[10px]">COACH RAYNE</div>
                <div className={`mt-1.5 text-[12px] ${online ? 'text-win' : 'text-silver/60'}`}>{cfg == null ? '…' : online ? `AI 已连接 · ${cfg.model}` : 'AI 服务未连接 · 本地规则模式'}</div>
              </div>
            </div>
            {!online && cfg && (
              <div className="mt-4 rounded-lg bg-white/[0.04] p-3 text-[12px] leading-relaxed text-silver/65">
                未配置 API Key 时，教练使用本地规则生成基础建议（会明确标注）。
                <button type="button" className="ml-1 text-hoop hover:underline" onClick={() => go('settings', 'ai')}>
                  去设置 →
                </button>
              </div>
            )}
          </div>
          <div className="panel rounded-xl p-5">
            <div className="tag-orange mb-3">TRAINING REPORT</div>
            <div className="space-y-2.5">
              <ElasticButton block size="lg" loading={busy === 'weekly'} disabled={!!busy && busy !== 'weekly'} icon={<Icon.stats width={16} height={16} />} onClick={() => void report('weekly')}>
                近期表现报告
              </ElasticButton>
              <ElasticButton block size="lg" variant="secondary" loading={busy === 'plan'} disabled={!!busy && busy !== 'plan'} icon={<Icon.training width={16} height={16} />} onClick={() => void report('plan')}>
                下周训练计划
              </ElasticButton>
            </div>
          </div>
          <div className="panel min-h-0 flex-1 overflow-y-auto rounded-xl p-5">
            <div className="tag-orange mb-3">QUICK ASK</div>
            <div className="flex flex-col gap-2">
              {QUICK.map((q) => (
                <motion.button key={q} type="button" disabled={!!busy} onClick={() => void send(q)} whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }} transition={spring.press} className="rounded-md bg-white/[0.04] px-3 py-2 text-left text-[13px] text-silver/85 hover:bg-white/[0.08] hover:text-chalk disabled:opacity-50">
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel flex min-h-0 flex-col rounded-xl">
          <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            {msgs.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.page} className="flex gap-3">
                <CoachAvatar size={40} online={online} />
                <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-[14px] text-silver/90">
                  {d ? `${d.player.nickname}，我是你的私人教练。` : ''}我会根据你记录的训练、测试和实战数据给出建议。可以问我技术问题，或者直接生成报告和训练计划。
                </div>
              </motion.div>
            )}
            <AnimatePresence initial={false}>
              {msgs.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.pop} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' ? (
                    <CoachAvatar size={40} online={m.source === 'ai'} />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-hoop to-hoop-deep">
                      {d?.player.avatar ? <img src={d.player.avatar} alt="" className="h-full w-full object-cover" /> : <span className="num text-[15px] font-bold text-white">{d?.player.jersey}</span>}
                    </div>
                  )}
                  <div className={`max-w-[78%] ${m.role === 'user' ? 'items-end' : ''} flex flex-col`}>
                    <div className={`select-text rounded-2xl px-4 py-3 text-[14px] ${m.role === 'user' ? 'rounded-tr-sm bg-gradient-to-b from-[#FF7F3D] to-[#E0570F] text-white' : 'rounded-tl-sm bg-white/[0.06] text-silver/90'}`}>
                      {m.role === 'user' ? m.content : <Markdown text={m.content} />}
                    </div>
                    {m.role === 'assistant' && (
                      <div className="mt-1 flex items-center gap-2 px-1 text-[11px]">
                        <span className={`rounded px-1.5 py-0.5 font-label font-bold tracking-wider ${m.source === 'ai' ? 'bg-win/10 text-win' : 'bg-white/5 text-silver/60'}`}>{m.source === 'ai' ? 'AI' : '本地规则'}</span>
                        {m.error && <span className="text-[#ff9c94]">AI 调用失败：{m.error}</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <CoachAvatar size={40} online={online} />
                <div className="flex gap-1.5 rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-hoop" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
          <div className="border-t border-white/5 p-4">
            <div className="flex items-end gap-3">
              <textarea
                className="field max-h-32 min-h-[48px] flex-1 resize-none"
                rows={1}
                maxLength={2000}
                placeholder="问教练任何篮球技术问题…（Enter 发送，Shift+Enter 换行）"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    void send(input)
                  }
                }}
              />
              <ElasticButton size="lg" icon={<Icon.send width={16} height={16} />} disabled={!input.trim() || !!busy} onClick={() => void send(input)}>
                发送
              </ElasticButton>
            </div>
            {msgs.length > 0 && (
              <button
                type="button"
                className="mt-2 text-[11px] text-silver/40 hover:text-silver/70"
                onClick={() => {
                  memory = []
                  setMsgs([])
                }}
              >
                清空对话
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
