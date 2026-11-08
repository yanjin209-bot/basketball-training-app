import { existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
const ROOT = path.resolve(import.meta.dirname, '../..')
export async function resolve(spec, ctx, next) {
  if (spec === 'better-sqlite3') return { url: pathToFileURL(path.join(import.meta.dirname, 'bsqlite-shim.mjs')).href, shortCircuit: true }
  if (spec === 'vitest') return { url: pathToFileURL(path.join(import.meta.dirname, 'vitest-shim.mjs')).href, shortCircuit: true }
  let p = null
  if (spec.startsWith('@shared/')) p = path.join(ROOT, 'src/shared', spec.slice(8))
  else if ((spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL?.startsWith('file:')) p = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec)
  if (p && !/\.(m?js|ts|json)$/.test(p)) {
    for (const c of [p + '.ts', path.join(p, 'index.ts')]) if (existsSync(c)) return { url: pathToFileURL(c).href, shortCircuit: true }
  }
  return next(spec, ctx)
}
