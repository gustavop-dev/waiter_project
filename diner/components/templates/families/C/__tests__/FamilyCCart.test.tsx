import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'

import { FamilyCCart } from '@/components/templates/families/C/FamilyCCart'
import { cartOf, entryOf, line, templateC, wrap } from '@/components/templates/families/C/__tests__/fixtures'
import type { CartLayoutProps } from '@/components/templates/types'
import type { Discount } from '@/lib/types'

// La miniatura de C2 sale de la carta del store (la línea solo trae producto_id): se simula el store con la carta de prueba.
jest.mock('@/lib/stores/dinerStore', () => ({ useDinerStore: (sel: (s: { entry: unknown }) => unknown) => sel({ entry: entryOf() }) }))

const hrefs = { home: '/h', menu: '/m', pay: '/p', table: '/t', signup: '/s' }
const applied: Discount = { porcentaje: 5, monto: 3290, aplicable: true, aplicado: true }
const pending: Discount = { porcentaje: 5, monto: 0, aplicable: true, aplicado: false }
const props = (codigo: string, over: Partial<CartLayoutProps> = {}): CartLayoutProps => ({
  cart: cartOf([line({ nota: 'papas grandes' }), line({ id: 2, producto_id: 5, nombre: 'Limonada', precio: 12900, cantidad: 1, subtotal: 12900 })]),
  template: templateC(codigo), busy: false, error: null, setQty: jest.fn(), remove: jest.fn(), confirm: jest.fn().mockResolvedValue('ord-1'), goPay: jest.fn(), goMenu: jest.fn(), discount: null, retry: jest.fn(), hrefs, ...over,
})

// Falla si C1 pierde la numeración por posición, el banner del 5 % aplicado, el Subtotal/Descuento/Total coherentes, o si las
// acciones del genérico (enviar a cocina, ir a pagar, pagar en la mesa) desaparecen del pie.
it('C1: numbers the lines, shows the applied banner and keeps the three actions', async () => {
  let finish!: (id: string) => void
  const p = props('C1', { discount: applied, confirm: jest.fn().mockReturnValue(new Promise<string>((resolve) => { finish = resolve })) })
  wrap(<FamilyCCart {...p} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Tu pedido' })).toHaveClass('t-title')
  expect(screen.getByText('3 ítems')).toBeInTheDocument()
  expect(screen.getByText('Primera compra: descuento aplicado.')).toBeInTheDocument()
  expect(screen.getByText('papas grandes')).toBeInTheDocument()
  expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('81.990')
  expect(screen.getByText('Descuento primera compra 5%').nextSibling).toHaveTextContent('−3.290')
  expect(screen.getByText('$ 78.700')).toHaveClass('font-t-mono')
  fireEvent.click(screen.getByRole('button', { name: 'Enviar a cocina' }))
  expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled()
  finish('ord-1')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeEnabled())
  expect(p.confirm).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Ir a pagar' }))
  expect(p.goPay).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: 'o pagar en la mesa con el mesero' })).toHaveAttribute('href', '/t')
})

// Falla si donde el marco no dibuja controles un toque en la línea no los abre, si el stepper no cambia la cantidad, si bajar de 1
// no quita la línea, o si el banner disponible no invita al registro.
it('C1: opens the controls on tap, steps and removes, and turns the banner into the signup invitation', () => {
  const p = props('C1', { discount: pending })
  wrap(<FamilyCCart {...p} />)
  expect(screen.getByRole('link', { name: /Regístrate y ahorra 5%/ })).toHaveAttribute('href', '/s')
  expect(screen.queryByRole('button', { name: 'Más' })).toBeNull()
  const row = screen.getByRole('button', { name: /Editar Limonada/ })
  fireEvent.click(row)
  expect(row).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Más' }))
  expect(p.setQty).toHaveBeenCalledWith(2, 2)
  fireEvent.click(screen.getByRole('button', { name: 'Menos' }))
  expect(p.remove).toHaveBeenCalledWith(2)
  fireEvent.click(screen.getByRole('button', { name: 'Quitar: Limonada' }))
  expect(p.remove).toHaveBeenCalledTimes(2)
})

