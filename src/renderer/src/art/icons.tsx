// 原创线性图标（24×24）
import type { SVGProps } from 'react'

const S = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...p
})

export const Icon = {
  career: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M3 21h18M5 21V10l7-6 7 6v11" /><path d="M10 21v-6h4v6" /></svg>
  ),
  player: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><circle cx="12" cy="7" r="3.5" /><path d="M5 21v-2.5A5.5 5.5 0 0 1 10.5 13h3a5.5 5.5 0 0 1 5.5 5.5V21" /><path d="M10 16h4" /></svg>
  ),
  training: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18" /><path d="M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" /></svg>
  ),
  attributes: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4z" /><path d="M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z" /></svg>
  ),
  badges: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 2l7 3v6c0 5-3 8.5-7 10.5C8 19.5 5 16 5 11V5z" /><path d="m9 11.5 2 2 4-4" /></svg>
  ),
  stats: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  ),
  coach: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></svg>
  ),
  settings: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  ),
  play: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
  ),
  pause: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M8 5v14M16 5v14" strokeWidth="3" /></svg>
  ),
  reset: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
  ),
  plus: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 5v14M5 12h14" /></svg>
  ),
  check: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  ),
  arrow: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  back: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
  ),
  trash: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
  ),
  edit: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
  ),
  flame: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 2.5c1.2 4.3 5.7 6 5.7 11a5.7 5.7 0 0 1-11.4 0c0-2.4 1.1-4 2.4-5.2 0 2.1.9 3.3 2.1 3.4.2-3.5-1.1-5.6 1.2-9.2z" /></svg>
  ),
  bolt: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
  ),
  timer: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>
  ),
  send: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>
  ),
  moon: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" /></svg>
  ),
  trophy: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>
  ),
  upload: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 15V3M7 8l5-5 5 5M4 15v5h16v-5" /></svg>
  ),
  download: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M12 3v12M7 10l5 5 5-5M4 15v5h16v-5" /></svg>
  ),
  db: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>
  ),
  test: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><path d="M9 3h6M10 3v6L4.5 19A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-2L14 9V3" /><path d="M7 15h10" /></svg>
  ),
  game: (p: SVGProps<SVGSVGElement> = {}) => (
    <svg {...S(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M3 12h4M17 12h4" /><circle cx="12" cy="12" r="2.5" /></svg>
  )
}
