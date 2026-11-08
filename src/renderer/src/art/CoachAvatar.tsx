/** 原创教练头像：鸭舌帽 + 哨子 + 战术板轮廓 */
export function CoachAvatar({ size = 64, online = false }: { size?: number; online?: boolean }): JSX.Element {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="rounded-full">
        <defs>
          <linearGradient id="coach-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b313b" />
            <stop offset="1" stopColor="#0f1116" />
          </linearGradient>
          <linearGradient id="coach-skin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff8a4c" />
            <stop offset="0.3" stopColor="#3a2a24" />
            <stop offset="1" stopColor="#8f97a3" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#coach-bg)" />
        <path d="M10 64c2-12 10-18 22-18s20 6 22 18z" fill="#1a1e26" />
        <path d="M24 46l8 9 8-9" fill="none" stroke="#FF6B20" strokeWidth="2.4" />
        <ellipse cx="32" cy="31" rx="11" ry="13" fill="url(#coach-skin)" />
        <path d="M19 27c0-8 6-12 13-12s13 4 13 12z" fill="#15181e" />
        <path d="M30 27h21c1 0 1.4 1.6 0 2l-21 1z" fill="#FF6B20" />
        <path d="M24 21h16" stroke="#BBC3CF" strokeWidth="1.2" opacity="0.5" />
        <circle cx="44" cy="52" r="3.2" fill="#BBC3CF" />
        <path d="M36 47c3 1 6 2.4 8 5" stroke="#BBC3CF" strokeWidth="1.2" fill="none" />
      </svg>
      <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-ink ${online ? 'bg-win shadow-[0_0_10px_#45DDA0]' : 'bg-silver/50'}`} />
    </div>
  )
}
