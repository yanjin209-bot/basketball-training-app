import { Fragment, type ReactNode } from 'react'

/** 极简 Markdown 渲染（标题 / 列表 / 粗体 / 斜体），不使用 innerHTML，避免注入风险 */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) parts.push(<strong key={i++} className="font-semibold text-chalk">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) parts.push(<code key={i++} className="rounded bg-white/10 px-1 font-mono text-[12px]">{t.slice(1, -1)}</code>)
    else parts.push(<em key={i++} className="text-silver/60 not-italic text-[12px]">{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function Markdown({ text }: { text: string }): JSX.Element {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = (): void => {
    if (!list.length) return
    out.push(
      <ul key={`ul${out.length}`} className="my-1.5 space-y-1">
        {list.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-hoop" />
            <span>{inline(l)}</span>
          </li>
        ))}
      </ul>
    )
    list = []
  }
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    const li = /^\s*(?:[-*•]|\d+[.)、])\s+(.*)$/.exec(line)
    if (li) {
      list.push(li[1])
      return
    }
    flush()
    const h = /^#{1,4}\s+(.*)$/.exec(line)
    if (h) out.push(<div key={idx} className="mb-1 mt-3 font-label text-[14px] font-bold uppercase tracking-[0.12em] text-hoop first:mt-0">{inline(h[1])}</div>)
    else if (line.trim() === '') out.push(<div key={idx} className="h-1.5" />)
    else out.push(<p key={idx} className="leading-relaxed">{inline(line)}</p>)
  })
  flush()
  return <Fragment>{out}</Fragment>
}
