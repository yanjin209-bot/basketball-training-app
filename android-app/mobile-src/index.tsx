import { createMobileApi } from './mobile-api'
async function main(){
 try { (window as any).courtRise=await createMobileApi();await import('./render') }
 catch(e){document.body.textContent=`启动失败：${e instanceof Error?e.message:String(e)}`}
}
void main()
