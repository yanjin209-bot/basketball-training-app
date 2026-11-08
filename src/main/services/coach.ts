// AI 私人教练：OpenAI / DeepSeek（OpenAI 兼容协议）+ 无网络时的本地规则教练
import { ATTR_META, PLAY_STYLES } from '../../shared/config/career'
import { DRILL_MAP, DRILLS } from '../../shared/config/drills'
import { SKILL_TESTS } from '../../shared/config/skills'
import { attrMapOf, weakestAttr } from '../../shared/logic/skills'
import type { AiConfigInput, AiConfigPublic, AiProvider, AttrKey, ChatMessage, CoachReply } from '../../shared/types'
import type { CourtService } from './court'

export const PROVIDER_DEFAULTS: Record<AiProvider, { baseUrl: string; model: string; label: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', label: 'OpenAI' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', label: 'DeepSeek' },
  custom: { baseUrl: '', model: '', label: '自定义（OpenAI 兼容）' }
}

export interface SecretStore {
  available(): boolean
  encrypt(plain: string): string
  decrypt(enc: string): string
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  text(): Promise<string>
}>

const KEY_CONFIG = 'ai.config'
const KEY_SECRET = 'ai.key.enc'

const SYSTEM_PROMPT = `你是 COURT//RISE 篮球生涯应用里的私人篮球教练「雷恩教练」（COACH RAYNE），说话直接、专业、有激情，像职业球队的技能教练。
必须遵守：
1. 只能依据【球员数据】中真实存在的记录分析，绝不编造任何未提供的训练成绩、测试结果、比赛数据或日期。数据不足时明确说“目前没有相关记录”，并建议用户去记录或完成对应测试。
2. 标注“自评预估”的能力值不是真实测试结果，引用时必须说明。
3. 你无权修改 XP、OVR、等级、徽章或任何数据库记录，也不能承诺会修改；如被要求，说明这些只能由真实训练与测试记录自动计算。
4. 训练计划要安全：合理安排强度，每周至少 1–2 个恢复日；涉及疼痛或受伤时建议停止训练并咨询医生或康复师。
5. 使用简体中文，结构清晰，可以用“## 标题”和“- 列表”，回答控制在 400 字以内（训练计划可放宽到 600 字）。`

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
}

export class CoachService {
  constructor(
    private readonly court: CourtService,
    private readonly secrets: SecretStore,
    private readonly fetchFn: FetchLike
  ) {}

  // ── 配置 ─────────────────────────────────────────────────
  private readConfig(): { provider: AiProvider; model: string; baseUrl: string } {
    try {
      const raw = this.court.getRaw(KEY_CONFIG)
      if (raw) {
        const c = JSON.parse(raw)
        if (c.provider in PROVIDER_DEFAULTS) return { provider: c.provider, model: String(c.model ?? ''), baseUrl: String(c.baseUrl ?? '') }
      }
    } catch {
      /* 使用默认值 */
    }
    return { provider: 'deepseek', model: PROVIDER_DEFAULTS.deepseek.model, baseUrl: PROVIDER_DEFAULTS.deepseek.baseUrl }
  }

  private readKey(): string | null {
    const enc = this.court.getRaw(KEY_SECRET)
    if (!enc || !this.secrets.available()) return null
    try {
      return this.secrets.decrypt(enc)
    } catch {
      return null
    }
  }

  getPublicConfig(): AiConfigPublic {
    const c = this.readConfig()
    const key = this.readKey()
    return {
      ...c,
      hasKey: !!key,
      keyHint: key ? `${key.slice(0, 3)}••••${key.slice(-4)}` : null,
      secureStorage: this.secrets.available()
    }
  }

  saveConfig(input: AiConfigInput): AiConfigPublic {
    if (!(input?.provider in PROVIDER_DEFAULTS)) throw new Error('未知的服务商')
    const model = String(input.model ?? '').trim().slice(0, 100)
    const baseUrl = normalizeBase(String(input.baseUrl ?? ''))
    if (!model) throw new Error('请填写模型名称')
    if (!/^https:\/\/[^\s]+$/i.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(baseUrl)) {
      throw new Error('API 地址需以 https:// 开头（本地服务可用 http://localhost）')
    }
    this.court.setRaw(KEY_CONFIG, JSON.stringify({ provider: input.provider, model, baseUrl }))
    if (input.clearKey) this.court.setRaw(KEY_SECRET, null)
    const key = input.apiKey?.trim()
    if (key) {
      if (!this.secrets.available()) throw new Error('系统安全存储不可用，无法保存 API Key')
      if (key.length < 8 || key.length > 300 || /\s/.test(key)) throw new Error('API Key 格式不正确')
      this.court.setRaw(KEY_SECRET, this.secrets.encrypt(key))
    }
    return this.getPublicConfig()
  }

