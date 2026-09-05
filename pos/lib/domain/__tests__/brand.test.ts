import { FONTS, RADII, contrast, inkFor, isHex, meetsContrast, softFor, theme } from '@/lib/domain/brand'

// Vectores generados EJECUTANDO la implementación Python del registro, que es la fuente de verdad del tema:
//   python3 -c "import sys, json; sys.path.insert(0, 'registry'); from registry_app.utils.brand import theme
//     for c in ['#C1873A', '#7A2E2A', '#1A1815', '#FFFFFF', '#808080', '#2F7A4F', '#F2C94C', '#3B5BDB']: print(json.dumps(theme(c, 'Lora', 24)))"
// Si alguien cambia brand.py (umbral de luminancia, mezcla, redondeo) sin tocar este espejo, esta prueba falla.
const PYTHON_THEMES = [
  { color: '#C1873A', colorTexto: '#1A1815', colorSuave: '#F9F3EB', fuente: 'Lora', radio: 24, contraste: 5.73 },
  { color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F2EAEA', fuente: 'Lora', radio: 24, contraste: 9.33 },
  { color: '#1A1815', colorTexto: '#FFFFFF', colorSuave: '#E8E8E8', fuente: 'Lora', radio: 24, contraste: 17.72 },
  { color: '#FFFFFF', colorTexto: '#1A1815', colorSuave: '#FFFFFF', fuente: 'Lora', radio: 24, contraste: 17.72 },
  { color: '#808080', colorTexto: '#1A1815', colorSuave: '#F2F2F2', fuente: 'Lora', radio: 24, contraste: 4.49 },
  { color: '#2F7A4F', colorTexto: '#FFFFFF', colorSuave: '#EAF2ED', fuente: 'Lora', radio: 24, contraste: 5.23 },
  { color: '#F2C94C', colorTexto: '#1A1815', colorSuave: '#FEFAED', fuente: 'Lora', radio: 24, contraste: 11.16 },
  { color: '#3B5BDB', colorTexto: '#FFFFFF', colorSuave: '#EBEFFB', fuente: 'Lora', radio: 24, contraste: 5.67 },
]

// Los 256 valores de canal mezclados al 10 % sobre blanco, de la misma implementación Python:
//   python3 -c "print(''.join('%02X' % round(255 - (255 - c) * 0.10) for c in range(256)))"
// Trece de ellos caen en mitad exacta y Python los manda al par; Math.round los subiría. Esta tabla lo detecta.
const PYTHON_MIX = 'E6E6E6E6E6E6E6E6E6E6E6E7E7E7E7E7E7E7E7E7E8E8E8E8E8E8E8E8E8E8E8E9E9E9E9E9E9E9E9E9EAEAEAEAEAEAEAEAEAEAEAEBEBEBEBEBEBEBEBEBECECECECECECECECECECECEDEDEDEDEDEDEDEDEDEEEEEEEEEEEEEEEEEEEEEEEFEFEFEFEFEFEFEFEFF0F0F0F0F0F0F0F0F0F0F0F1F1F1F1F1F1F1F1F1F2F2F2F2F2F2F2F2F2F2F2F3F3F3F3F3F3F3F3F3F4F4F4F4F4F4F4F4F4F4F4F5F5F5F5F5F5F5F5F5F6F6F6F6F6F6F6F6F6F6F6F7F7F7F7F7F7F7F7F7F8F8F8F8F8F8F8F8F8F8F8F9F9F9F9F9F9F9F9F9FAFAFAFAFAFAFAFAFAFAFAFBFBFBFBFBFBFBFBFBFCFCFCFCFCFCFCFCFCFCFCFDFDFDFDFDFDFDFDFDFEFEFEFEFEFEFEFEFEFEFEFFFFFFFFFF'

// Falla si el tema del POS se separa del que calcula el registro para el comensal (color, tinta, suave o contraste).
it('derives the same theme as registry_app.utils.brand for eight varied colors', () => {
  for (const expected of PYTHON_THEMES) expect(theme(expected.color, 'Lora', 24)).toEqual(expected)
})

// Falla si el redondeo del canal deja de ser el de Python (mitad al par) o cambia la mezcla del 10 %.
it('mixes every channel value exactly like Python round()', () => {
  const grey = (c: number) => `#${c.toString(16).padStart(2, '0').repeat(3)}`
  const mixed = Array.from({ length: 256 }, (_, c) => softFor(grey(c)).slice(1, 3)).join('')
  expect(mixed).toBe(PYTHON_MIX)
})

// Falla si cambia el umbral de 4.5 o la elección blanco/tinta: #808080 queda justo por debajo con ambas tintas.
it('accepts colors at or above 4.5:1 with their chosen ink and rejects the rest', () => {
  expect(meetsContrast('#7A2E2A')).toBe(true)
  expect(meetsContrast('#C1873A')).toBe(true)
  expect(meetsContrast('#808080')).toBe(false)
  expect(inkFor('#808080')).toBe('#1A1815')
  expect(contrast('#FFFFFF', '#1A1815')).toBeCloseTo(17.7155, 4)
  expect(contrast('#1A1815', '#FFFFFF')).toBe(contrast('#FFFFFF', '#1A1815'))
})

// Falla si un valor vacío o desconocido no cae en el mismo valor por defecto que el registro (#C1873A, Instrument Serif, 14).
it('falls back like the registry for empty or unknown inputs and normalizes case', () => {
  expect(theme('', 'nope', 99)).toEqual({ color: '#C1873A', colorTexto: '#1A1815', colorSuave: '#F9F3EB', fuente: 'Instrument Serif', radio: 14, contraste: 5.73 })
  expect(theme('#c1873a', 'Lora', 4)).toMatchObject({ color: '#C1873A', radio: 4 })
  expect(isHex('#7a2e2a')).toBe(true)
  expect(isHex('7A2E2A')).toBe(false)
  expect(isHex('#7A2E2')).toBe(false)
  expect(FONTS).toHaveLength(6)
  expect(RADII).toEqual([4, 14, 24])
})
