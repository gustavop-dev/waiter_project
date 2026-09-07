import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { AddDishWizard } from '@/components/pantry/AddDishWizard'
import { DishCard } from '@/components/pantry/DishCard'
import { DishDetailModal } from '@/components/pantry/DishDetailModal'
import { FilterPanel } from '@/components/pantry/FilterPanel'
import { IngredientRow } from '@/components/pantry/IngredientRow'
import type { DishView, Ingredient } from '@/lib/domain/pantry'
import { messages } from '@/lib/i18n/messages'
import { createDish } from '@/lib/services/pantry'

jest.mock('@/lib/services/pantry', () => ({ createDish: jest.fn(async () => 99) }))
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

const carne: Ingredient = { id: 30, productId: 40, name: 'Carne de res molida', categoryId: 7, categoryName: 'Carnes y aves', qty: 1.5, uomId: 16, uomName: 'kg', uomFactor: 1000, hasImage: false, supplierId: 3, supplierName: 'Carnes y Mar del Valle', supplierPrice: 28000, thresholds: { min: 2, max: 8 } }
const burger: DishView = { id: 2, name: 'Hamburguesa Clásica', categoryIds: [1], availableInPos: true, hasImage: true, price: 32000, servings: 30, level: 'high', available: true,
  recipe: [{ lineId: 1, ingredientId: 30, productId: 40, name: 'Carne de res molida', qty: 150, uomId: 15, uomName: 'g', uomFactor: 1 }] }

// Falla si la tarjeta del menú pierde el badge Disponible, las raciones o el nivel del kit.
it('dish card shows availability, servings and level', async () => {
  const onOpen = jest.fn()
  wrap(<DishCard dish={burger} category="Hamburguesas" onOpen={onOpen} />)
  expect(screen.getByText('Disponible')).toBeInTheDocument()
  expect(screen.getByText('Se pueden servir:').parentElement).toHaveTextContent('Se pueden servir: 30')
  expect(screen.getByText('Alto')).toHaveClass('text-success-ink')
  await userEvent.click(screen.getByRole('button', { name: /Hamburguesa Clásica/ }))
  expect(onOpen).toHaveBeenCalled()
})

// Falla si un plato sin receta muestra raciones inventadas en vez de "Sin receta" y "—".
it('dish card without recipe says so instead of showing numbers', () => {
  wrap(<DishCard dish={{ ...burger, recipe: null, servings: null, level: null }} category="Hamburguesas" onOpen={() => undefined} />)
  expect(screen.getByText('Sin receta')).toBeInTheDocument()
  expect(screen.getByText('—')).toBeInTheDocument()
})

// Falla si el detalle no lista la receta con cantidad, unidad y nivel del ingrediente.
it('dish detail lists the recipe with quantity, unit and ingredient level', () => {
  wrap(<DishDetailModal dish={burger} category="Hamburguesas" ingredients={new Map([[30, carne]])} onClose={() => undefined} />)
  const dialog = screen.getByRole('dialog', { name: 'Detalle del plato' })
  expect(within(dialog).getByText('Se pueden servir 30')).toBeInTheDocument()
  const line = within(dialog).getByRole('listitem')
  expect(line).toHaveTextContent('Carne de res molida')
  expect(line).toHaveTextContent('150 g')
  expect(within(line).getByText('Bajo')).toBeInTheDocument()
})

// Falla si la fila del ingrediente pierde el stock con unidad, el proveedor, el estado o las tres acciones del menú ⋯.
it('ingredient row shows stock, supplier, status and the more menu actions', async () => {
  const onRequest = jest.fn()
  wrap(<ul><IngredientRow ingredient={carne} onEdit={() => undefined} onRequest={onRequest} onDelete={() => undefined} /></ul>)
  expect(screen.getByText('Stock: 1,5 kg')).toBeInTheDocument()
  expect(screen.getByText('Carnes y Mar del Valle')).toBeInTheDocument()
  expect(screen.getByText('Solicitar')).toHaveClass('bg-danger-soft')
  await userEvent.click(screen.getByRole('button', { name: 'Más opciones de Carne de res molida' }))
  expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Editar ingrediente', 'Solicitar ingrediente', 'Eliminar ingrediente'])
  await userEvent.click(screen.getByRole('menuitem', { name: 'Solicitar ingrediente' }))
  expect(onRequest).toHaveBeenCalled()
})

// Falla si el panel de filtros no pinta los chips con conteo o si "Restablecer filtros" no avisa.
it('filter panel renders chips with counts and resets', async () => {
  const onReset = jest.fn()
  const onClick = jest.fn()
  wrap(<FilterPanel onReset={onReset} sections={[{ title: 'NIVEL DE STOCK', options: [{ key: 'all', label: 'Todos', count: 8, active: true, onClick }, { key: 'low', label: 'Bajo', count: 3, active: false, onClick }] }]} />)
  expect(screen.getByRole('button', { name: /Todos 8/ })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: /Bajo 3/ }))
  expect(onClick).toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Restablecer filtros' }))
  expect(onReset).toHaveBeenCalled()
})

// Falla si el wizard deja pasar un plato sin datos, o si al enviar no crea el plato con su categoría, precio y receta.
it('add dish wizard validates step one and creates the dish with its recipe', async () => {
  const onSaved = jest.fn(async () => undefined)
  wrap(<AddDishWizard open onClose={() => undefined} onSaved={onSaved} categories={[{ id: 1, name: 'Hamburguesas', sequence: 1, station: null }]} ingredients={[carne]} units={[{ id: 15, name: 'g', factor: 1 }, { id: 16, name: 'kg', factor: 1000 }]} />)
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Escribe el nombre del plato.')
  await userEvent.type(screen.getByPlaceholderText('Escribe el nombre del plato'), 'Burger BBQ')
  await userEvent.click(screen.getByRole('button', { name: 'Hamburguesas' }))
  await userEvent.type(screen.getByLabelText('Precio'), '35000')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await userEvent.selectOptions(screen.getByLabelText('Nombre del ingrediente'), '40')
  await userEvent.type(screen.getByLabelText('Cantidad'), '180')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y enviar' }))
  expect(createDish).toHaveBeenCalledWith({ name: 'Burger BBQ', categoryIds: [1], description: '', price: 35000, lines: [{ productId: 40, qty: 180, uomId: 16 }] })
  expect(onSaved).toHaveBeenCalled()
})
