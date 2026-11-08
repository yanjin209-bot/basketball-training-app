import initSqlJs from 'sql.js/dist/sql-asm.js'
import { SqliteAdapter } from './sqlite'
import { migrate } from '../../src/main/db/schema'
import { CourtService } from '../../src/main/services/court'
import { CoachService } from '../../src/main/services/coach'
import { exportData, importData } from '../../src/main/services/backup'

const DB_NAME='court-rise-mobile-original-v1'
const native=(window as any).CourtNative
let nextId=1
const waiting=new Map<number,{resolve:(v:string)=>void,reject:(e:Error)=>void}>()
;(window as any).__courtNativeReply=(id:number,json:string)=>{const p=waiting.get(id);if(!p)return;waiting.delete(id);try{const r=JSON.parse(json);r.ok?p.resolve(r.value):p.reject(new Error(r.value))}catch(e){p.reject(new Error('系统响应无效'))}}
function nativeCall(method:string,...args:any[]):Promise<string>{return new Promise((resolve,reject)=>{const id=nextId++;waiting.set(id,{resolve,reject});try{native[method](id,...args)}catch(e){waiting.delete(id);reject(e)}})}
function toBase64(bytes:Uint8Array){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)}
function fromBase64(s:string){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function saveFile(name:string,bytes:Uint8Array):Promise<boolean>{if(native)return !!(await nativeCall('saveDocument',name,toBase64(bytes)));const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes]));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
async function openFile():Promise<Uint8Array|null>{if(native){const result=await nativeCall('openDocument');return result?fromBase64(result):null}return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>{const f=input.files?.[0];if(!f){resolve(null);return}f.arrayBuffer().then(b=>resolve(new Uint8Array(b)),()=>resolve(null))};input.oncancel=()=>resolve(null);input.click()})}
const nativeFetch=(url:string,init:any)=>{if(!native)return fetch(url,init);return new Promise((resolve,reject)=>{if(init.signal?.aborted){reject(new DOMException('Aborted','AbortError'));return}const abort=()=>reject(new DOMException('Aborted','AbortError'));init.signal?.addEventListener('abort',abort,{once:true});nativeCall('request',url,JSON.stringify(init.headers),init.body).then(text=>{const r=JSON.parse(text);resolve({ok:r.status>=200&&r.status<300,status:r.status,text:async()=>r.body})},reject).finally(()=>init.signal?.removeEventListener('abort',abort))})}
function openStorage():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function read(db:IDBDatabase):Promise<Uint8Array|undefined>{return new Promise((resolve,reject)=>{const t=db.transaction('data','readonly'),r=t.objectStore('data').get('sqlite');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function write(db:IDBDatabase,bytes:Uint8Array):Promise<void>{return new Promise((resolve,reject)=>{const t=db.transaction('data','readwrite');t.objectStore('data').put(bytes,'sqlite');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
export async function createMobileApi():Promise<any>{
 const storage=await openStorage();const SQL=await initSqlJs();const saved=await read(storage);let raw=new SQL.Database(saved);let db=new SqliteAdapter(raw);migrate(db as never);let court=new CourtService(db as never)
 const makeCoach=()=>new CoachService(court,{available:()=>!!native?.secureAvailable(),encrypt:(v:string)=>{const result=native.encrypt(v);if(!result)throw Error('安全存储不可用');return result},decrypt:(v:string)=>native.decrypt(v)},nativeFetch as never)
 let coach=makeCoach();const snapshot=()=>{const bytes=raw.export();raw.run('PRAGMA foreign_keys = ON');return bytes};await write(storage,snapshot());let queue=Promise.resolve()
 // Serialize operations and persist even reads: dashboard and stats may generate daily quests.
 const call=(fn:()=>any)=>{const task=queue.then(async()=>{const before=snapshot();try{const result=await fn();await write(storage,snapshot());return result}catch(e){raw.close();raw=new SQL.Database(before);raw.run('PRAGMA foreign_keys = ON');db=new SqliteAdapter(raw);court=new CourtService(db as never);coach=makeCoach();throw e}});queue=task.then(()=>undefined,()=>undefined);return task}

 return {
  bootstrap:()=>call(()=>({player:court.getPlayer(),settings:court.getSettings(),platform:'android',version:'0.2.0'})),
  player:{create:(x:any)=>call(()=>court.createPlayer(x)),update:(x:any)=>call(()=>court.updatePlayer(x))},
  dashboard:()=>call(()=>court.dashboard()),
  training:{list:(x:any)=>call(()=>court.listSessions(x||{})),submit:(x:any)=>call(()=>court.submitTraining(x)),update:(id:number,x:any)=>call(()=>court.updateTraining(id,x)),remove:(id:number)=>call(()=>court.removeTraining(id))},
  quests:{claim:(id:number)=>call(()=>court.claimQuest(id))},
  tests:{list:()=>call(()=>court.listTests()),submit:(x:any)=>call(()=>court.submitTest(x)),submitQuiz:(a:any)=>call(()=>court.submitQuiz(a)),computeAstTo:()=>call(()=>court.computeAstTo()),remove:(id:number)=>call(()=>court.removeTest(id))},
  badges:()=>call(()=>court.badges()),stats:()=>call(()=>court.stats()),
  games:{add:(x:any)=>call(()=>court.addGame(x)),update:(id:number,x:any)=>call(()=>court.updateGame(id,x)),remove:(id:number)=>call(()=>court.removeGame(id))},
  season:{summary:(i:number)=>call(()=>court.seasonSummary(i)),markSeen:(i:number)=>call(()=>{court.setSettings({lastSeasonSeen:i})})},
  settings:{get:()=>call(()=>court.getSettings()),set:(x:any)=>call(()=>court.setSettings(x))},
  ai:{getConfig:()=>call(()=>coach.getPublicConfig()),saveConfig:(x:any)=>call(()=>coach.saveConfig(x)),test:()=>call(()=>coach.testConnection()),chat:(x:any)=>call(()=>coach.chat(x)),report:(x:any)=>call(()=>coach.report(x))},
  data:{
   exportJson:async()=>{const data=await call(()=>JSON.stringify(exportData(db as never),null,2));const ok=await saveFile(`court-rise-${new Date().toISOString().slice(0,10)}.json`,new TextEncoder().encode(data));return {ok,path:ok?'已选择的文件':''}},
   importJson:async()=>{const bytes=await openFile();if(!bytes)return {ok:false,message:'已取消'};if(!window.confirm('导入会覆盖当前所有本地数据，建议先导出备份。确定继续吗？'))return {ok:false,message:'已取消'};let parsed:any;try{parsed=JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('文件不是有效的 JSON')}return call(()=>{const previousAiConfig=court.getRaw('ai.config');const result=importData(db as never,parsed);court.setRaw('ai.config',previousAiConfig);if(court.getPlayer())court.reconcile();return {ok:true,message:`导入成功：${result.sessions} 条训练记录`}})},
   backupDb:async()=>{const bytes=await call(()=>snapshot());const ok=await saveFile(`court-rise-${new Date().toISOString().slice(0,10)}.db`,bytes);return {ok,path:ok?'已选择的文件':''}},location:async()=> '本机应用存储（卸载会删除）'},
  win:{minimize:()=>{},toggleMaximize:()=>{},close:()=>{},onMaximizeChange:()=>()=>{}}
 }
}
