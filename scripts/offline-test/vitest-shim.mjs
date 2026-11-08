import assert from 'node:assert/strict'
const tests = []
let prefix = []
const beforeEachs = []
export function describe(name, fn) { prefix.push(name); fn(); prefix.pop() }
export function it(name, fn) { tests.push({ name: [...prefix, name].join(' › '), fn, be: [...beforeEachs] }) }
export function beforeEach(fn) { beforeEachs.push(fn) }
export function afterEach() {}
function matchers(v, neg) {
  const ok = (cond, msg) => { if (neg ? cond : !cond) throw new assert.AssertionError({ message: (neg ? 'NOT ' : '') + msg }) }
  return {
    toBe: (e) => ok(Object.is(v, e), `expected ${JSON.stringify(v)} to be ${JSON.stringify(e)}`),
    toEqual: (e) => { let eq = true; try { assert.deepStrictEqual(v, e) } catch { eq = false } ok(eq, `expected ${JSON.stringify(v)} toEqual ${JSON.stringify(e)}`) },
    toBeNull: () => ok(v === null, `expected ${v} null`),
    toBeTruthy: () => ok(!!v, `expected truthy ${v}`),
    toBeGreaterThan: (e) => ok(v > e, `expected ${v} > ${e}`),
    toBeLessThan: (e) => ok(v < e, `expected ${v} < ${e}`),
    toBeCloseTo: (e, d = 2) => ok(Math.abs(v - e) < Math.pow(10, -d) / 2, `expected ${v} ≈ ${e}`),
    toContain: (e) => ok(v.includes(e), `expected ${JSON.stringify(v)} to contain ${JSON.stringify(e)}`),
    toMatchObject: (e) => ok(Object.entries(e).every(([k, x]) => Object.is(v?.[k], x)), `expected ${JSON.stringify(v)} to match ${JSON.stringify(e)}`),
    toThrow: (e) => { let err = null; try { v() } catch (x) { err = x } const m = err && (!e || (e instanceof RegExp ? e.test(err.message) : typeof e === 'function' ? err instanceof e : err.message.includes(e))); ok(!!m, `expected throw ${e} got ${err?.message}`) }
  }
}
export function expect(v) { const m = matchers(v, false); m.not = matchers(v, true); return m }
export async function run() {
  let pass = 0, fail = 0
  for (const t of tests) {
    try { for (const b of t.be) await b(); await t.fn(); pass++ } catch (e) { fail++; console.log('✗', t.name, '\n   ', e.message) }
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail) process.exitCode = 1
}
