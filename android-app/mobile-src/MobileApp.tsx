import { MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { ArenaBackground } from '../../src/renderer/src/art/ArenaBackground'
import { CelebrationLayer } from '../../src/renderer/src/components/CelebrationLayer'
import { SeasonSummaryModal } from '../../src/renderer/src/components/SeasonSummaryModal'
import { MENU } from '../../src/renderer/src/components/Sidebar'
import { GameToastStack, PageTransition } from '../../src/renderer/src/motion'
import { useApp, type PageId } from '../../src/renderer/src/store/app'
import { Onboarding } from '../../src/renderer/src/pages/Onboarding'
import { Lobby } from '../../src/renderer/src/pages/Lobby'
import { MyPlayer } from '../../src/renderer/src/pages/MyPlayer'
import { Training } from '../../src/renderer/src/pages/Training'
import { ShotTracker } from './ShotTracker'
function MobileTraining(){ const [camera,setCamera]=useState(false); return camera ? <ShotTracker close={()=>setCamera(false)}/> : <><div className="px-4 pt-4"><button className="w-full rounded-xl bg-hoop p-4 font-bold text-white" onClick={()=>setCamera(true)}>📷 摄像头自动识别投篮 · 实验功能</button></div><Training/></> }
import { Attributes } from '../../src/renderer/src/pages/Attributes'
import { Badges } from '../../src/renderer/src/pages/Badges'
import { Stats } from '../../src/renderer/src/pages/Stats'
import { Coach } from '../../src/renderer/src/pages/Coach'
import { Settings } from '../../src/renderer/src/pages/Settings'
const PAGES={career:Lobby,player:MyPlayer,training:MobileTraining,attributes:Attributes,badges:Badges,stats:Stats,coach:Coach,settings:Settings}
const visible:PageId[]=['career','training','player','stats']
export function MobileApp(){
 const ready=useApp(s=>s.ready),player=useApp(s=>s.player),settings=useApp(s=>s.settings),page=useApp(s=>s.page),go=useApp(s=>s.go),bootstrap=useApp(s=>s.bootstrap),pending=useApp(s=>s.dashboard?.pendingSeasonSummary??null)
 const [error,setError]=useState(''),[menu,setMenu]=useState(false),[seasonOpen,setSeasonOpen]=useState(false)
 useEffect(()=>{bootstrap().catch(e=>setError(String(e?.message??e)))},[bootstrap]);useEffect(()=>{(window as any).courtBack=()=>{if(menu)setMenu(false);else if(page!=='career')go('career')};return()=>{delete (window as any).courtBack}},[menu,page,go]);useEffect(()=>{if(pending)setSeasonOpen(true)},[pending])
 const Page=PAGES[page], reduced=settings.reducedMotion==='system'?'user':settings.reducedMotion==='on'?'always':'never'
 return <MotionConfig reducedMotion={reduced}><div className="mobile-shell"><ArenaBackground fx={settings.backgroundFx && settings.reducedMotion!=='on'} variant={player?'default':'intro'}/><header className="mobile-header"><span className="mobile-logo">◉ COURT<span>//</span>RISE</span><span className="mobile-tag">球场生涯</span>{player&&<button onClick={()=>setMenu(!menu)} aria-label="打开功能菜单" aria-expanded={menu}>☰</button>}</header>{error?<div className="mobile-error">启动失败：{error}</div>:!ready?<div className="mobile-error">正在加载生涯…</div>:!player?<div className="mobile-onboarding"><Onboarding/></div>:<><main className="mobile-main" data-page={page}><PageTransition pageKey={page}><Page/></PageTransition></main><nav className="mobile-nav" aria-label="主导航">{MENU.filter(m=>visible.includes(m.id)).map(m=><button key={m.id} className={page===m.id?'active':''} onClick={()=>{go(m.id);setMenu(false)}}>{m.icon({width:20,height:20})}<span>{m.sub}</span></button>)}<button className={menu?'active':''} onClick={()=>setMenu(!menu)} aria-expanded={menu}><span className="more-icon">•••</span><span>更多</span></button></nav>{menu&&<div className="mobile-menu">{MENU.map(m=><button key={m.id} onClick={()=>{go(m.id);setMenu(false)}}>{m.icon({width:19,height:19})}<span>{m.sub}</span><small>{m.label}</small></button>)}</div>}</> }<CelebrationLayer/><GameToastStack/>{pending!=null&&<SeasonSummaryModal index={pending} open={seasonOpen} onClose={()=>setSeasonOpen(false)} markSeen/>}</div></MotionConfig>
}
