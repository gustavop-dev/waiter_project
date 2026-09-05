import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { MenuTemplateForm } from '@/components/settings/MenuTemplateForm'
import messages from '@/lib/i18n/messages/es.json'
import { OdooError } from '@/lib/services/errors'
import { gateway, listTemplates, type MenuSettingsContext, type TemplateCatalog, type TemplateSpec, type TemplateTokens } from '@/lib/services/menuTemplates'

jest.mock('@/lib/services/menuTemplates', () => ({ ...jest.requireActual('@/lib/services/menuTemplates'), gateway: jest.fn(), listTemplates: jest.fn() }))
const mGateway = gateway as jest.Mock
const mList = listTemplates as jest.Mock

const TOKENS: TemplateTokens = {
  modo: 'claro', fondo: '#FBF8F2', superficie: '#FFFFFF', tinta: '#1A1815', tintaSuave: '#7A7166', tintaTerciaria: '#9A8F7E', borde: '#EBE3D6',
  acento: '#1A1815', acentoTinta: '#FBF8F2', acentoSuave: '#FDF6EA', displayFont: 'Instrument Serif', displayPeso: 400, displayTracking: '0', displayTransform: 'none',
  cuerpoFont: 'Ubuntu', monoFont: 'IBM Plex Mono', radioTarjeta: 14, radioBoton: 999, radioChip: 999, densidad: 'amplia',
}
const spec = (codigo: string, nombre: string, familia: TemplateSpec['familia'], familiaNombre: string, extra: Partial<TemplateSpec> = {}): TemplateSpec => ({
  codigo, nombre, familia, familiaNombre, descripcion: `Descripción de ${nombre}.`, fotos: { requiere: 'ninguna', recorte: 'ninguno' }, tokens: TOKENS,
  personalizable: { colores: ['acento', 'fondo', 'superficie', 'tinta'], tipografiaDisplay: true, logo: true }, miniatura: `/api/v1/plantillas/${codigo}/miniatura/`, fuentesGoogle: ['Instrument Serif'], ...extra,
})
const CATALOG: TemplateCatalog = {
  familias: { A: 'Alta cocina', B: 'Casual de barrio', C: 'Rápida y food truck', D: 'Café y panadería', E: 'Bar y cervecería', F: 'Sushi y especializados' },
  plantillas: [
    spec('A1', 'Carta editorial', 'A', 'Alta cocina'),
    spec('B1', 'Rejilla con foto', 'B', 'Casual de barrio', { fotos: { requiere: 'todas', recorte: '3x2' }, tokens: { ...TOKENS, acento: '#C1873A', acentoTinta: '#FFFFFF', displayFont: 'Ubuntu' }, fuentesGoogle: [] }),
    spec('C1', 'Combos numerados', 'C', 'Rápida y food truck', { tokens: { ...TOKENS, displayFont: 'Bebas Neue' }, personalizable: { colores: ['acento'], tipografiaDisplay: true, logo: true }, fuentesGoogle: ['Bebas Neue'] }),
  ],
}
const CTX: MenuSettingsContext = { restaurante: 'burger-house', sede: 'poblado', experienceUrl: 'http://192.168.56.10:8001', dinerUrl: 'http://192.168.56.10:3001', ajustes: { plantilla: 'B1', paleta: {}, tipografia: {} } }

const wrap = () => render(<NextIntlClientProvider locale="es" messages={messages}><MenuTemplateForm /></NextIntlClientProvider>)
const previewSettings = () => {
  const src = screen.getByTitle('Vista previa del menú').getAttribute('src') ?? ''
  const [base, query] = src.split('?vista_previa=')
  return { base, settings: JSON.parse(Buffer.from(query.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) }
}
const card = (name: RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  mGateway.mockReset().mockImplementation((action: string) => action === 'get' ? Promise.resolve(CTX) : Promise.resolve({ codigo: 'A1' }))
  mList.mockReset().mockResolvedValue(CATALOG)
  document.head.innerHTML = ''
})

