import { fireEvent, screen } from '@testing-library/react'

import { C1Menu } from '@/components/templates/families/C/C1Menu'
import { cartOf, line, menuProps, wrap } from '@/components/templates/families/C/__tests__/fixtures'

// Falla si el número deja de ser la posición en la categoría, si el subtítulo inventa texto (descripción → primera línea; favorito →
// «El más pedido»; nada → nada), si el agotado se puede elegir, o si el precio pierde la fuente mono.
it('numbers each combo by its position in the category and paints the real subtitles', () => {
  wrap(<C1Menu {...menuProps('C1')} />)
  expect(screen.getByText('El Fogón')).toHaveClass('t-title')
  const first = screen.getByRole('button', { name: 'Elegir el 1: Burger + papas + gaseosa' })
  expect(first).toHaveTextContent('Angus 150 g')
  expect(first).not.toHaveTextContent('Con todo')
  expect(screen.getByRole('button', { name: 'Elegir el 2: Doble carne + papas' })).toHaveTextContent('El más pedido')
  expect(screen.getByRole('button', { name: 'Elegir el 3: Quesadilla' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Elegir el 1: Limonada' })).toBeInTheDocument()
  expect(screen.getByText('32.900')).toHaveClass('font-t-mono')
  expect(screen.getByText('Di el número al mesero o tócalo aquí.')).toBeInTheDocument()
})

// Falla si tocar una fila no la selecciona (aria-pressed), si el CTA no dice «Pedir el {n}» ni pide ese combo, o si tocar la fila ya
// seleccionada no abre su ficha.
it('selects a combo on tap, orders it from the CTA and opens the selected one on a second tap', () => {
  const p = menuProps('C1')
  wrap(<C1Menu {...p} />)
  expect(screen.getByRole('link', { name: 'Ver el pedido' })).toHaveAttribute('href', '/fogon/centro/t/Z2XUVG/pedido')
  const row = screen.getByRole('button', { name: 'Elegir el 2: Doble carne + papas' })
  fireEvent.click(row)
  expect(row).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Pedir el 2' }))
  expect(p.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  expect(screen.queryByRole('button', { name: 'Pedir el 2' })).toBeNull()
  fireEvent.click(row)
  fireEvent.click(row)
  expect(p.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
})

// Falla si el CTA sin selección no muestra el total del pedido en mono, o si el pie no se levanta sobre la barra de Waiter cuando hay ítems.
it('shows the order total in the CTA and lifts the foot above the order bar when the cart has items', () => {
  wrap(<C1Menu {...menuProps('C1', { cart: cartOf([line({})]) })} />)
  const cta = screen.getByRole('link', { name: /Ver el pedido/ })
  expect(cta).toHaveTextContent('$ 65.800')
  expect(cta.parentElement).toHaveClass('sticky', 'bottom-[92px]')
})

// Falla si la búsqueda y las pestañas de Waiter no están, si buscar no conserva el número original, o si el vacío no es honesto.
it('keeps the search and the category tabs, preserves numbering when searching and states an honest empty result', () => {
  const p = menuProps('C1', { query: 'doble' })
  wrap(<C1Menu {...p} />)
  expect(screen.getByRole('searchbox', { name: 'Buscar un plato' })).toHaveValue('doble')
  expect(screen.getByRole('tab', { name: 'Combos' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Elegir el 2: Doble carne + papas' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Elegir el 1/ })).toBeNull()
  wrap(<C1Menu {...menuProps('C1', { query: 'zzz' })} />)
  expect(screen.getByRole('status')).toHaveTextContent('Nada coincide con tu búsqueda')
})
