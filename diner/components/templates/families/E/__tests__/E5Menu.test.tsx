import { fireEvent, screen, within } from '@testing-library/react'

import { E5Menu } from '@/components/templates/families/E/E5Menu'
import { cartOf, line, menuProps, wrap } from '@/components/templates/families/E/__tests__/fixtures'

jest.mock('@/lib/stores/dinerStore', () => ({ useDinerStore: () => ({ account: null }) }))

const slots = () => within(screen.getByRole('list', { name: 'Tu flight' })).getAllByRole('listitem')

// Falla si los cuatro huecos no empiezan vacíos con el CTA bloqueado, si el ＋ de una fila no llena un hueco con el nombre corto real,
// si el rótulo no cuenta los que faltan, o si el elegido sigue en la lista.
it('fills the four slots from the rows and counts what is missing', () => {
  const props = menuProps('E5')
  wrap(<E5Menu {...props} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arma tu flight')
  expect(screen.getByText('Elige cuatro')).toBeInTheDocument()
  expect(slots()).toHaveLength(4)
  expect(screen.getAllByLabelText('Hueco libre')).toHaveLength(4)
  expect(screen.getByText('Añade 4 más')).toHaveClass('uppercase')
  expect(screen.getByRole('button', { name: 'Faltan 4 para pedir' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Añadir al flight: Golden Ale' }))
  expect(screen.getByRole('button', { name: 'Quitar del flight: Golden Ale' })).toHaveTextContent('Golden')
  expect(screen.getByRole('button', { name: 'Quitar del flight: Golden Ale' })).toHaveClass('bg-t-acento')
  expect(screen.getAllByLabelText('Hueco libre')).toHaveLength(3)
  expect(screen.getByText('Añade 3 más')).toBeInTheDocument()
  expect(screen.getByText('1 de 4 · $ 14.000')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Añadir al flight: Golden Ale' })).toBeNull()
  expect(props.onAdd).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Quitar del flight: Golden Ale' }))
  expect(screen.getAllByLabelText('Hueco libre')).toHaveLength(4)
})

// Falla si al completar el flight el CTA no pasa a acento con la suma real, o si «Pedir flight» no agrega los cuatro y va al pedido.
it('unlocks the CTA with the real sum when complete and adds the four dishes', () => {
  const props = menuProps('E5')
  wrap(<E5Menu {...props} />)
  for (const name of ['Golden Ale', 'IPA de la casa', 'Humo de páramo', 'Alitas BBQ']) fireEvent.click(screen.getByRole('button', { name: `Añadir al flight: ${name}` }))
  expect(screen.getByText('Listo para pedir')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Añadir al flight: Papas rústicas' })).toBeDisabled()
  const cta = screen.getByRole('link', { name: /Pedir flight · \$ 92\.000/ })
  expect(cta).toHaveClass('bg-t-acento')
  expect(cta).toHaveAttribute('href', '/norte/centro/t/Z2XUVG/pedido')
  fireEvent.click(cta)
  expect(props.onAdd).toHaveBeenCalledTimes(4)
  expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }))
  expect(screen.getAllByLabelText('Hueco libre')).toHaveLength(4)
})

// Falla si el agotado ofrece ＋, si tocar el nombre no abre el plato, si los atributos se inventan, o si la búsqueda y las categorías faltan.
it('keeps the whole menu: opens from the name, hides ＋ on sold out, shows attributes only when present', () => {
  const props = menuProps('E5')
  wrap(<E5Menu {...props} />)
  fireEvent.click(screen.getByText('IPA de la casa'))
  expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  expect(screen.queryByRole('button', { name: 'Añadir al flight: Sour de maracuyá' })).toBeNull()
  expect(screen.getByText('Sour de maracuyá').closest('li')).toHaveClass('opacity-45')
  expect(screen.getByText('4.8% · 22 IBU · ligera')).toHaveClass('font-t-mono')
  expect(within(screen.getByText('Papas rústicas').closest('li') as HTMLElement).queryByText(/IBU|%/)).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ipa' } })
  expect(props.setQuery).toHaveBeenCalledWith('ipa')
  fireEvent.click(screen.getByRole('tab', { name: 'Grifos' }))
  expect(props.setCategory).toHaveBeenCalledWith(1)
})

// Falla si con ítems en el pedido no hay camino al carrito con el total mientras el flight sigue bloqueado.
it('offers the order with its total above the locked CTA', () => {
  wrap(<E5Menu {...menuProps('E5', { cart: cartOf([line({ id: 1, cantidad: 2, subtotal: 28000 })]) })} />)
  expect(screen.getByRole('link', { name: 'Ver pedido · $ 28.000' })).toHaveAttribute('href', '/norte/centro/t/Z2XUVG/pedido')
  expect(screen.getByRole('button', { name: 'Faltan 4 para pedir' })).toBeDisabled()
})
