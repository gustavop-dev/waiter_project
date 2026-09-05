import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Bill } from '@/components/screens/Bill'
import messages from '@/lib/i18n/messages/es.json'
import type { Bill as BillSummary, Entry, OrderStatus } from '@/lib/types'

const mockPush = jest.fn()
const mockAskBill = jest.fn()
let mockOrder: OrderStatus | null = null
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
// Ruta relativa: el moduleNameMapper de jest.config.cjs ('<rootDir>/' sin $1) no resuelve '@/…' dentro de jest.mock.
jest.mock('../../../lib/stores/dinerStore', () => ({ useDinerStore: () => ({ order: mockOrder, askBill: mockAskBill }) }))

const brand = { nombre: 'La Provincia', lema: '', logo: null, saludo: '', mesero: 'Alex', bienvenida: '', color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F6EBEA', fuente: 'Instrument Serif', radio: 14 }
const entry: Entry = { contexto: { restaurante: { slug: 'la-provincia', nombre: 'La Provincia' }, sede: { slug: 'centro', nombre: 'Centro' }, mesa: { numero: 14, token: '8H2KQ7' }, marca: brand }, carta: { restaurante: 'la-provincia', categorias: [] } }
const summary = (total: number, mio: number): BillSummary => ({ ok: true, total, mio, porComensal: [], partes: 2, porParte: total / 2 })
const bill = () => <Bill entry={entry} rest="la-provincia" venue="centro" token="8H2KQ7" id={null} />
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

beforeEach(() => { jest.clearAllMocks() })

// Falla si la pantalla no avisa al salón al abrir, o si "Todo / Lo mío / Dividir" no muestran cada monto y sus partes.
it('asks for the bill on mount and shows all, mine and split amounts', async () => {
  mockAskBill.mockResolvedValue(summary(83700, 38900))
  wrap(bill())
  expect(mockAskBill).toHaveBeenCalledTimes(1)
  expect(await screen.findByText('$ 83.700')).toHaveClass('font-mono')
  expect(screen.getByRole('status')).toHaveTextContent('Un mesero trae la cuenta')
  fireEvent.click(screen.getByRole('tab', { name: 'Lo mío' }))
  expect(screen.getByText('$ 38.900')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Dividir' }))
  expect(screen.getByText('2 partes de 41.850')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Más' }))
  expect(screen.getByText('3 partes de 27.900')).toBeInTheDocument()
})

// Falla si sin nada confirmado la pantalla inventa una cuenta, o si "Volver" no lleva al carrito cuando no hay pedido enviado.
it('says there is nothing to pay yet and goes back to the cart when no order was sent', async () => {
  mockOrder = null
  mockAskBill.mockResolvedValue({ ...summary(0, 0), ok: false, partes: 1, porParte: 0 })
  wrap(bill())
  expect(await screen.findByText('Todavía no hay nada confirmado que cobrar.')).toBeInTheDocument()
  expect(screen.queryByRole('tablist')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Volver al pedido' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/pedido')
})

// Falla si la pasarela aparece habilitada antes de existir, o si "Volver" pierde el pedido en curso.
it('keeps phone payment disabled and returns to the order status when there is one', async () => {
  mockOrder = { id: 'p1', sesion: 's1', estado: 'servido', total: 83700, impuestos: 0, intentos: 1 }
  mockAskBill.mockResolvedValue(summary(83700, 83700))
  wrap(bill())
  expect(await screen.findByRole('button', { name: 'Pagar desde el celular · pronto' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Volver al pedido' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/estado/p1')
})
