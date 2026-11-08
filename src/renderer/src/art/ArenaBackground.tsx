import { memo } from 'react'

/**
 * 球馆背景：聚光灯 + 观众席虚化光斑 + 透视木地板与场地线。
 * 只有 opacity / transform 动画，可在设置中关闭。
 */
export const ArenaBackground = memo(function ArenaBackground({ fx, variant = 'default' }: { fx: boolean; variant?: 'default' | 'intro' }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden ${fx ? 'fx-on' : ''}`}>
      {/* 基底 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#1c2029_0%,#0c0e13_55%,#07080b_100%)]" />

      {/* 观众席虚化光斑 */}
      <div
        className="anim-bokeh absolute -inset-x-10 top-[6%] h-[42%] opacity-[0.35]"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 8% 40%, rgba(255,170,110,0.55) 0 2px, transparent 3px)',
            'radial-gradient(circle at 22% 62%, rgba(255,255,255,0.35) 0 1.5px, transparent 3px)',
            'radial-gradient(circle at 37% 30%, rgba(255,140,80,0.45) 0 2px, transparent 3px)',
            'radial-gradient(circle at 54% 55%, rgba(220,230,255,0.35) 0 1.5px, transparent 3px)',
            'radial-gradient(circle at 68% 35%, rgba(255,200,150,0.45) 0 2px, transparent 3px)',
            'radial-gradient(circle at 83% 60%, rgba(255,255,255,0.3) 0 1.5px, transparent 3px)',
            'radial-gradient(circle at 93% 28%, rgba(255,150,90,0.5) 0 2px, transparent 3px)'
          ].join(','),
          backgroundSize: '260px 120px',
          filter: 'blur(1.2px)'
        }}
      />
      {/* 看台暗带 */}
      <div className="absolute inset-x-0 top-[22%] h-[30%] bg-gradient-to-b from-transparent via-black/50 to-transparent" />

      {/* 聚光灯光锥 */}
      <div className="anim-spot absolute left-1/2 top-[-18%] h-[95%] w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(255,236,214,0.16),transparent_70%)]" />
      <div className="anim-spot absolute left-[18%] top-[-10%] h-[80%] w-[30%] rotate-[14deg] bg-[radial-gradient(ellipse_40%_70%_at_50%_0%,rgba(255,107,32,0.14),transparent_70%)]" style={{ animationDelay: '-2s' }} />
      <div className="anim-spot absolute right-[14%] top-[-10%] h-[80%] w-[30%] -rotate-[14deg] bg-[radial-gradient(ellipse_40%_70%_at_50%_0%,rgba(187,195,207,0.12),transparent_70%)]" style={{ animationDelay: '-4s' }} />

      {/* 透视木地板 */}
      <div className="absolute inset-x-0 bottom-0 h-[46%]" style={{ perspective: '900px', perspectiveOrigin: '50% 0%' }}>
        <div
          className="absolute left-[-40%] right-[-40%] top-0 h-[220%] origin-top"
          style={{
            transform: 'rotateX(64deg)',
            backgroundColor: '#3a2416',
            backgroundImage: [
              'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.0))',
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 64px)',
              'repeating-linear-gradient(90deg, #7a4a2a 0 64px, #6c3f22 64px 128px, #83532f 128px 192px, #70452a 192px 256px)'
            ].join(','),
            maskImage: 'linear-gradient(180deg, transparent 0%, black 18%, black 100%)',
            opacity: 0.55
          }}
        >
          <svg className="absolute left-1/2 top-[6%] h-[60%] w-[60%] -translate-x-1/2" viewBox="0 0 600 600" fill="none" stroke="rgba(247,248,250,0.55)" strokeWidth="5">
            <path d="M40 0 V180 A260 260 0 0 0 560 180 V0" />
            <rect x="200" y="0" width="200" height="290" />
            <circle cx="300" cy="290" r="90" />
            <path d="M260 0 V40 M340 0 V40" />
          </svg>
        </div>
        {/* 地板反光 */}
        <div className="anim-spot absolute left-1/2 top-[8%] h-[70%] w-[55%] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_40%_at_50%_30%,rgba(255,214,170,0.18),transparent_70%)]" />
      </div>

      {/* 暗角 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_45%,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
      {variant === 'intro' && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />}
      {/* 细噪点纹理，减少色带 */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
        }}
      />
    </div>
  )
})
