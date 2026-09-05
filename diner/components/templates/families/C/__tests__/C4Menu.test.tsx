import { fireEvent, screen } from '@testing-library/react'

import { C4Menu } from '@/components/templates/families/C/C4Menu'
import { cartOf, line, menuProps, wrap } from '@/components/templates/families/C/__tests__/fixtures'

// Falla si la pizarra pierde la cabecera centrada con sede y lema reales, si tocar una fila no agrega, si el agotado no va tachado
// con «se acabó» en vez de precio, o si la caja de escasez inventa existencias en vez de nombrar lo que ya se acabó.
it('lists the board with real venue line, adds on tap, strikes the sold-out and names it in the scarcity box', () => {
  const p = menuProps('C4')
  wrap(<C4Menu {...p} />)
  expect(screen.getByText('El Fogón')).toHaveClass('t-title')
  expect(screen.getByText('Centro · Cocina de barrio')).toHaveClass('uppercase')
  fireEvent.click(screen.getByRole('button', { name: 'Agregar: Burger + papas + gaseosa' }))
  expect(p.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  expect(screen.getByText('32.900')).toHaveClass('font-t-mono')
  expect(screen.getByText('Quesadilla')).toHaveClass('line-through')
  expect(screen.getByText('se acabó')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Quesadilla/ })).toBeNull()
  expect(screen.getByText('Hoy ya se acabó: Quesadilla. Cuando se acaban, se acaban.')).toBeInTheDocument()
})

// Falla si «PEDIR Y PAGAR» no enlaza con el pedido, si con ítems no muestra el total, o si sin agotados aparece la caja de escasez.
it('links the chalk CTA to the order with the total and hides the scarcity box when nothing ran out', () => {
  wrap(<C4Menu {...menuProps('C4', { category: 2, cart: cartOf([line({})]) })} />)
  const cta = screen.getByRole('link', { name: /Pedir y pagar/ })
  expect(cta).toHaveAttribute('href', '/fogon/centro/t/Z2XUVG/pedido')
  expect(cta).toHaveTextContent('$ 65.800')
  expect(cta.parentElement).toHaveClass('bottom-[92px]')
  expect(screen.queryByText(/Hoy ya se acabó/)).toBeNull()
})

// Falla si el buscador y las pestañas de Waiter faltan, o si el vacío no es honesto.
it('keeps the search and the tabs and states an honest empty search', () => {
  wrap(<C4Menu {...menuProps('C4', { query: 'zzz' })} />)
  expect(screen.getByRole('searchbox', { name: 'Buscar un plato' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Bebidas' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Nada coincide con tu búsqueda')
})
