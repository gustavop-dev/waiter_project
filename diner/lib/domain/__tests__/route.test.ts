import { parseRoute, pathFor } from '@/lib/domain/route'

// Falla si la URL del NFC (/rest/sede/t/TOKEN) o la de domicilio no llevan a la portada, o si /plato/3 pierde el id.
it('parses table and delivery routes with their screen and id', () => {
  expect(parseRoute(['t', '8H2KQ7'])).toEqual({ token: '8H2KQ7', screen: 'portada', id: null })
  expect(parseRoute([])).toEqual({ token: null, screen: 'portada', id: null })
  expect(parseRoute(['t', '8H2KQ7', 'plato', '3'])).toEqual({ token: '8H2KQ7', screen: 'plato', id: '3' })
  expect(parseRoute(['pedido'])).toEqual({ token: null, screen: 'pedido', id: null })
  expect(pathFor('burger-house', 'poblado', '8H2KQ7', 'plato', 3)).toBe('/burger-house/poblado/t/8H2KQ7/plato/3')
})
