import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { AiConfigPublic, AiProvider } from '@shared/types'
import { Icon } from '../art/icons'
import { Chips, Field, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { errMsg } from '../lib/format'
import { ElasticButton, spring } from '../motion'
import { useApp } from '../store/app'

const PROVIDERS: Record<AiProvider, { label: string; baseUrl: string; model: string }> = {
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  custom: { label: '自定义（OpenAI 兼容）', baseUrl: '', model: '' }
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <motion.button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} whileTap={{ scale: 0.92 }} className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${on ? 'bg-hoop' : 'bg-white/15'}`}>
      <motion.span layout transition={spring.press} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${on ? 'right-1' : 'left-1'}`} />
    </motion.button>
  )
}

export function Settings(): JSX.Element {
  const settings = useApp((s) => s.settings)
  const update = useApp((s) => s.updateSettings)
  const toast = useApp((s) => s.toast)
  const version = useApp((s) => s.version)
  const consumeIntent = useApp((s) => s.consumeIntent)
  const [cfg, setCfg] = useState<AiConfigPublic | null>(null)
  const [provider, setProvider] = useState<AiProvider>('deepseek')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null)
  const [dbPath, setDbPath] = useState('')

  useEffect(() => {
    consumeIntent()
    api.ai.getConfig().then((c) => {
      setCfg(c)
      setProvider(c.provider)
      setBaseUrl(c.baseUrl)
      setModel(c.model)
    })
    api.data.location().then(setDbPath)
  }, [consumeIntent])

  const save = async (): Promise<boolean> => {
    setSaving(true)
    try {
      const c = await api.ai.saveConfig({ provider, baseUrl, model, apiKey: key || undefined })
      setCfg(c)
      setKey('')
      toast({ tone: 'success', title: 'AI 配置已保存', detail: c.hasKey ? 'API Key 已加密保存在系统安全存储中' : undefined })
      return true
    } catch (e) {
      toast({ tone: 'error', title: '保存失败', detail: errMsg(e) })
      return false
    } finally {
      setSaving(false)
    }
  }
  const test = async (): Promise<void> => {
    if (key && !(await save())) return
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await api.ai.test())
    } finally {
      setTesting(false)
    }
  }
  const clearKey = async (): Promise<void> => {
    const c = await api.ai.saveConfig({ provider, baseUrl, model, clearKey: true })
    setCfg(c)
    setTestResult(null)
    toast({ tone: 'info', title: 'API Key 已清除', detail: 'AI 教练将使用本地规则模式' })
  }
  const dataAction = async (fn: () => Promise<{ ok: boolean; path?: string; message?: string }>, okTitle: string): Promise<void> => {
    try {
      const r = await fn()
      if (r.ok) toast({ tone: 'success', title: okTitle, detail: r.path ?? r.message })
      else if (r.message && r.message !== '已取消') toast({ tone: 'info', title: r.message })
      if (r.ok && okTitle.includes('导入')) await useApp.getState().bootstrap()
    } catch (e) {
      toast({ tone: 'error', title: '操作失败', detail: errMsg(e) })
    }
  }

  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader tag="SETTINGS" title="设置" />
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="panel panel-cut p-6">
            <div className="tag-orange">MOTION & VISUALS</div>
            <h3 className="mb-5 mt-1 font-display text-[22px] font-semibold text-chalk">动效与画面</h3>
            <Field label="减少动态效果" hint="“跟随系统”会读取设备的动态效果设置">
              <Chips
                options={[
                  { id: 'system', label: '跟随系统' },
                  { id: 'off', label: '完整动效' },
                  { id: 'on', label: '减少动效' }
                ]}
                value={settings.reducedMotion}
                onChange={(v) => void update({ reducedMotion: v })}
              />
            </Field>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-black/25 px-4 py-3">
              <div>
                <div className="text-[14px] text-chalk">球馆背景动画</div>
                <div className="text-[12px] text-silver/55">聚光灯呼吸与观众席光斑。性能较弱的设备可以关闭</div>
              </div>
              <Toggle on={settings.backgroundFx} onChange={(v) => void update({ backgroundFx: v })} />
            </div>
          </div>

          <div className="panel rounded-xl p-6">
            <div className="tag-orange">DATA</div>
            <h3 className="mb-2 mt-1 font-display text-[22px] font-semibold text-chalk">数据备份与迁移</h3>
            <p className="mb-5 text-[13px] text-silver/60">所有数据保存在本机 SQLite 数据库中，离线可用。API Key 不会被导出。</p>
            <div className="grid grid-cols-3 gap-3">
              <ElasticButton variant="secondary" icon={<Icon.download width={16} height={16} />} onClick={() => void dataAction(api.data.exportJson, '导出成功')}>
                导出 JSON
              </ElasticButton>
              <ElasticButton variant="secondary" icon={<Icon.upload width={16} height={16} />} onClick={() => void dataAction(api.data.importJson, '导入成功')}>
                导入 JSON
              </ElasticButton>
              <ElasticButton variant="secondary" icon={<Icon.db width={16} height={16} />} onClick={() => void dataAction(api.data.backupDb, '数据库已备份')}>
                备份数据库
              </ElasticButton>
            </div>
            <div className="mt-4 break-all rounded bg-black/30 px-3 py-2 font-mono text-[11px] text-silver/50">{dbPath}</div>
          </div>

          <div className="panel rounded-xl p-6 text-[13px] text-silver/60">
            <div className="tag-orange mb-2">ABOUT</div>
            COURT//RISE 球场生涯 v{version}
            <br />
            现实篮球训练 × 生涯养成 × AI 私人教练。所有品牌、界面、图标与角色均为原创设计。
          </div>
        </div>

        <div className="panel panel-cut h-fit p-6">
          <div className="tag-orange">AI COACH</div>
          <h3 className="mb-1 mt-1 font-display text-[22px] font-semibold text-chalk">AI 教练服务</h3>
          <p className="mb-5 text-[13px] text-silver/60">支持 OpenAI、DeepSeek 及其他 OpenAI 兼容接口。密钥通过系统安全存储加密，渲染界面与日志中都不会出现明文。</p>
          <div className="space-y-5">
            <Field label="服务商">
              <Chips
                options={(Object.keys(PROVIDERS) as AiProvider[]).map((p) => ({ id: p, label: PROVIDERS[p].label }))}
                value={provider}
                onChange={(p) => {
                  setProvider(p)
                  if (p !== 'custom') {
                    setBaseUrl(PROVIDERS[p].baseUrl)
                    setModel(PROVIDERS[p].model)
                  }
                }}
              />
            </Field>
            <Field label="API 地址">
              <input className="field mono text-[13px]" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" spellCheck={false} />
            </Field>
            <Field label="模型名称">
              <input className="field mono text-[13px]" value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat / gpt-4o-mini" spellCheck={false} />
            </Field>
            <Field label="API Key" hint={cfg?.hasKey ? `已保存：${cfg.keyHint}（留空则不修改）` : '未配置'}>
              <input className="field mono text-[13px]" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={cfg?.hasKey ? '••••••••（已加密保存）' : 'sk-...'} spellCheck={false} />
            </Field>
            {cfg && !cfg.secureStorage && <div className="rounded-lg bg-[#ff5d52]/10 px-4 py-3 text-[13px] text-[#ff9c94]">当前系统安全存储不可用，无法保存 API Key。</div>}
            <div className="flex flex-wrap gap-3">
              <ElasticButton loading={saving} icon={<Icon.check width={16} height={16} />} onClick={() => void save()}>
                保存配置
              </ElasticButton>
              <ElasticButton variant="secondary" loading={testing} icon={<Icon.bolt width={16} height={16} />} disabled={!cfg?.hasKey && !key} onClick={() => void test()}>
                测试连接
              </ElasticButton>
              {cfg?.hasKey && (
                <ElasticButton variant="ghost" icon={<Icon.trash width={15} height={15} />} onClick={() => void clearKey()}>
                  清除 Key
                </ElasticButton>
              )}
            </div>
            {testResult && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring.page} className={`rounded-lg px-4 py-3 text-[13px] ${testResult.ok ? 'bg-win/10 text-win' : 'bg-[#ff5d52]/10 text-[#ff9c94]'}`}>
                {testResult.ok ? '✓ ' : '✕ '}
                {testResult.message}
                {testResult.latencyMs != null && <span className="ml-2 text-silver/60">{testResult.latencyMs} ms</span>}
              </motion.div>
            )}
            <div className="rounded-lg bg-black/25 px-4 py-3 text-[12px] leading-relaxed text-silver/55">
              没有 API Key 时，训练、成长、数据功能完全可用；AI 教练会切换为本地规则模式并明确标注。AI 只读取你的训练摘要，不能修改任何数据。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
