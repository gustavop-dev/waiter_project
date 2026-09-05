import { fireEvent, screen } from '@testing-library/react'

import { F2Menu } from '@/components/templates/families/F/F2Menu'
import { compartir, menuProps, rollos, wrap } from '@/components/templates/families/F/__tests__/fixtures'

// Falla si la cuadrícula no pinta hasta cuatro celdas con precio en versalitas y nombre «· N piezas», si la primera no queda seleccionada con borde negro, o si el pie no lleva su precio y el CTA.
it('paints the category as a 2×2 grid with the selected cell outlined and the price in the footer', () => {
  const props = menuProps('F2', { category: 1 })
  wrap(<F2Menu {...props} />)
  expect(screen.getAllByRole('button', { name: /piezas/ })).toHaveLength(3)
  expect(screen.getByRole('button', { name: /California · 8 piezas/, pressed: true })).toHaveClass('border-t-tinta')
  expect(screen.getByRole('button', { name: /Spicy tuna · 8 piezas/, pressed: false })).toHaveClass('border-t-borde')
  expect(screen.getByText('Rollos · 3 platos')).toBeInTheDocument()
  expect(screen.getByText('28.000', { selector: '.text-\\[20px\\]' })).toHaveClass('font-t-mono')
  fireEvent.click(screen.getByRole('button', { name: 'Agregar al pedido' }))
  expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
})

// Falla si tocar una celda no la selecciona, si tocarla de nuevo (o el título) no abre el plato, o si el pie no cambia al seleccionado.
it('selects on tap, opens on the second tap or from the title, and moves the footer price', () => {
  const props = menuProps('F2', { category: 1 })
  wrap(<F2Menu {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /Spicy tuna/, pressed: false }))
  expect(screen.getByRole('button', { name: /Spicy tuna/, pressed: true })).toBeInTheDocument()
  expect(screen.getByText('34.000', { selector: '.text-\\[20px\\]' })).toBeInTheDocument()
  expect(props.onOpen).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Spicy tuna/, pressed: true }))
  expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  fireEvent.click(screen.getByRole('button', { name: 'Spicy tuna' }))
  expect(props.onOpen).toHaveBeenCalledTimes(2)
})

// Falla si con más de cuatro platos la cuarta celda no es «Elige» con el resto, o si desplegarla no lista los demás con su ＋.
it('turns the fourth cell into Elige when the category has more than four dishes', () => {
  const props = menuProps('F2', { entry: { ...menuProps('F2').entry, carta: { restaurante: 'k', categorias: [{ id: 1, nombre: 'Todo junto', productos: [...rollos.productos, ...compartir.productos] }] } } })
  wrap(<F2Menu {...props} />)
  const choose = screen.getByRole('button', { name: /Elige/, expanded: false })
  expect(choose).toHaveTextContent('3 más')
  expect(choose).toHaveClass('border-dashed')
  fireEvent.click(choose)
  expect(screen.getByRole('list')).toHaveTextContent('Sopa miso')
  expect(screen.getByRole('button', { name: /Anguila de río · 6 piezas/, pressed: false })).toHaveClass('opacity-55')
  fireEvent.click(screen.getByRole('button', { name: 'Agregar: Sopa miso' }))
  expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }))
})

// Falla si un plato agotado seleccionado deja añadir, o si sin platos no se dice la verdad.
it('never adds a sold-out selection and tells the truth when the category is empty', () => {
  wrap(<F2Menu {...menuProps('F2', { entry: menuProps('F2').entry, category: 2 })} />)
  fireEvent.click(screen.getByRole('button', { name: /Anguila/, pressed: false }))
  expect(screen.queryByRole('button', { name: 'Agregar al pedido' })).toBeNull()
  expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0)
  wrap(<F2Menu {...menuProps('F2', { entry: { ...menuProps('F2').entry, carta: { restaurante: 'k', categorias: [] } } })} />)
  expect(screen.getByRole('status')).toHaveTextContent('La carta está vacía por ahora')
})
