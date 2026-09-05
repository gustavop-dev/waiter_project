import { fireEvent, screen, within } from '@testing-library/react'

import { B3Menu } from '@/components/templates/families/B/B3Menu'
import { menuProps, picada, sushi, wrap } from '@/components/templates/families/B/__tests__/fixtures'

// Falla si el selector de grupo no es estado con aria-pressed, si «por persona» no es precio ÷ grupo con datos reales (y solo en
// las categorías para compartir), o si el CTA dorado no añade la bandeja destacada.
it('lets the diner pick the group size and prices the featured tray per person', () => {
  const p = menuProps('B3')
  wrap(<B3Menu {...p} />)
  const group = screen.getByRole('group', { name: 'Tamaño del grupo' })
  expect(within(group).getByRole('button', { name: '4', pressed: true })).toBeInTheDocument()
  expect(screen.getByText('30.000 por persona · Recomendada para 4')).toHaveClass('font-t-mono')
  fireEvent.click(within(group).getByRole('button', { name: '6' }))
  expect(within(group).getByRole('button', { name: '6', pressed: true })).toBeInTheDocument()
  expect(screen.getByText('20.000 por persona · Recomendada para 6')).toBeInTheDocument()
  expect(screen.queryByText(/ahorras/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Añadir bandeja: Picada para compartir' }))
  expect(p.onAdd).toHaveBeenCalledWith(picada)
  expect(screen.getByRole('button', { name: 'Añadir bandeja: Picada para compartir' })).toHaveTextContent('Añadir bandeja · 120.000')
})

// Falla si en «Todo» no se pintan todas las categorías (compartir primero) con su destacada y sus secundarias, o si tocar una no abre el plato.
it('paints every category with a featured card and secondary rows, sharing first', () => {
  const p = menuProps('B3')
  wrap(<B3Menu {...p} />)
  const heads = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(heads).toEqual(['Para compartir', 'Hamburguesas', 'Bebidas', 'Platos'])
  expect(screen.getAllByRole('article')).toHaveLength(4)
  const row = screen.getByRole('button', { name: /Tabla de sushi/ })
  expect(row).toHaveTextContent('24 piezas variadas')
  fireEvent.click(row)
  expect(p.onOpen).toHaveBeenCalledWith(sushi)
  expect(screen.getByRole('button', { name: /Club Colombia/ })).toHaveTextContent('Agotado')
})

// Falla si con una categoría elegida se cuelan otras, si la destacada sin foto no muestra «Foto de la bandeja», o si una categoría
// que no es para compartir inventa un precio por persona.
it('filters to one category and omits per-person pricing outside sharing categories', () => {
  wrap(<B3Menu {...menuProps('B3', { category: 1 })} />)
  expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('Foto de la bandeja')).toBeInTheDocument()
  expect(screen.getByText('Hamburguesa Angus')).toBeInTheDocument()
  expect(screen.queryByText(/por persona/)).toBeNull()
  expect(screen.getByRole('tab', { name: 'Hamburguesas', selected: true })).toBeInTheDocument()
})
