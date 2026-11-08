import { run } from './vitest-shim.mjs'
for (const f of process.argv.slice(2)) await import(f)
await run()
