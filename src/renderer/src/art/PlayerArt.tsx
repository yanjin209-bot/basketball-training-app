import { useId } from 'react'

interface Props {
  jersey: number
  className?: string
  /** 球衣主色 */
  accent?: string
  /** 左撇子时镜像 */
  mirrored?: boolean
}

/**
 * 原创球员立绘（纯 SVG，可随球衣号码变化）。
 * 采用“剪影 + 双色轮廓光”的体育游戏海报手法：左侧篮球橙、右侧金属银。
 */
export function PlayerArt({ jersey, className = '', accent = '#FF6B20', mirrored = false }: Props): JSX.Element {
  const uid = useId().replace(/:/g, '')
  const id = (n: string): string => `${n}-${uid}`
  return (
    <svg viewBox="0 0 420 760" className={className} role="img" aria-label={`球员立绘 #${jersey}`} style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        {/* 皮肤与身体：横向双色轮廓光 */}
        <linearGradient id={id('body')} x1="70" y1="0" x2="350" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF8A4C" />
          <stop offset="0.12" stopColor="#7A3A1E" />
          <stop offset="0.3" stopColor="#2A1E1A" />
          <stop offset="0.62" stopColor="#1E1B1C" />
          <stop offset="0.86" stopColor="#4E545E" />
          <stop offset="1" stopColor="#D8DEE7" />
        </linearGradient>
        <linearGradient id={id('jersey')} x1="130" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="0.18" stopColor="#1C2029" />
          <stop offset="0.7" stopColor="#151820" />
          <stop offset="1" stopColor="#5D6573" />
        </linearGradient>
        <linearGradient id={id('jerseyV')} x1="0" y1="150" x2="0" y2="370" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={id('shorts')} x1="140" y1="0" x2="290" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={accent} stopOpacity="0.85" />
          <stop offset="0.2" stopColor="#191C24" />
          <stop offset="0.75" stopColor="#12151B" />
          <stop offset="1" stopColor="#555C68" />
        </linearGradient>
        <radialGradient id={id('ball')} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFB07F" />
          <stop offset="0.35" stopColor="#FF6B20" />
          <stop offset="0.8" stopColor="#B4410C" />
          <stop offset="1" stopColor="#5A1F05" />
        </radialGradient>
        <linearGradient id={id('shoe')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F7F8FA" />
          <stop offset="1" stopColor="#9AA3B0" />
        </linearGradient>
        <radialGradient id={id('floor')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={id('rim')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 地面投影 */}
      <ellipse cx="212" cy="728" rx="150" ry="22" fill={`url(#${id('floor')})`} />

      {/* 背后轮廓光晕 */}
      <g opacity="0.55" filter={`url(#${id('rim')})`}>
        <path d="M140 170 C120 240 110 300 118 330" stroke={accent} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M282 172 C300 240 304 300 300 340" stroke="#DCE3EC" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* 腿 */}
      <g stroke={`url(#${id('body')})`} strokeLinecap="round" fill="none">
        <path d="M184 470 L176 584" strokeWidth="44" />
        <path d="M176 584 L172 690" strokeWidth="32" />
        <path d="M240 470 L250 584" strokeWidth="44" />
        <path d="M250 584 L258 690" strokeWidth="32" />
      </g>
      {/* 护膝 / 小腿套 */}
      <rect x="153" y="560" width="44" height="40" rx="12" fill="#14171d" />
      <rect x="229" y="560" width="44" height="40" rx="12" fill="#14171d" />
      <rect x="153" y="566" width="6" height="28" rx="3" fill={accent} opacity="0.9" />
      <rect x="267" y="566" width="6" height="28" rx="3" fill="#C9D0DA" opacity="0.8" />

      {/* 球鞋（原创样式） */}
      <g>
        <path d="M146 694 C146 682 156 676 172 676 C186 676 196 684 198 696 L204 712 C206 722 200 728 190 728 L140 728 C128 728 124 720 128 712 Z" fill={`url(#${id('shoe')})`} />
        <path d="M134 714 L200 714" stroke="#1B1F27" strokeWidth="5" />
        <path d="M150 700 C162 694 176 694 190 702" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M236 696 C238 684 248 676 262 676 C278 676 288 682 288 694 L300 712 C304 720 300 728 290 728 L240 728 C230 728 226 722 228 712 Z" fill={`url(#${id('shoe')})`} />
        <path d="M232 714 L298 714" stroke="#1B1F27" strokeWidth="5" />
        <path d="M244 702 C258 694 272 694 284 700" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* 短裤 */}
      <path d="M156 350 L266 350 L282 470 C262 478 240 480 222 476 L211 424 L200 476 C182 480 160 478 140 470 Z" fill={`url(#${id('shorts')})`} />
      <path d="M156 350 L266 350 L268 364 L154 364 Z" fill="#0E1015" />
      <path d="M150 380 L142 468" stroke={accent} strokeWidth="5" />
      <path d="M272 380 L280 468" stroke="#AEB6C2" strokeWidth="4" opacity="0.8" />

      {/* 右臂（画面右侧，自然下垂） */}
      <g stroke={`url(#${id('body')})`} strokeLinecap="round" fill="none">
        <path d="M268 178 L290 262" strokeWidth="36" />
        <path d="M290 262 L298 338" strokeWidth="29" />
      </g>
      <ellipse cx="300" cy="352" rx="15" ry="19" fill={`url(#${id('body')})`} />
      <rect x="282" y="300" width="31" height="16" rx="6" fill="#F7F8FA" opacity="0.9" />

      {/* 躯干 / 肩部 */}
      <path d="M152 170 C160 152 186 146 210 146 C234 146 260 152 270 170 L276 200 L146 200 Z" fill={`url(#${id('body')})`} />

      {/* 球衣 */}
      <path
        d="M170 156 L190 151 L210 184 L230 151 L250 156 C254 176 262 192 270 206 L268 330 L262 362 L158 362 L152 330 L150 206 C158 192 166 176 170 156 Z"
        fill={`url(#${id('jersey')})`}
      />
      <path d="M170 156 L190 151 L210 184 L230 151 L250 156 C254 176 262 192 270 206 L268 330 L262 362 L158 362 L152 330 L150 206 C158 192 166 176 170 156 Z" fill={`url(#${id('jerseyV')})`} />
      {/* 领口与袖口包边 */}
      <path d="M190 151 L210 184 L230 151" stroke={accent} strokeWidth="5" fill="none" strokeLinejoin="round" />
      <path d="M170 156 C166 176 158 192 150 206" stroke={accent} strokeWidth="4" fill="none" />
      <path d="M250 156 C254 176 262 192 270 206" stroke="#C3CAD4" strokeWidth="4" fill="none" opacity="0.8" />
      {/* 侧边条纹 */}
      <path d="M156 220 L154 356" stroke={accent} strokeWidth="3" opacity="0.7" />
      <path d="M264 220 L266 356" stroke="#BBC3CF" strokeWidth="3" opacity="0.5" />
      {/* 胸前字样 */}
      <text x="210" y="222" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" fontSize="17" letterSpacing="4" fill="#BBC3CF" opacity="0.85">
        RISE
      </text>
      {/* 号码 */}
      <text
        x="210"
        y="298"
        textAnchor="middle"
        fontFamily="Oswald, sans-serif"
        fontWeight="700"
        fontSize={jersey >= 10 ? 76 : 84}
        fill="#F7F8FA"
        stroke={accent}
        strokeWidth="3"
        paintOrder="stroke"
        letterSpacing="-2"
      >
        {jersey}
      </text>

      {/* 左臂（画面左侧，夹球） */}
      <g stroke={`url(#${id('body')})`} strokeLinecap="round" fill="none">
        <path d="M156 178 L128 258" strokeWidth="37" />
        <path d="M128 258 L148 314" strokeWidth="30" />
      </g>
      <rect x="114" y="242" width="30" height="16" rx="6" transform="rotate(-20 129 250)" fill="#F7F8FA" opacity="0.85" />

      {/* 篮球 */}
      <g>
        <circle cx="118" cy="340" r="46" fill={`url(#${id('ball')})`} />
        <g stroke="#2A0F03" strokeWidth="2.6" fill="none" opacity="0.85">
          <path d="M72 340 H164" />
          <path d="M118 294 V386" />
          <path d="M86 306 C104 324 104 356 86 374" />
          <path d="M150 306 C132 324 132 356 150 374" />
        </g>
        <circle cx="118" cy="340" r="46" fill="none" stroke="#FFC8A3" strokeOpacity="0.35" strokeWidth="2" />
      </g>
      {/* 手掌压住篮球 */}
      <path d="M140 304 C156 306 166 320 162 336 C158 348 146 350 140 342 C136 334 134 318 140 304 Z" fill={`url(#${id('body')})`} />

      {/* 颈部与头部 */}
      <rect x="196" y="118" width="28" height="36" rx="10" fill={`url(#${id('body')})`} />
      <ellipse cx="210" cy="90" rx="35" ry="41" fill={`url(#${id('body')})`} />
      {/* 发型轮廓 */}
      <path d="M176 82 C176 56 192 46 210 46 C230 46 246 58 245 82 C238 70 224 64 210 64 C196 64 184 70 176 82 Z" fill="#0D0E11" />
      {/* 头带 */}
      <path d="M175 84 C186 76 234 76 246 84 L245 96 C232 89 188 89 176 96 Z" fill={accent} />
      {/* 耳朵与下颌轮廓光 */}
      <path d="M176 100 C178 116 188 128 202 132" stroke={accent} strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M244 100 C242 116 232 128 218 132" stroke="#E6EBF2" strokeWidth="2.5" fill="none" opacity="0.6" />
    </svg>
  )
}
