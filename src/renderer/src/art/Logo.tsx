export function Logo({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" width={compact ? 22 : 28} height={compact ? 22 : 28}>
        <circle cx="16" cy="16" r="14" fill="#FF6B20" />
        <g stroke="#0b0d11" strokeWidth="1.8" fill="none">
          <path d="M2 16h28M16 2v28" />
          <path d="M6 6.5c5 5 5 14 0 19M26 6.5c-5 5-5 14 0 19" />
        </g>
      </svg>
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-[0.06em] text-chalk">
          COURT<span className="text-hoop">//</span>RISE
        </div>
        {!compact && <div className="mt-1 font-label text-[10px] font-semibold tracking-[0.42em] text-silver/60">球场生涯</div>}
      </div>
    </div>
  )
}
