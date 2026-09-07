import { parseDinerAttributes, serializeDinerAttributes, textToList } from '@/lib/domain/dinerAttributes'

// Falla si un JSON roto o un tipo inesperado rompe el formulario en vez de salir como {} (contrato 2 del Plan H).
it('parses the diner attributes with tolerance', () => {
  expect(parseDinerAttributes('{"piezas": 8, "picante": 2, "etiquetas": ["popular"], "tamanos": [{"nombre": "Copa", "precio": 18000}], "soloHoy": true}'))
    .toEqual({ piezas: 8, picante: 2, etiquetas: ['popular'], tamanos: [{ nombre: 'Copa', precio: 18000 }], soloHoy: true })
  expect(parseDinerAttributes('no es json')).toEqual({})
  expect(parseDinerAttributes('[1,2]')).toEqual({})
  expect(parseDinerAttributes('{"picante": 9, "abv": "5"}')).toEqual({})
  expect(parseDinerAttributes(false)).toEqual({})
})

// Falla si se guardan claves vacías (la carta pintaría "0 piezas") o si sin atributos no se manda false a Odoo.
it('serializes only the filled keys and false when empty', () => {
  expect(serializeDinerAttributes({ piezas: 0, picante: 0, etiquetas: [], tamanos: [{ nombre: ' ', precio: 0 }], soloHoy: false })).toBe(false)
  expect(JSON.parse(serializeDinerAttributes({ picante: 3, alergenos: ['maní'], tamanos: [{ nombre: ' Doble ', precio: 36900 }] }) as string))
    .toEqual({ picante: 3, alergenos: ['maní'], tamanos: [{ nombre: 'Doble', precio: 36900 }] })
  expect(textToList(' popular, , sin gluten ')).toEqual(['popular', 'sin gluten'])
})
