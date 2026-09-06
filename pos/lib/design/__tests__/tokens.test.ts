import { KIT_DARK, KIT_LIGHT, THEME_MODES, cssVar } from '@/lib/design/tokens'
import { contrast } from '@/lib/domain/brand'

// Falla si el primario deja de ser el azul medido en el kit. El kit pinta texto blanco sobre él a 3.8:1,
// por debajo del 4.5 que exige la marca del comensal (Plan G); se acepta como decisión del kit y se exige ≥ 3:1 (AA para texto grande).
it('primary is the kit blue and white text on it keeps at least 3:1', () => {
  expect(KIT_LIGHT.primary).toBe('#447DFC')
  expect(contrast(KIT_LIGHT.primary, '#FFFFFF')).toBeGreaterThanOrEqual(3)
})

// Falla si algún token del tema oscuro se queda sin valor o hereda del claro por descuido.
it('dark theme defines every token with a distinct background', () => {
  expect(Object.keys(KIT_DARK).sort()).toEqual(Object.keys(KIT_LIGHT).sort())
  expect(KIT_DARK.canvas).toBe('#131316')
  expect(contrast(KIT_DARK.canvas, KIT_DARK.ink)).toBeGreaterThanOrEqual(4.5)
})

it('exposes the three theme modes of the kit', () => {
  expect(THEME_MODES).toEqual(['system', 'light', 'dark'])
})

// Falla si el nombre de la variable CSS deja de coincidir con el que declara globals.css.
it('names css variables in kebab-case under --kit-', () => {
  expect(cssVar('primarySoft')).toBe('--kit-primary-soft')
  expect(cssVar('ink')).toBe('--kit-ink')
})
