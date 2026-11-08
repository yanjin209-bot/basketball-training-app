import { useEffect, useRef, useState } from 'react'
import * as ort from 'onnxruntime-web'
import { todayStr } from '../../src/shared/logic/dates'
import { api } from '../../src/renderer/src/lib/api'
import { mutate } from '../../src/renderer/src/store/app'

type Box = { x: number; y: number; w: number; h: number; score: number }
type Counts = { attempts: number; makes: number }
const SIZE = 640

// A single fixed hoop and one ball: count only a descending crossing observed on both sides.
class ShotCounter {
  hoop: Box | null = null
  above: { x: number; y: number; time: number } | null = null
  lastEvent = 0
  counts: Counts = { attempts: 0, makes: 0 }
  update(ball: Box | null, hoop: Box | null, time: number): Counts {
    if (hoop) this.hoop = hoop
    const h = this.hoop
    if (!h || !ball) { if (this.above && time - this.above.time > 2000) this.above = null; return this.counts }
    const rimY = h.y, margin = h.w * 2
    if (ball.y < rimY && ball.y > rimY - Math.max(h.h * 3, h.w * 2) && Math.abs(ball.x - h.x) < margin) {
      this.above = { x: ball.x, y: ball.y, time }
    } else if (this.above && ball.y >= rimY && time - this.above.time < 1500 && time - this.lastEvent > 1000) {
      const prev = this.above
      if (ball.y - rimY < Math.max(h.h * 2, h.w) && Math.abs(ball.x - h.x) < margin * 1.5) {
        const crossing = prev.x + (ball.x - prev.x) * (rimY - prev.y) / (ball.y - prev.y)
        this.counts = { attempts: this.counts.attempts + 1, makes: this.counts.makes + (Math.abs(crossing - h.x) < h.w / 2 ? 1 : 0) }
        this.lastEvent = time
      }
      this.above = null
    } else if (this.above && time - this.above.time > 1500) this.above = null
    return this.counts
  }
}

export function ShotTracker({ close }: { close: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const stopRef = useRef(false)
  const counter = useRef(new ShotCounter())
  const started = useRef(0)
  const [status, setStatus] = useState('正在加载识别模型…')
  const [counts, setCounts] = useState<Counts>({ attempts: 0, makes: 0 })
  const [drill, setDrill] = useState('spot_shooting')
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const end = () => { stopRef.current = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null }
  useEffect(() => {
    let session: ort.InferenceSession | null = null
    let active = true
    const run = async () => {
      try {
        ort.env.wasm.numThreads = 1
        ort.env.wasm.wasmPaths = new URL('./ort/', document.baseURI).href
        session = await ort.InferenceSession.create(new URL('./basketball.onnx', document.baseURI).href, { executionProviders: ['wasm'] })
        if (!active) { await session.release(); return }
        setStatus('正在打开摄像头…')
        const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        if (!active) { camera.getTracks().forEach(t => t.stop()); return }
        stream.current = camera
        const v = video.current!
        v.srcObject = camera
        await v.play()
        started.current = Date.now()
        setStatus('识别中 · 请固定手机并保持篮筐和篮球清晰可见')
        const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        while (active && !stopRef.current) {
          if (!v.videoWidth || v.paused || document.hidden) { await new Promise(r => setTimeout(r, 100)); continue }
          const scale = Math.min(SIZE / v.videoWidth, SIZE / v.videoHeight)
          const w = v.videoWidth * scale, h = v.videoHeight * scale
          ctx.fillStyle = '#727272'; ctx.fillRect(0, 0, SIZE, SIZE)
          ctx.drawImage(v, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
          const pixels = ctx.getImageData(0, 0, SIZE, SIZE).data, data = new Float32Array(3 * SIZE * SIZE)
          for (let i = 0; i < SIZE * SIZE; i++) { data[i] = pixels[i * 4] / 255; data[i + SIZE * SIZE] = pixels[i * 4 + 1] / 255; data[i + 2 * SIZE * SIZE] = pixels[i * 4 + 2] / 255 }
          const result = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]) })
          if (!active || stopRef.current) break
          const output = result[session.outputNames[0]], raw = output.data as Float32Array, n = output.dims[2]
          let ball: Box | null = null, hoop: Box | null = null
          for (let i = 0; i < n; i++) {
            const b = raw[4 * n + i], r = raw[5 * n + i]
            const box = { x: raw[i], y: raw[n + i], w: raw[2 * n + i], h: raw[3 * n + i], score: Math.max(b, r) }
            if (b > 0.3 && b > r && (!ball || b > ball.score)) ball = box
            if (r > 0.3 && r > b && (!hoop || r > hoop.score)) hoop = box
          }
          const next = counter.current.update(ball, hoop, Date.now())
          setCounts({ ...next })
          await new Promise(r => setTimeout(r, 0))
        }
      } catch (e) { if (active) { end(); setStatus(`无法启动识别：${e instanceof Error ? e.message : String(e)}`) } }
    }
    void run()
    return () => { active = false; end(); if (session) void session.release() }
  }, [])
  const finish = async () => {
    end(); setFinished(true); setStatus('识别已停止')
    const current = counter.current.counts
    if (!current.attempts) { setStatus('未识别到投篮，未生成记录'); return }
    setBusy(true)
    const minutes = Math.max(1, Math.min(240, Math.ceil((Date.now() - started.current) / 60000)))
    const result = await mutate(() => api.training.submit({ drillId: drill, date: todayStr(), durationMin: minutes, rpe: 5, notes: '摄像头自动识别（实验功能）；疲劳度使用默认值 5', sets: [{ location: null, attempts: current.attempts, makes: current.makes, reps: 0 }] }), '摄像头训练记录已保存')
    setStatus(result ? '训练记录已保存' : '保存失败，请检查训练时长和识别结果，再重试'); setSaved(!!result)
    setBusy(false)
  }
  return <div className="px-4 pb-8 pt-4 space-y-4"><button className="text-hoop" onClick={close}>← 返回训练中心</button><div className="panel rounded-xl p-4 space-y-3"><div className="tag-orange">CAMERA TRAINING · 实验功能</div><h2 className="text-2xl font-bold text-chalk">摄像头投篮识别</h2><p className="text-sm text-silver/70">固定手机拍摄一个篮筐，确保篮球靠近篮筐时始终在画面中。识别可能漏计或误判，请训练后核对记录。</p><label className="block text-sm text-silver">训练项目<select className="field mt-2" value={drill} disabled={finished} onChange={e=>setDrill(e.target.value)}><option value="spot_shooting">定点投篮</option><option value="free_throw">罚球训练</option><option value="three_point">三分训练</option></select></label><video ref={video} playsInline muted className="w-full rounded-lg bg-black"/><p className="text-sm text-silver">{status}</p><div className="grid grid-cols-3 gap-2 text-center"><div>出手<strong className="block text-3xl text-chalk">{counts.attempts}</strong></div><div>命中<strong className="block text-3xl text-hoop">{counts.makes}</strong></div><div>命中率<strong className="block text-3xl text-chalk">{counts.attempts ? Math.round(counts.makes / counts.attempts * 100) + '%' : '—'}</strong></div></div><button className="w-full rounded-lg bg-hoop p-3 font-bold text-white disabled:opacity-50" disabled={busy || saved || !started.current || (finished && !counts.attempts)} onClick={()=>void finish()}>{busy ? '正在保存…' : saved ? '已保存' : finished ? '重试保存' : '结束并自动保存'}</button></div></div>
}