  // ── 远程调用 ─────────────────────────────────────────────
  private async complete(messages: Array<{ role: string; content: string }>, maxTokens = 900): Promise<string> {
    const c = this.readConfig()
    const key = this.readKey()
    if (!key) throw new Error('尚未配置 API Key')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 60_000)
    try {
      const res = await this.fetchFn(`${normalizeBase(c.baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: c.model, messages, temperature: 0.6, max_tokens: maxTokens, stream: false }),
        signal: ctrl.signal
      })
      const text = await res.text()
      if (!res.ok) throw new Error(describeHttpError(res.status, text))
      let json: { choices?: Array<{ message?: { content?: string } }> }
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error('AI 服务返回了无法解析的内容，请检查 API 地址')
      }
      const content = json.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('AI 服务未返回内容')
      return content
    } catch (e) {
      const err = e as Error
      if (err.name === 'AbortError') throw new Error('请求超时，请检查网络或稍后重试')
      throw new Error(scrub(err.message || '网络请求失败', key))
    } finally {
      clearTimeout(timer)
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const t0 = Date.now()
    try {
      await this.complete([{ role: 'user', content: '只回复两个字：在线' }], 10)
      return { ok: true, message: `连接成功 · ${this.readConfig().model}`, latencyMs: Date.now() - t0 }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  }

  async chat(history: ChatMessage[]): Promise<CoachReply> {
    const clean = (Array.isArray(history) ? history : [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    const last = clean[clean.length - 1]
    if (!last || last.role !== 'user') throw new Error('消息为空')
    if (!this.readKey()) return { content: this.localAnswer(last.content), source: 'local' }
    try {
      const content = await this.complete([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `【球员数据】\n${this.court.coachContext()}` },
        ...clean
      ])
      return { content, source: 'ai' }
    } catch (e) {
      return { content: this.localAnswer(last.content), source: 'local', error: (e as Error).message }
    }
  }

  async report(kind: 'weekly' | 'plan'): Promise<CoachReply> {
    const local = kind === 'weekly' ? this.localWeekly() : this.localPlan()
    if (!this.readKey()) return { content: local, source: 'local' }
    const ask =
      kind === 'weekly'
        ? '请根据我的真实数据生成一份近期训练表现报告：近期表现、进步项目、短板识别、下一步建议。'
        : '请根据我的真实数据和短板，为我制定下周 7 天训练计划（含每日项目、时长、强度和至少 1–2 个恢复日），并说明理由。'
    try {
      const content = await this.complete(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `【球员数据】\n${this.court.coachContext()}` },
          { role: 'user', content: ask }
        ],
        1400
      )
      return { content, source: 'ai' }
    } catch (e) {
      return { content: local, source: 'local', error: (e as Error).message }
    }
  }

  // ── 本地规则教练（离线可用） ─────────────────────────────
  localWeekly(): string {
    const d = this.court.coachData()
    const out: string[] = ['## 近 14 天表现']
    const mins = (xs: typeof d.recent): number => Math.round(xs.reduce((a, s) => a + s.durationMin, 0))
    if (d.recent.length === 0) {
      out.push('- 最近 14 天还没有训练记录。去训练中心完成一次训练，我就能开始给你分析。')
    } else {
      out.push(`- 训练 ${d.recent.length} 次，共 ${mins(d.recent)} 分钟（前 14 天：${d.previous.length} 次 / ${mins(d.previous)} 分钟）`)
      const byCat = new Map<string, number>()
      for (const s of d.recent) byCat.set(DRILL_MAP[s.drillId].name, (byCat.get(DRILL_MAP[s.drillId].name) ?? 0) + s.durationMin)
      out.push(`- 时间分配：${[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)} 分钟`).join('，')}`)
    }
    out.push('## 进步项目')
    const progress: string[] = []
    for (const drill of DRILLS.filter((x) => x.metric === 'shots')) {
      const acc = (xs: typeof d.recent): number | null => {
        const ss = xs.filter((s) => s.drillId === drill.id)
        const a = ss.reduce((x, s) => x + s.attempts, 0)
        return a >= 20 ? ss.reduce((x, s) => x + s.makes, 0) / a : null
      }
      const now = acc(d.recent)
      const prev = acc(d.previous)
      if (now != null && prev != null && now - prev >= 0.03) progress.push(`- ${drill.name}命中率 ${(prev * 100).toFixed(1)}% → ${(now * 100).toFixed(1)}%`)
    }
    if (d.recent.length > d.previous.length && d.previous.length > 0) progress.push(`- 训练频率提升：${d.previous.length} → ${d.recent.length} 次`)
    out.push(...(progress.length ? progress : ['- 暂时没有可对比的进步数据（需要连续两个周期的同类记录）。']))
    out.push('## 短板识别')
    out.push(...this.weaknessLines())
    out.push('## 下一步')
    out.push(d.recovery ? '- 今天是恢复日：做 15–20 分钟拉伸和轻量罚球，让身体吸收训练效果。' : `- 本周优先加练「${ATTR_META[weakestAttr(attrMapOf(d.attrs))].name}」相关项目，每次 15–25 分钟。`)
    out.push('', '_本地规则教练生成 · AI 服务未连接_')
    return out.join('\n')
  }

  private weaknessLines(): string[] {
    const d = this.court.coachData()
    const map = attrMapOf(d.attrs)
    const weak = weakestAttr(map)
    const lines: string[] = []
    const w = d.attrs.find((a) => a.key === weak)!
    lines.push(`- 当前最低能力：${ATTR_META[weak].name} ${w.value}${w.source === 'estimated' ? '（自评预估，尚未测试）' : ''}`)
    const untested = d.attrs.filter((a) => a.source === 'estimated').map((a) => ATTR_META[a.key].name)
    if (untested.length) lines.push(`- 未测试能力：${untested.join('、')}。去「能力属性」完成标准化测试，评分才会真实。`)
    const ft = d.recent.filter((s) => s.drillId === 'free_throw')
    const fa = ft.reduce((a, s) => a + s.attempts, 0)
    if (fa >= 30 && ft.reduce((a, s) => a + s.makes, 0) / fa < 0.65) lines.push('- 罚球命中率低于 65%，建议固定罚球前程序并每天 30 球。')
    const weakHandMin = d.recent.filter((s) => s.drillId === 'weak_hand').reduce((a, s) => a + s.durationMin, 0)
    if (d.player.hand !== 'both' && weakHandMin < 10) lines.push('- 近两周弱侧手训练不足 10 分钟，容易被防守针对。')
    return lines
  }

  localPlan(): string {
    const d = this.court.coachData()
    const map = attrMapOf(d.attrs)
    const weak = weakestAttr(map)
    const style = PLAY_STYLES.find((s) => s.id === d.player.style)!
    const drillFor: Record<AttrKey, string[]> = {
      shooting: ['spot_shooting', 'three_point', 'free_throw'],
      dribbling: ['ball_handling', 'weak_hand', 'crossover'],
      finishing: ['layup', 'agility'],
      defense: ['def_slides', 'agility'],
      athleticism: ['conditioning', 'agility'],
      iq: ['spot_shooting', 'ball_handling']
    }
    const focus = [weak, ...style.focus.filter((f) => f !== weak)].slice(0, 2)
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const plan: string[] = [`## 下周训练计划（重点：${focus.map((f) => ATTR_META[f].name).join(' + ')}）`]
    const pattern: Array<'main' | 'second' | 'mix' | 'rest'> = ['main', 'second', 'rest', 'main', 'mix', 'second', 'rest']
    pattern.forEach((p, i) => {
      if (p === 'rest') {
        plan.push(`- ${days[i]}：恢复训练 20 分钟（拉伸 + 泡沫轴 + 10 次轻量罚球）`)
        return
      }
      const attr = p === 'main' ? focus[0] : p === 'second' ? (focus[1] ?? focus[0]) : 'shooting'
      const [a, b] = drillFor[attr]
      plan.push(`- ${days[i]}：${DRILL_MAP[a].name} 20 分钟 + ${DRILL_MAP[b ?? a].name} 15 分钟（${p === 'mix' ? '中' : '中高'}强度，RPE 6–7）`)
    })
    plan.push('## 说明')
    plan.push(`- 你的打法是「${style.name}」，计划围绕最低项「${ATTR_META[weak].name}」与打法核心能力安排。`)
    plan.push('- 每周两个恢复日，连续三天训练后系统会自动安排恢复任务。')
    const t = SKILL_TESTS.find((x) => x.attr === weak && !x.builtIn)
    if (t) plan.push(`- 周末可以做一次「${t.name}」，检验这一周的效果。`)
    plan.push('', '_本地规则教练生成 · AI 服务未连接_')
    return plan.join('\n')
  }

  localAnswer(q: string): string {
    const text = q.toLowerCase()
    const tips: Array<[RegExp, string]> = [
      [/罚球|free/, '## 罚球要点\n- 固定罚球前程序：同样的运球次数、同样的呼吸节奏\n- 脚尖对准篮筐，投篮手肘在球的正下方\n- 出手后保持跟随动作直到球入网\n- 每组 10 球记录命中，目标先稳定在 70%'],
      [/三分|投篮|shoot|命中/, '## 投篮稳定性\n- 下肢发力占主导，起跳与出手连贯\n- 出手点固定在额头前上方，不要随距离改变动作\n- 先近后远：篮下 → 中距离 → 三分，每个距离命中 5 球再后退\n- 用定点投篮记录命中率，观察趋势而不是单次结果'],
      [/运球|控球|变向|handle|dribble/, '## 控球提升\n- 每天 10 分钟原地组合运球，抬头不看球\n- 弱侧手单独练习占总时长 60%\n- 变向后立刻加速两步，变向的价值在于启动\n- 用 30 秒运球测试检验进步'],
      [/上篮|终结|篮下|layup/, '## 终结能力\n- 左右手上篮比例 1:1，弱侧手不能偷懒\n- 练习反手、抛投、欧洲步，对抗下有多种选择\n- 麦肯上篮每天 2 组，提升篮下手感'],
      [/防守|滑步|defense/, '## 防守基础\n- 低重心：膝盖弯曲，背部挺直，重心在前脚掌\n- 滑步时双脚不交叉、不并拢\n- 判断对手强侧手，逼他用弱侧手\n- 用禁区滑步测试检验脚步速度'],
      [/弹跳|爆发|体能|速度|jump/, '## 体能与弹跳\n- 每周 2 次下肢力量：深蹲、箭步蹲、单腿硬拉\n- 跳跃训练每次不超过 60 次落地，注意落地缓冲\n- 冲刺训练保证充分组间休息\n- 体能训练后安排恢复日'],
      [/伤|疼|痛|injur/, '## 关于伤病\n- 出现疼痛请立即停止训练，不要带痛训练\n- 急性扭伤可冰敷并抬高患处，尽快就医\n- 持续疼痛请咨询医生或康复师，我不能替代专业诊断'],
      [/恢复|休息|累|疲劳|rest/, '## 恢复建议\n- 每周至少 1–2 个恢复日\n- 睡眠 7–9 小时是最好的恢复\n- 恢复日可做拉伸、泡沫轴和轻量投篮\n- 连续三天训练后，系统会自动安排恢复任务']
    ]
    if (/计划|安排|下周|plan/.test(text)) return this.localPlan()
    if (/分析|表现|总结|报告|进步|短板/.test(text)) return this.localWeekly()
    const hit = tips.find(([re]) => re.test(text))
    const body = hit ? hit[1] : '我目前处于离线模式，可以回答投篮、罚球、运球、上篮、防守、体能、恢复等基础问题，也可以输入“分析我的表现”或“制定下周计划”。'
    return `${body}\n\n_本地规则教练回答 · AI 服务未连接（在设置中配置 API Key 后可获得个性化 AI 分析）_`
  }
}

function describeHttpError(status: number, body: string): string {
  let detail = ''
  try {
    detail = JSON.parse(body)?.error?.message ?? ''
  } catch {
    /* 非 JSON */
  }
  const short = detail ? `：${String(detail).slice(0, 120)}` : ''
  if (status === 401 || status === 403) return `API Key 无效或没有权限（${status}）${short}`
  if (status === 404) return `接口地址或模型名称不存在（404）${short}`
  if (status === 402) return `账户余额不足（402）${short}`
  if (status === 429) return `请求过于频繁或额度已用完（429）${short}`
  if (status >= 500) return `AI 服务暂时不可用（${status}）`
  return `请求失败（${status}）${short}`
}

/** 确保错误信息里不会出现密钥 */
function scrub(msg: string, key: string | null): string {
  let m = msg
  if (key) m = m.split(key).join('***')
  return m.replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
}
