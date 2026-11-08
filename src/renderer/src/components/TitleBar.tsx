import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { spring } from '../motion'
import { Logo } from '../art/Logo'

/** 自定义无边框标题栏（可拖动，带 Q 弹窗口按钮） */
export function TitleBar({ showLogo = true }: { showLogo?: boolean }): JSX.Element {
  const [max, setMax] = useState(false)
  useEffect(() => api.win.onMaximizeChange(setMax), [])
  const Btn = ({ onClick, label, danger, children }: { onClick: () => void; label: string; danger?: boolean; children: JSX.Element }): JSX.Element => (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      transition={spring.press}
      className={`no-drag flex h-8 w-11 items-center justify-center rounded-md text-silver/70 transition-colors ${danger ? 'hover:bg-[#e2483c] hover:text-white' : 'hover:bg-white/10 hover:text-chalk'}`}
    >
      {children}
    </motion.button>
  )
  return (
    <div className="drag relative z-50 flex h-10 shrink-0 items-center justify-between pl-5 pr-1.5">
      <div className="flex items-center gap-3">{showLogo && <Logo compact />}</div>
      <div className="flex items-center gap-0.5">
        <Btn onClick={api.win.minimize} label="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" /></svg>
        </Btn>
        <Btn onClick={api.win.toggleMaximize} label={max ? '还原' : '最大化'}>
          {max ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="3.5" width="6.5" height="6.5" /><path d="M4 3.5V2h6v6H8.5" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="8" height="8" /></svg>
          )}
        </Btn>
        <Btn onClick={api.win.close} label="关闭" danger>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.4" /></svg>
        </Btn>
      </div>
    </div>
  )
}