// Falla si la sección no arranca en la familia de la plantilla guardada, si la tarjeta guardada no aparece elegida, si la miniatura no
// apunta a experience o si la vista previa no es la entrada del comensal de la sede con los ajustes en vista_previa.
it('shows the family tabs, marks the saved template and previews the diner entry for the venue', async () => {
  wrap()
  expect(await screen.findByText(/Elige la plantilla que mejor le queda a tu negocio/)).toBeInTheDocument()
  expect(mList).toHaveBeenCalledWith('http://192.168.56.10:8001')
  const tabs = screen.getAllByRole('tab')
  expect(tabs.map((x) => x.textContent)).toEqual(['AAlta cocina', 'BCasual de barrio', 'CRápida y food truck', 'DCafé y panadería', 'EBar y cervecería', 'FSushi y especializados'])
  expect(screen.getByRole('tab', { name: /Casual de barrio/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: /Alta cocina/ })).toHaveAttribute('aria-selected', 'false')
  const b1 = card(/Rejilla con foto/)
  expect(b1).toHaveAttribute('aria-pressed', 'true')
  expect(b1).toHaveTextContent('Fotos: todas')
  expect(b1).toHaveTextContent('Elegida')
  expect(b1.querySelector('img')).toHaveAttribute('src', 'http://192.168.56.10:8001/api/v1/plantillas/B1/miniatura/')
  expect(screen.queryByRole('button', { name: /Carta editorial/ })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Hex · Color de acción')).toHaveValue('#C1873A')
  await waitFor(() => expect(screen.getByTitle('Vista previa del menú')).toBeInTheDocument(), { timeout: 2_000 })
  const { base, settings } = previewSettings()
  expect(base).toBe('http://192.168.56.10:3001/burger-house/poblado/carta/')
  expect(settings).toEqual({ plantilla: 'B1', paleta: {}, tipografia: {} })
  expect(document.getElementById('waiter-brand-fonts')).toHaveAttribute('href', expect.stringContaining('Cormorant+Garamond'))
})

// Falla si cambiar de pestaña no filtra por familia, si elegir una tarjeta no la marca ni rellena Personalizar con los valores del spec
// (color por defecto, fuente de la plantilla) o si la vista previa no se recarga con la nueva plantilla.
it('switches family, picks a template and fills the customize panel with the spec defaults', async () => {
  wrap()
  await screen.findByRole('tab', { name: /Alta cocina/ })
  fireEvent.click(screen.getByRole('tab', { name: /Alta cocina/ }))
  expect(screen.getByRole('tab', { name: /Alta cocina/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.queryByRole('button', { name: /Rejilla con foto/ })).not.toBeInTheDocument()
  const a1 = card(/Carta editorial/)
  expect(a1).toHaveAttribute('aria-pressed', 'false')
  expect(a1).toHaveTextContent('Fotos: ninguna')
  fireEvent.click(a1)
  expect(card(/Carta editorial/)).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('heading', { name: 'Personalizar · Carta editorial' })).toBeInTheDocument()
  expect(screen.getByLabelText('Hex · Color de acción')).toHaveValue('#1A1815')
  expect(screen.getByLabelText('Hex · Fondo')).toHaveValue('#FBF8F2')
  expect(screen.getByLabelText('Color de acción')).toHaveValue('#1a1815')
  expect(screen.getByLabelText('Tipografía de títulos')).toHaveValue('Instrument Serif')
  expect(screen.getByRole('option', { name: 'Instrument Serif · la de la plantilla' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Fraunces' })).toBeInTheDocument()
  expect(screen.getByText('Acción y su texto: 17.72:1')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Volver al de la plantilla' })).not.toBeInTheDocument()
  await waitFor(() => expect(previewSettings().settings.plantilla).toBe('A1'), { timeout: 2_000 })
  // C1 trae Bebas Neue: se ofrece como opción en su fuente y se carga de Google Fonts.
  fireEvent.click(screen.getByRole('tab', { name: /Rápida y food truck/ }))
  fireEvent.click(card(/Combos numerados/))
  expect(screen.getByRole('option', { name: 'Bebas Neue · la de la plantilla' })).toHaveStyle({ fontFamily: "'Bebas Neue', serif" })
  expect(screen.queryByLabelText('Hex · Fondo')).not.toBeInTheDocument()
  expect(document.getElementById('waiter-template-fonts-bebas-neue')).toHaveAttribute('href', 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap')
})

// Falla si un color de acción sin contraste (#808080 ⇒ 4.49:1 con blanco) o un fondo que no deja leer la tinta dejan guardar,
// si un hex a medias no avisa, o si "Volver al de la plantilla" no recupera el valor del diseño.
it('blocks saving below 4.5:1 for action/ink and ink/background, and resets to the template color', async () => {
  wrap()
  const acento = await screen.findByLabelText('Hex · Color de acción')
  fireEvent.change(acento, { target: { value: '#808080' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Acción y su texto: 4.49:1 · No alcanza 4.5:1')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Volver al de la plantilla' }))
  expect(acento).toHaveValue('#C1873A')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Hex · Fondo'), { target: { value: '#333333' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Texto sobre el fondo: 1.40:1 · No alcanza 4.5:1')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Hex · Fondo'), { target: { value: '#FFF' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Escribe un color como #7A2E2A.')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Hex · Fondo'), { target: { value: '#ffffff' } })
  expect(screen.getByLabelText('Hex · Fondo')).toHaveValue('#FFFFFF')
  expect(screen.getByText('Texto sobre el fondo: 17.72:1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
})

// Falla si guardar no manda a la pasarela exactamente {plantilla, paleta (solo lo pisado), tipografia} o si no confirma.
it('saves the chosen template with the overridden colors and font through the gateway', async () => {
  wrap()
  fireEvent.click(await screen.findByRole('tab', { name: /Alta cocina/ }))
  fireEvent.click(card(/Carta editorial/))
  fireEvent.change(screen.getByLabelText('Hex · Color de acción'), { target: { value: '#7a2e2a' } })
  expect(screen.getByText('Acción y su texto: 9.33:1')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Tipografía de títulos'), { target: { value: 'Fraunces' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(mGateway).toHaveBeenCalledWith('set', { plantilla: 'A1', paleta: { acento: '#7A2E2A' }, tipografia: { display: 'Fraunces' } }))
  expect(await screen.findByRole('status')).toHaveTextContent('Guardado.')
})

// Falla si el error de la pasarela (p. ej. experience rechazó la paleta) se esconde tras el mensaje genérico.
it('shows the gateway message when saving fails', async () => {
  mGateway.mockImplementation((action: string) => action === 'get' ? Promise.resolve(CTX) : Promise.reject(new OdooError('La sede poblado no tiene experience configurado', 'odoo.exceptions.UserError')))
  wrap()
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('La sede poblado no tiene experience configurado')
})

// Falla si un addon sin la pasarela o un experience caído dejan la sección en blanco en vez de decir por qué.
it('reports why the catalog could not be loaded', async () => {
  mGateway.mockRejectedValue(new OdooError('404: Not Found', 'odoo.http.NotFound'))
  wrap()
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el catálogo de plantillas: 404: Not Found')
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
})
