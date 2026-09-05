import { fireEvent, screen, within } from '@testing-library/react'

import { B4Menu, weekday } from '@/components/templates/families/B/B4Menu'
import { angus, menuProps, tacos, wrap } from '@/components/templates/families/B/__tests__/fixtures'

// Falla si la pizarra no pinta un paso por categoría con las opciones y su precio en mono, si el agotado se puede elegir,
// o si inventa un precio único / recargo que la carta no tiene.
it('paints one step per category with the real options and prices', () => {
  wrap(<B4Menu {...menuProps('B4')} />)
  expect(screen.getByText(`Hoy, ${weekday()}`)).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Menú del día')
  const steps = screen.getAllByRole('group')
  expect(steps.map((s) => s.getAttribute('aria-label'))).toEqual(['Hamburguesas', 'Bebidas', 'Platos', 'Para compartir'])
  const option = within(steps[0]).getByRole('button', { name: /Hamburguesa Angus/ })
  expect(option).toHaveAttribute('aria-pressed', 'false')
  expect(within(option).getByText('30.000')).toHaveClass('font-t-mono')
  expect(within(steps[1]).getByRole('button', { name: /Club Colombia/ })).toBeDisabled()
  expect(within(steps[1]).getByRole('button', { name: /Club Colombia/ })).toHaveTextContent('Agotado')
  expect(screen.queryByText(/\+4\.000/)).toBeNull()
})

// Falla si elegir no es un toggle con aria-pressed, si «Ver plato →» no abre el elegido, o si «Armar» no agrega cada elección.
it('builds the menu from one choice per step and opens the chosen dish', () => {
  const p = menuProps('B4')
  wrap(<B4Menu {...p} />)
  const cta = screen.getByRole('button', { name: 'Armar mi menú' })
  expect(cta).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Hamburguesa Angus 30.000' }))
  expect(screen.getByRole('button', { name: 'Hamburguesa Angus 30.000' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Hamburguesa Clásica 20.000' }))
  expect(screen.getByRole('button', { name: 'Hamburguesa Angus 30.000' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Hamburguesa Angus 30.000' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tacos de carne 110.000' }))
  fireEvent.click(screen.getByRole('button', { name: /Elegido: Hamburguesa Angus · Doble carne, cheddar · Ver plato →/ }))
  expect(p.onOpen).toHaveBeenCalledWith(angus)
  fireEvent.click(screen.getByRole('button', { name: 'Armar mi menú · 2 elecciones' }))
  expect(p.onAdd).toHaveBeenCalledTimes(2)
  expect(p.onAdd).toHaveBeenCalledWith(angus)
  expect(p.onAdd).toHaveBeenCalledWith(tacos)
})

// Falla si la búsqueda de Waiter no reduce los pasos o si no dice que nada coincide.
it('filters the steps with the search and reports no matches', () => {
  const { unmount } = wrap(<B4Menu {...menuProps('B4', { query: 'taco' })} />)
  expect(screen.getAllByRole('group')).toHaveLength(1)
  unmount()
  wrap(<B4Menu {...menuProps('B4', { query: 'zzz' })} />)
  expect(screen.getByRole('status')).toHaveTextContent('Nada coincide con tu búsqueda')
})
