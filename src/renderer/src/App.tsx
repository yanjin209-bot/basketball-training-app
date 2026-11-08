import { MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ArenaBackground } from './art/ArenaBackground'
import { CelebrationLayer } from './components/CelebrationLayer'
import { SeasonSummaryModal } from './components/SeasonSummaryModal'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { GameToastStack, PageTransition } from './motion'
import { useApp } from './store/app'
import { Onboarding } from './pages/Onboarding'
import { Lobby } from './pages/Lobby'
import { MyPlayer } from './pages/MyPlayer'
import { Training } from './pages/Training'
import { Attributes } from './pages/Attributes'
import { Badges } from './pages/Badges'
import { Stats } from './pages/Stats'
import { Coach } from './pages/Coach'
import { Settings } from './pages/Settings'

const PAGES = { career: Lobby, player: MyPlayer, training: Training, attributes: Attributes, badges: Badges, stats: Stats, coach: Coach, settings: Settings }

export function App(): JSX.Element {
  const ready = useApp((s) => s.ready)
  const player = useApp((s) => s.player)
  const settings = useApp((s) => s.settings)
  const page = useApp((s) => s.page)
  const pendingSeason = useApp((s) => s.dashboard?.pendingSeasonSummary ?? null)
  const bootstrap = useApp((s) => s.bootstrap)
  const [error, setError] = useState<string | null>(null)
  const [seasonOpen, setSeasonOpen] = useState(false)

  useEffect(() => {
    bootstrap().catch((e) => setError(String(e?.message ?? e)))
  }, [bootstrap])

  useEffect(() => {
    if (pendingSeason) setSeasonOpen(true)
  }, [pendingSeason])

  const reduced = settings.reducedMotion === 'system' ? 'user' : settings.reducedMotion === 'on' ? 'always' : 'never'
  const fx = settings.backgroundFx && settings.reducedMotion !== 'on'
  const Page = PAGES[page]

  return (
    <MotionConfig reducedMotion={reduced}>
      <div className={`relative flex h-full w-full ${settings.reducedMotion === 'on' ? 'reduce-motion' : ''}`}>
        <ArenaBackground fx={fx} variant={player ? 'default' : 'intro'} />
        {error ? (
          <div className="relative z-10 flex h-full w-full flex-col">
            <TitleBar />
            <div className="m-auto max-w-md text-center">
              <div className="tag-orange">STARTUP ERROR</div>
              <p className="mt-3 text-silver">程序启动失败：{error}</p>
            </div>
          </div>
        ) : !ready ? (
          <div className="relative z-10 flex h-full w-full flex-col">
            <TitleBar />
            <div className="m-auto flex flex-col items-center gap-4">
              <motion.div className="h-12 w-12 rounded-full border-[3px] border-hoop border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
              <div className="tag">LOADING CAREER</div>
            </div>
          </div>
        ) : !player ? (
          <div className="relative z-10 flex h-full w-full flex-col">
            <TitleBar />
            <Onboarding />
          </div>
        ) : (
          <>
            <Sidebar />
            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
              <TitleBar showLogo={false} />
              <main className="relative min-h-0 flex-1">
                <PageTransition pageKey={page}>
                  <Page />
                </PageTransition>
              </main>
            </div>
          </>
        )}
        <CelebrationLayer />
        <GameToastStack />
        {pendingSeason != null && <SeasonSummaryModal index={pendingSeason} open={seasonOpen} onClose={() => setSeasonOpen(false)} markSeen />}
      </div>
    </MotionConfig>
  )
}
