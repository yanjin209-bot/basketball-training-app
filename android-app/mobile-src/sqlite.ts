// Synchronous better-sqlite3 subset used by the original services, backed by sql.js.
export class SqliteAdapter {
  constructor(public raw: any) {}
  exec(sql: string) { this.raw.run(sql) }
  pragma(sql: string, opts?: { simple?: boolean }) {
    const result = this.raw.exec(`PRAGMA ${sql}`)
    if (opts?.simple) return result[0]?.values[0]?.[0]
    return result[0]?.values.map((row: any[]) => Object.fromEntries(result[0].columns.map((c: string, i: number) => [c, row[i]]))) ?? []
  }
  transaction<T>(fn: () => T) { return () => { this.raw.run('SAVEPOINT court_tx'); try { const v=fn(); this.raw.run('RELEASE court_tx'); return v } catch (e) { this.raw.run('ROLLBACK TO court_tx'); this.raw.run('RELEASE court_tx'); throw e } } }
  prepare(sql: string) {
    const db=this.raw
    const bind = (args: any[]) => {
      if(args.length===1 && args[0] && typeof args[0]==='object' && !Array.isArray(args[0])) return Object.fromEntries(Object.entries(args[0]).map(([k,v])=>[`@${k}`,v]))
      return args
    }
    const rows=(args:any[],one:boolean)=>{const st=db.prepare(sql);try { st.bind(bind(args)); const out:any[]=[];while(st.step()){out.push(st.getAsObject());if(one)break}return one?out[0]:out } finally { st.free() }}
    return {get:(...a:any[])=>rows(a,true),all:(...a:any[])=>rows(a,false),run:(...a:any[])=>{const st=db.prepare(sql);try { st.bind(bind(a));while(st.step()){} } finally {st.free()} const changes=db.getRowsModified();const id=db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] ?? 0;return {changes,lastInsertRowid:id}}}
  }
}
