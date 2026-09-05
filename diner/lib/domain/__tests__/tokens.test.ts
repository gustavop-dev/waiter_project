import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [] })

// Falla si el token del radio del restaurante vuelve a chocar con un sufijo de lado de Tailwind (rounded-r, -l, -t, -b…):
// la utilidad compilaría border-top-right en vez del radio del restaurante.
it('names the restaurant radius token so it cannot collide with Tailwind side utilities', () => {
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8')
  expect(css).toContain('--radius-rest: var(--r-radius)')
  expect(css).not.toMatch(/--radius-[rltbse]:/)
  const offenders = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components'))].filter((f) => /\brounded-[rltbse]\b/.test(readFileSync(f, 'utf8')))
  expect(offenders).toEqual([])
})