// Falla si C2 no pinta la miniatura real del producto, si el stepper y «Quitar» no están siempre visibles, o si la nota verde del 5 %
// no acompaña al CTA cuando el descuento aplica.
it('C2: shows the product thumbnail, visible steppers and the green discount note', () => {
  const p = props('C2', { discount: applied })
  wrap(<FamilyCCart {...p} />)
  expect(document.querySelector('img')).toHaveAttribute('src', 'https://x/burger.jpg')
  expect(screen.getAllByRole('button', { name: 'Más' })).toHaveLength(2)
  fireEvent.click(screen.getAllByRole('button', { name: 'Más' })[0])
  expect(p.setQty).toHaveBeenCalledWith(1, 3)
  expect(screen.getByText('Incluye tu 5% de primera compra')).toHaveClass('text-free')
})

// Falla si C3 pierde los chips de modificador e «IVA incluido», o si C4 pierde la guía de puntos, el chip «−5% aplicado» junto al total
// o la línea de descuento (que en C4 es el chip, no una fila).
it('C3 chips the modifiers and C4 puts the applied discount as a chip next to the total', () => {
  wrap(<FamilyCCart {...props('C3', { discount: applied })} />)
  expect(screen.getByText('papas grandes')).toHaveClass('rounded-[6px]')
  expect(screen.getAllByText('IVA incluido')).toHaveLength(2)
  expect(screen.getByText('Descuento primera compra 5%')).toBeInTheDocument()
  cleanup()
  wrap(<FamilyCCart {...props('C4', { discount: applied })} />)
  expect(screen.getByText('−5% aplicado')).toBeInTheDocument()
  expect(screen.queryByText('Descuento primera compra 5%')).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: 'Tu pedido' }).parentElement).toHaveClass('flex-col')
})

// Falla si C5 pierde el selector de propina (10 % por defecto, como el marco), si el Total no la incluye, o si el número de línea no va en mono.
it('C5: offers the tip selector and includes the tip in the total', () => {
  wrap(<FamilyCCart {...props('C5', { discount: applied })} />)
  expect(screen.getByRole('radio', { name: '10%' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByText('Propina 10%').nextSibling).toHaveTextContent('7.870')
  expect(screen.getByText('$ 86.570')).toHaveClass('font-t-mono')
  fireEvent.click(screen.getByRole('radio', { name: 'Sin propina' }))
  expect(screen.queryByText(/Propina 10%/)).toBeNull()
  expect(screen.getByText('$ 78.700')).toBeInTheDocument()
  expect(screen.getByText('La propina se confirma al pagar.')).toBeInTheDocument()
})

// Falla si lo de los demás en la mesa se puede editar o desaparece, si el carrito vacío no lleva a la carta, o si un carrito que no cargó
// se presenta como vacío en vez de ofrecer reintentar.
it('keeps the others read-only and tells the truth on empty and failed carts', () => {
  const p = props('C1', { cart: cartOf([line({}), line({ id: 3, comensal: 'x', mio: false, nombre: 'Agua' })]) })
  wrap(<FamilyCCart {...p} />)
  const others = screen.getByText('Pedido por otros en la mesa').parentElement as HTMLElement
  expect(within(others).getByText('Agua')).toBeInTheDocument()
  expect(within(others).queryByRole('button')).toBeNull()
  wrap(<FamilyCCart {...props('C1', { cart: cartOf([]) })} />)
  fireEvent.click(screen.getByRole('button', { name: 'Ver la carta' }))
  const failed = props('C1', { cart: null, error: 'Error 503' })
  wrap(<FamilyCCart {...failed} />)
  fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
  expect(failed.retry).toHaveBeenCalledTimes(1)
})
