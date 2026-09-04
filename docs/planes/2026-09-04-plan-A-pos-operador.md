# Plan A — POS del operador: capa de datos, plano de salón y toma de pedido

> **Para agentes:** ejecutar tarea por tarea, en orden, con el ciclo de cada
> tarea completo (test que falla → implementación mínima → test que pasa →
> commit). Los pasos usan `- [ ]`. Cada tarea deja software probado y
> commiteado por sí sola.

**Objetivo:** una app `pos/` propia (Next.js) donde un mesero abre el plano de
salón, entra a una mesa, arma el pedido, lo envía y lo cobra — todo contra
Odoo por su API externa, sin tocar la interfaz de Odoo.

**Arquitectura:** Next.js sirve la app y hace de proxy same-origin hacia Odoo
(`/odoo/*` → `:8069/*`), lo que resuelve que `call_kw` no expone CORS y que la
cookie `session_id` viaje sola. Una capa de servicios (`lib/services/`) es el
único lugar que sabe de Odoo; el dominio (`lib/domain/`) es puro y sin I/O; los
stores Zustand orquestan; las pantallas solo pintan.

**Stack:** Next.js 16.3.3 · React 19.2.8 · TypeScript · Zustand 5.0.15 ·
axios 1.20.0 · next-intl 4.14.0 · Tailwind CSS 4 · `@heroicons/react` ·
Jest 30 + Testing Library · Playwright. Node 24.20.0 / npm 11.19.0 (`.nvmrc`).

**Spec:** `docs/diseno/waiter-pantallas.dc.html` (secciones `1a` plano de salón
y `1b` toma de pedido) · `docs/diseno/waiter-design-system.dc.html` ·
`docs/arquitectura/2026-09-04-mapeo-api-pos.md` ·
`docs/decisiones/2026-09-04-pos-frontend-propio.md`.

## Alcance y lo que queda fuera

Dentro: pantallas **1a** y **1b** del diseño, con el cobro que ambas incluyen
como panel derecho. Las otras tres pantallas son planes propios porque
necesitan datos que hoy nadie produce:

| Pantalla | Plan | Prerrequisito de datos |
|---|---|---|
| KDS de cocina (1c) | Plan B | cronómetro por comanda y estado *listo/entregado* — Odoo no los guarda; hace falta un servicio propio de cocina |
| Dashboard de ROI (1d) | Plan C | métricas de automatización y ahorro laboral — solo existen cuando el bloque 3 y el registro central emitan eventos |
| Operación en vivo (1e) | Plan C | alertas por excepción (mesa llama, DIAN rechaza) — mismo origen |

Fuera también de este plan: modo sin conexión (diferido por decisión), propina
real (se muestra sugerida, no se envía), impresión de comanda, sugerencias del
Mesero IA (bloque 3), modificadores por atributo (Plan A usa `customer_note`),
y el estado *agotado* por inventario.

## Restricciones globales

Aplican a todas las tareas; salen de la plantilla del fleet y del sistema Waiter.

- **Runtime:** Node `24.20.0`, npm `>=11.19.0 <12`. Si `nvm` no pudiera
  descargar Node 24, la alternativa documentada es Node 20.19 con
  `engine-strict=false` en `.npmrc` (Next 16 solo exige `>=20.9`); nunca se
  baja el pin de la plantilla.
- **Idioma:** código e identificadores en inglés; docs y comentarios de
  intención de test en español; commits en inglés, Conventional Commits.
- **HTTP:** jamás `fetch` ni `axios` crudos fuera de `lib/services/odoo.ts`.
- **Texto visible:** siempre por `useTranslations()`; locale único `es`.
- **Tests:** ≤50 líneas, ≤7 asserts, **cero condicionales** en el cuerpo, un
  comportamiento por test, y sobre cada test un comentario `// Falla si …` que
  nombre el bug que atraparía. Nunca correr la suite completa: solo los tests
  de la tarea. Contract tests corren con `npm run test:contract` contra el Odoo
  del compose y **fallan** (no se saltan) si Odoo no responde.
- **Diseño (Waiter):** un solo botón Brasa (`--w-brand-500`) por vista; todo
  estado lleva texto además de color; toque mínimo 48 px, 56 por defecto, 64
  en acciones de dinero; serif solo ≥24 px; cifras en mono tabular; sin
  degradados ni sombras de color; nada por debajo de 15 px.
- **Odoo (verificado):** tras `sync_from_ui` **siempre** `recompute_prices`;
  una respuesta JSON-RPC sin clave `result` no es error; `pos.payment.method.type`
  no se filtra en dominio (se pide en `fields` y se filtra en cliente); el
  pedido y cada línea llevan `uuid` estable para que el reintento actualice en
  vez de duplicar.
- **Git:** rama de sesión `feat/<DDMMYYYY>-pos-frontend`; un commit por tarea.

## Estructura de archivos

```text
pos/
├── .nvmrc                       24.20.0
├── package.json                 pins exactos (plantilla) + @heroicons/react
├── next.config.ts               rewrite /odoo/* → ODOO_ORIGIN
├── tsconfig.json  postcss.config.mjs  eslint.config.mjs
├── jest.config.cjs              unit (jsdom), testMatch **/__tests__/**
├── jest.contract.config.cjs     contract (node), testMatch **/__contract__/**
├── jest.setup.ts                jest-dom
├── playwright.config.ts         solo Next; Odoo viene del compose
├── public/fonts/*.woff2         Instrument Sans/Serif, IBM Plex Mono
├── app/
│   ├── globals.css              @theme con los tokens Waiter + @font-face
│   ├── layout.tsx  providers.tsx  page.tsx (→ /salon)
│   ├── login/page.tsx
│   └── (pos)/
│       ├── layout.tsx           auth gate + Shell
│       ├── salon/page.tsx       pantalla 1a
│       └── mesas/[tableId]/page.tsx   pantalla 1b
├── components/
│   ├── ui/Button.tsx  Badge.tsx  Money.tsx  ConfirmDialog.tsx
│   ├── layout/Shell.tsx  Sidebar.tsx  Rail.tsx  Topbar.tsx
│   ├── salon/FloorTabs.tsx  StateLegend.tsx  TableGrid.tsx  TableCell.tsx  BillPanel.tsx
│   └── order/CategoryChips.tsx  ProductGrid.tsx  ProductCard.tsx
│                OrderPanel.tsx  OrderLineRow.tsx  QtyStepper.tsx
├── lib/
│   ├── types.ts                 tipos del catálogo y del pedido
│   ├── services/odoo.ts         cliente JSON-RPC (único punto con Odoo)
│   ├── services/session.ts      authenticate · sesión de caja
│   ├── services/posData.ts      load_data → catálogo tipado
│   ├── services/orders.ts       guardar · pagar · cerrar · listar
│   ├── domain/money.ts          formato COP
│   ├── domain/order.ts          borrador de pedido (puro)
│   ├── domain/tableState.ts     estado de mesa derivado (puro)
│   ├── stores/authStore.ts  catalogStore.ts  floorStore.ts  orderStore.ts
│   └── i18n/messages/es.json
└── e2e/salon.spec.ts  pedido.spec.ts  helpers/odoo.ts
```

---

### Tarea 1: Scaffold de `pos/` desde la plantilla, proxy a Odoo y tokens

**Archivos:**
- Crear: `pos/` (copiando la infraestructura de `frontend/` de la plantilla;
  ver paso 1), `pos/next.config.ts`, `pos/app/globals.css`, `pos/.env.local`,
  `pos/lib/domain/money.ts`
- Test: `pos/lib/domain/__tests__/money.test.ts`

**Interfaces:**
- Produce: `formatCop(amount: number): string` — `36900 → "36.900"`,
  `80960 → "80.960"`, `0 → "0"`. Sin símbolo; el símbolo lo pone la UI.

- [ ] **Paso 1: copiar la infraestructura de la plantilla (no el dominio demo)**

```bash
cd /home/cerrotico/work/waiter_project
T=/tmp/claude-1000/-home-cerrotico-work/e7130d8b-9bbe-429a-98e5-7a9c7b250b69/scratchpad/base_repo/frontend
mkdir -p pos/app pos/components/layout pos/lib/services pos/lib/hooks pos/lib/stores pos/lib/domain pos/lib/i18n/messages pos/e2e/helpers pos/e2e/reporters pos/public/fonts pos/scripts
cp "$T"/{package.json,package-lock.json,tsconfig.json,postcss.config.mjs,eslint.config.mjs,jest.config.cjs,jest.setup.ts,playwright.config.ts} pos/
cp "$T"/.npmrc pos/ 2>/dev/null || true
cp "$T"/app/{providers.tsx,globals.css} pos/app/
cp "$T"/lib/hooks/useHydrated.ts pos/lib/hooks/
cp -r "$T"/e2e/reporters pos/e2e/
cp "$T"/scripts/check-install-scripts.cjs pos/scripts/ 2>/dev/null || true
cp odoo/addons/projectapp_pos_design/static/src/fonts/*.woff2 pos/public/fonts/
printf '24.20.0\n' > pos/.nvmrc
```

No se copian `app/blogs`, `app/catalog`, `app/checkout`, `app/sign-*`, sus
stores ni sus tests: son el dominio demo de la plantilla y el gate los
escanearía como código muerto.

- [ ] **Paso 2: dependencias**

En `pos/package.json`: quitar `@react-oauth/google`, `react-google-recaptcha`,
`@types/react-google-recaptcha`, `fuse.js`, `jwt-decode`, `next-themes`,
`lucide-react`; añadir `"@heroicons/react": "2.2.0"`. Dejar `name: "pos"`.
Añadir scripts:

```json
"test:contract": "NODE_OPTIONS=--no-deprecation jest --config jest.contract.config.cjs",
"typecheck": "tsc --noEmit"
```

Luego:

```bash
cd pos && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24.20.0 && npm install
```

- [ ] **Paso 3: proxy same-origin hacia Odoo**

`pos/next.config.ts`:

```ts
import type { NextConfig } from 'next'

const odooOrigin = (process.env.ODOO_ORIGIN || 'http://192.168.56.10:8069').replace(/\/$/, '')

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/odoo/:path*', destination: `${odooOrigin}/:path*` }]
  },
}

export default nextConfig
```

`pos/.env.local` (ignorado por git):

```text
ODOO_ORIGIN=http://192.168.56.10:8069
NEXT_PUBLIC_ODOO_DB=projectapp
```

- [ ] **Paso 4: tokens Waiter como tema de Tailwind 4**

Reemplazar `pos/app/globals.css` por:

```css
@import 'tailwindcss';

@font-face { font-family: 'Instrument Sans'; font-weight: 400 700; font-display: swap;
  src: url('/fonts/instrument-sans-400-normal-latin.woff2') format('woff2'); }
@font-face { font-family: 'Instrument Serif'; font-weight: 400; font-display: swap;
  src: url('/fonts/instrument-serif-400-normal-latin.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; font-weight: 400; font-display: swap;
  src: url('/fonts/ibm-plex-mono-400-normal-latin.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; font-weight: 500; font-display: swap;
  src: url('/fonts/ibm-plex-mono-500-normal-latin.woff2') format('woff2'); }

@theme {
  --color-brand-50: #FDF6EA;  --color-brand-100: #F6E4C4; --color-brand-300: #E4B879;
  --color-brand-500: #C1873A; --color-brand-600: #A06E2C; --color-brand-700: #6F4A1C;
  --color-surface: #FFFFFF;   --color-canvas: #FAF8F5;    --color-muted: #F2EEE8;
  --color-border: #E4DED4;    --color-ink: #1A1815;       --color-soft: #6B6259;
  --color-ink-3: #9A8F7E;
  --color-free: #2F7A4F;      --color-free-soft: #E6F1EA;   --color-free-ink: #216239;
  --color-busy: #B4342F;      --color-busy-soft: #FBEAE8;   --color-busy-ink: #96241F;
  --color-kitchen: #5B4BC4;   --color-kitchen-soft: #ECEAFB;--color-kitchen-ink: #40339B;
  --color-pending: #C9820C;   --color-pending-soft: #FDF2DC;--color-pending-ink: #8A5A05;
  --color-assist: #4A5568;    --color-assist-soft: #EEF0F3;
  --color-sidebar: #1A1815;   --color-sidebar-raised: #221E1B; --color-sidebar-hover: #262220;
  --color-sidebar-ink: #F5F1EA; --color-sidebar-soft: #C4BCB2; --color-sidebar-dim: #7C736A;
  --font-ui: 'Instrument Sans', system-ui, sans-serif;
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --spacing-tap-min: 48px; --spacing-tap: 56px; --spacing-tap-money: 64px;
  --spacing-sidebar: 248px; --spacing-rail: 88px; --spacing-panel: 372px; --spacing-panel-lg: 400px;
  --spacing-table-cell: 138px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px;
}

body { background: var(--color-canvas); color: var(--color-ink); font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased; }
.tabular { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
```

Con esto existen `bg-brand-500`, `text-ink`, `h-tap`, `w-sidebar`,
`rounded-lg`, `font-mono`, etc., y no hace falta ningún `w-[347px]`.

- [ ] **Paso 5: test que falla — formato de dinero**

`pos/lib/domain/__tests__/money.test.ts`:

```ts
import { formatCop } from '@/lib/domain/money'

// Falla si el separador de miles deja de ser el punto colombiano.
it('formats thousands with a dot and no decimals', () => {
  expect(formatCop(36900)).toBe('36.900')
  expect(formatCop(80960)).toBe('80.960')
})

// Falla si un total en cero se pinta vacío o como "0.000".
it('formats zero as a bare zero', () => {
  expect(formatCop(0)).toBe('0')
})

// Falla si los centavos de Odoo se cuelan en el ticket.
it('rounds half-up cents away before formatting', () => {
  expect(formatCop(87822.4)).toBe('87.822')
})
```

- [ ] **Paso 6: verificar que falla**

```bash
cd pos && npm test -- lib/domain/__tests__/money.test.ts
```
Esperado: FAIL, `Cannot find module '@/lib/domain/money'`.

- [ ] **Paso 7: implementación mínima**

`pos/lib/domain/money.ts`:

```ts
const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0, useGrouping: true })

export function formatCop(amount: number): string {
  return cop.format(Math.round(amount))
}
```

- [ ] **Paso 8: verificar que pasa, typecheck y lint**

```bash
cd pos && npm test -- lib/domain/__tests__/money.test.ts && npm run typecheck && npm run lint
```
Esperado: 3 tests PASS; typecheck y lint sin errores.

- [ ] **Paso 9: commit**

```bash
cd /home/cerrotico/work/waiter_project
printf '\n# POS app\n/pos/node_modules/\n/pos/.next/\n/pos/out/\n/pos/.env.local\n/pos/coverage/\n/pos/test-results/\n/pos/playwright-report/\n/pos/e2e-results/\n' >> .gitignore
git add .gitignore pos
git commit -m "feat(pos): scaffold Next app from fleet template with Odoo proxy and Waiter tokens"
```

---

### Tarea 2: cliente JSON-RPC (`lib/services/odoo.ts`)

**Archivos:**
- Crear: `pos/lib/services/odoo.ts`, `pos/lib/services/errors.ts`
- Test: `pos/lib/services/__tests__/odoo.test.ts`

**Interfaces:**
- Produce:
  - `callKw<T>(model: string, method: string, args: unknown[], kwargs?: Record<string, unknown>): Promise<T>`
  - `jsonRpc<T>(path: string, params: Record<string, unknown>): Promise<T>`
  - `class OdooError extends Error { name: string; odooType: string }`
- Contrato: una respuesta `{jsonrpc, id}` sin `result` resuelve a `undefined`;
  una respuesta con `error` rechaza con `OdooError` cuyo `message` es
  `error.data.message` y `odooType` es `error.data.name`.

- [ ] **Paso 1: test que falla**

`pos/lib/services/__tests__/odoo.test.ts`:

```ts
import axios from 'axios'
import { callKw, OdooError } from '@/lib/services/odoo'

jest.mock('axios', () => {
  const post = jest.fn()
  return { __esModule: true, default: { create: () => ({ post }) }, post }
})
const post = (axios as unknown as { post: jest.Mock }).post

beforeEach(() => post.mockReset())

// Falla si el cliente deja de envolver la llamada en el sobre JSON-RPC 2.0 de Odoo.
it('sends model, method, args and kwargs inside the JSON-RPC envelope', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, result: [{ id: 7 }] } })
  await callKw('pos.config', 'search_read', [[], ['name']], { context: { lang: 'es_CO' } })
  const [path, body] = post.mock.calls[0]
  expect(path).toBe('/web/dataset/call_kw')
  expect(body.params).toEqual({
    model: 'pos.config', method: 'search_read', args: [[], ['name']], kwargs: { context: { lang: 'es_CO' } },
  })
})

// Falla si una respuesta sin `result` (método que devuelve None) se trata como error.
it('resolves to undefined when Odoo omits the result key', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1 } })
  await expect(callKw('pos.order', 'add_payment', [[3], {}])).resolves.toBeUndefined()
})

// Falla si un error de negocio de Odoo (HTTP 200 + clave error) se pierde como éxito.
it('rejects with OdooError carrying the Odoo message and type', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, error: {
    message: 'Odoo Server Error', data: { name: 'odoo.exceptions.UserError', message: 'Invalid preset' } } } })
  await expect(callKw('pos.order', 'sync_from_ui', [[]])).rejects.toMatchObject<Partial<OdooError>>({
    message: 'Invalid preset', odooType: 'odoo.exceptions.UserError',
  })
})
```

- [ ] **Paso 2: verificar que falla**

```bash
cd pos && npm test -- lib/services/__tests__/odoo.test.ts
```
Esperado: FAIL, módulo no encontrado.

- [ ] **Paso 3: implementación**

`pos/lib/services/errors.ts`:

```ts
export class OdooError extends Error {
  readonly odooType: string

  constructor(message: string, odooType: string) {
    super(message)
    this.name = 'OdooError'
    this.odooType = odooType
  }
}
```

`pos/lib/services/odoo.ts`:

```ts
'use client'

import axios from 'axios'

import { OdooError } from '@/lib/services/errors'

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number | null
  result?: T
  error?: { message: string; data?: { name?: string; message?: string } }
}

// Mismo origen: Next reescribe /odoo/* hacia Odoo, y así viaja la cookie session_id.
export const http = axios.create({ baseURL: '/odoo', timeout: 60_000, withCredentials: true })

let nextId = 1

export async function jsonRpc<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const { data } = await http.post<JsonRpcResponse<T>>(path, {
    jsonrpc: '2.0', method: 'call', id: nextId++, params,
  })
  if (data.error) {
    const detail = data.error.data ?? {}
    throw new OdooError(detail.message ?? data.error.message, detail.name ?? 'odoo.exceptions.Error')
  }
  return data.result as T
}

export function callKw<T>(
  model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {},
): Promise<T> {
  return jsonRpc<T>('/web/dataset/call_kw', { model, method, args, kwargs })
}
```

- [ ] **Paso 4: verificar que pasa**

```bash
cd pos && npm test -- lib/services/__tests__/odoo.test.ts
```
Esperado: 3 PASS.

- [ ] **Paso 5: commit**

```bash
git add pos/lib/services && git commit -m "feat(pos): add JSON-RPC client for Odoo with error normalization"
```

---

### Tarea 3: autenticación y sesión de caja (`session.ts`, `authStore`)

**Archivos:**
- Crear: `pos/lib/services/session.ts`, `pos/lib/stores/authStore.ts`,
  `pos/jest.contract.config.cjs`, `pos/lib/services/__contract__/env.ts`
- Test: `pos/lib/services/__tests__/session.test.ts`,
  `pos/lib/services/__contract__/session.contract.test.ts`

**Interfaces:**
- Consume: `jsonRpc`, `callKw` (Tarea 2)
- Produce:
  - `login(login: string, password: string): Promise<AuthUser>` con
    `AuthUser = { uid: number; name: string; companyId: number }`
  - `getOpenSession(): Promise<PosSession | null>` con
    `PosSession = { id: number; configId: number; state: 'opened' | 'opening_control' }`
  - `ensureOpenSession(configId: number): Promise<PosSession>` — crea y abre si no hay.
  - `useAuthStore`: `{ user: AuthUser | null; session: PosSession | null; hydrated: boolean; login(l,p); hydrate(); logout() }`

- [ ] **Paso 1: configuración de contract tests**

`pos/jest.contract.config.cjs`:

```js
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/__contract__/**/*.contract.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', module: 'commonjs' } }] },
  testTimeout: 30_000,
}
```

Añadir `ts-jest` a devDependencies (`npm install -D ts-jest@29.4.6`).

`pos/lib/services/__contract__/env.ts` — los contract tests hablan con Odoo
**directo** (sin Next en medio), fijando `baseURL` al origen real:

```ts
import { http } from '@/lib/services/odoo'

export const ODOO_ORIGIN = process.env.ODOO_ORIGIN ?? 'http://192.168.56.10:8069'
export const ODOO_DB = process.env.ODOO_DB ?? 'projectapp'
export const ODOO_LOGIN = process.env.ODOO_LOGIN ?? 'admin'
export const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? 'admin'

http.defaults.baseURL = ODOO_ORIGIN
```

En Node, axios no persiste cookies; el contract test guarda `set-cookie` y lo
reenvía. Añadir a `env.ts`:

```ts
let cookie = ''
http.interceptors.response.use((r) => {
  const set = r.headers['set-cookie']?.[0]
  cookie = set ? set.split(';')[0] : cookie
  return r
})
http.interceptors.request.use((c) => {
  c.headers.Cookie = cookie
  return c
})
```

- [ ] **Paso 2: tests unitarios que fallan**

`pos/lib/services/__tests__/session.test.ts`:

```ts
import { callKw, jsonRpc } from '@/lib/services/odoo'
import { ensureOpenSession, getOpenSession, login } from '@/lib/services/session'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn(), jsonRpc: jest.fn() }))
const mockCallKw = callKw as jest.Mock
const mockRpc = jsonRpc as jest.Mock

beforeEach(() => { mockCallKw.mockReset(); mockRpc.mockReset() })

// Falla si el login deja de mandar la base de datos: con dos bases Odoo responde 404.
it('authenticates against the configured database and maps the user', async () => {
  mockRpc.mockResolvedValue({ uid: 2, name: 'Mitchell Admin', user_companies: { current_company: 1 } })
  const user = await login('admin', 'admin')
  expect(mockRpc).toHaveBeenCalledWith('/web/session/authenticate', { db: 'projectapp', login: 'admin', password: 'admin' })
  expect(user).toEqual({ uid: 2, name: 'Mitchell Admin', companyId: 1 })
})

// Falla si se toma como abierta una sesión en estado closed.
it('returns null when no session is opened or in opening control', async () => {
  mockCallKw.mockResolvedValue([])
  await expect(getOpenSession()).resolves.toBeNull()
  expect(mockCallKw.mock.calls[0][2][0]).toEqual([['state', 'in', ['opened', 'opening_control']]])
})

// Falla si ensureOpenSession crea una sesión nueva habiendo una abierta (duplica cajas).
it('reuses the open session instead of creating another one', async () => {
  mockCallKw.mockResolvedValueOnce([{ id: 4, config_id: [1, 'Salón'], state: 'opened' }])
  const s = await ensureOpenSession(1)
  expect(s).toEqual({ id: 4, configId: 1, state: 'opened' })
  expect(mockCallKw).toHaveBeenCalledTimes(1)
})
```

- [ ] **Paso 3: verificar que fallan**

```bash
cd pos && npm test -- lib/services/__tests__/session.test.ts
```
Esperado: FAIL, módulo no encontrado.

- [ ] **Paso 4: implementación**

`pos/lib/services/session.ts`:

```ts
import { callKw, jsonRpc } from '@/lib/services/odoo'

export interface AuthUser { uid: number; name: string; companyId: number }
export interface PosSession { id: number; configId: number; state: 'opened' | 'opening_control' }

interface RawSession { id: number; config_id: [number, string]; state: PosSession['state'] }
interface RawAuth { uid: number; name: string; user_companies: { current_company: number } }

const DB = process.env.NEXT_PUBLIC_ODOO_DB ?? 'projectapp'
const OPEN_STATES = ['opened', 'opening_control']

export async function login(loginName: string, password: string): Promise<AuthUser> {
  const raw = await jsonRpc<RawAuth>('/web/session/authenticate', { db: DB, login: loginName, password })
  return { uid: raw.uid, name: raw.name, companyId: raw.user_companies.current_company }
}

export function logout(): Promise<void> {
  return jsonRpc<void>('/web/session/destroy', {})
}

function toSession(raw: RawSession): PosSession {
  return { id: raw.id, configId: raw.config_id[0], state: raw.state }
}

export async function getOpenSession(): Promise<PosSession | null> {
  const rows = await callKw<RawSession[]>('pos.session', 'search_read',
    [[['state', 'in', OPEN_STATES]], ['id', 'config_id', 'state']], { limit: 1 })
  return rows.length ? toSession(rows[0]) : null
}

export async function ensureOpenSession(configId: number): Promise<PosSession> {
  const open = await getOpenSession()
  if (open) return open
  const id = await callKw<number>('pos.session', 'create', [{ config_id: configId }])
  await callKw<void>('pos.session', 'action_pos_session_open', [[id]])
  return { id, configId, state: 'opening_control' }
}
```

`pos/lib/stores/authStore.ts`:

```ts
'use client'

import { create } from 'zustand'

import { getOpenSession, login as loginRequest, logout as logoutRequest } from '@/lib/services/session'
import type { AuthUser, PosSession } from '@/lib/services/session'

interface AuthState {
  user: AuthUser | null
  session: PosSession | null
  hydrated: boolean
  login: (login: string, password: string) => Promise<void>
  hydrate: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  hydrated: false,
  login: async (l, p) => {
    const user = await loginRequest(l, p)
    const session = await getOpenSession()
    set({ user, session, hydrated: true })
  },
  // La cookie de Odoo es HttpOnly: la única forma de saber si hay sesión es preguntar.
  hydrate: async () => {
    try {
      const session = await getOpenSession()
      set({ session, user: session ? { uid: 0, name: '', companyId: 0 } : null, hydrated: true })
    } catch {
      set({ user: null, session: null, hydrated: true })
    }
  },
  logout: async () => {
    await logoutRequest()
    set({ user: null, session: null })
  },
}))
```

- [ ] **Paso 5: verificar unitarios**

```bash
cd pos && npm test -- lib/services/__tests__/session.test.ts
```
Esperado: 3 PASS.

- [ ] **Paso 6: contract test que falla (Odoo real)**

`pos/lib/services/__contract__/session.contract.test.ts`:

```ts
import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo cambia la forma de user_companies o si la base configurada no existe.
it('logs in against the real Odoo and finds the open cash session', async () => {
  const user = await login(ODOO_LOGIN, ODOO_PASSWORD)
  expect(user.uid).toBeGreaterThan(0)
  const session = await getOpenSession()
  expect(session).not.toBeNull()
  expect(session?.state).toMatch(/opened|opening_control/)
})
```

- [ ] **Paso 7: correr el contract test**

```bash
docker compose -p odoo-spike -f odoo/compose/docker-compose.yml ps --format '{{.Service}} {{.State}}'
cd pos && npm run test:contract -- lib/services/__contract__/session.contract.test.ts
```
Esperado: `odoo running` y 1 PASS. Si Odoo está caído el test **falla** con
`ECONNREFUSED`; es el comportamiento buscado.

- [ ] **Paso 8: commit**

```bash
git add pos && git commit -m "feat(pos): add Odoo login, cash session lookup and auth store"
```

---

### Tarea 4: carga del catálogo (`posData.ts`, `catalogStore`, `floorStore`)

**Archivos:**
- Crear: `pos/lib/types.ts`, `pos/lib/services/posData.ts`,
  `pos/lib/stores/catalogStore.ts`, `pos/lib/stores/floorStore.ts`
- Test: `pos/lib/services/__tests__/posData.test.ts`,
  `pos/lib/services/__contract__/posData.contract.test.ts`

**Interfaces:**
- Consume: `callKw` (T2), `PosSession` (T3)
- Produce en `lib/types.ts`:

```ts
export interface Product { id: number; templateId: number; name: string; price: number; categoryIds: number[]; taxIds: number[] }
export interface Category { id: number; name: string; sequence: number }
export interface Floor { id: number; name: string; tableIds: number[] }
export interface Table { id: number; number: number; floorId: number; seats: number }
export interface PaymentMethod { id: number; name: string; type: 'cash' | 'bank' | 'pay_later' }
export interface Catalog { products: Product[]; categories: Category[]; floors: Floor[]; tables: Table[]; paymentMethods: PaymentMethod[] }
```

- `loadPosData(sessionId: number): Promise<Catalog>`
- `useCatalogStore`: `{ catalog: Catalog | null; status: 'idle'|'loading'|'ready'|'error'; load(sessionId) }`
- `useFloorStore`: `{ activeFloorId: number | null; selectedTableId: number | null; setFloor(id); selectTable(id|null) }`

- [ ] **Paso 1: test unitario que falla**

`pos/lib/services/__tests__/posData.test.ts`:

```ts
import { callKw } from '@/lib/services/odoo'
import { loadPosData } from '@/lib/services/posData'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const mockCallKw = callKw as jest.Mock

const RAW = {
  'product.product': [{ id: 3, product_tmpl_id: [2, 'Angus'], display_name: 'Hamburguesa Angus', lst_price: 36900, pos_categ_ids: [1], taxes_id: [5] }],
  'pos.category': [{ id: 1, name: 'Fuertes', sequence: 1 }],
  'restaurant.floor': [{ id: 1, name: 'Terraza', table_ids: [6] }],
  'restaurant.table': [{ id: 6, table_number: 5, floor_id: [1, 'Terraza'], seats: 4 }],
  'pos.payment.method': [{ id: 1, name: 'Efectivo', type: 'cash' }, { id: 2, name: 'Tarjeta', type: 'bank' }],
}

// Falla si se pierde el mapeo de campos de Odoo (p. ej. lst_price → price) y la carta sale sin precios.
it('maps the load_data payload into the typed catalog', async () => {
  mockCallKw.mockResolvedValue(RAW)
  const c = await loadPosData(1)
  expect(c.products[0]).toEqual({ id: 3, templateId: 2, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [5] })
  expect(c.tables[0]).toEqual({ id: 6, number: 5, floorId: 1, seats: 4 })
  expect(c.paymentMethods.map((m) => m.type)).toEqual(['cash', 'bank'])
})

// Falla si se piden todos los 49 modelos en vez de los cinco que usa la app (carga 2.131 estados de país por nada).
it('asks load_data only for the models the app renders', async () => {
  mockCallKw.mockResolvedValue(RAW)
  await loadPosData(9)
  expect(mockCallKw).toHaveBeenCalledWith('pos.session', 'load_data',
    [[9], ['product.product', 'pos.category', 'restaurant.floor', 'restaurant.table', 'pos.payment.method']])
})
```

- [ ] **Paso 2: verificar que falla**

```bash
cd pos && npm test -- lib/services/__tests__/posData.test.ts
```

- [ ] **Paso 3: implementación**

`pos/lib/types.ts`: las interfaces del bloque *Interfaces*.

`pos/lib/services/posData.ts`:

```ts
import { callKw } from '@/lib/services/odoo'
import type { Catalog, Category, Floor, PaymentMethod, Product, Table } from '@/lib/types'

const MODELS = ['product.product', 'pos.category', 'restaurant.floor', 'restaurant.table', 'pos.payment.method']

interface RawProduct { id: number; product_tmpl_id: [number, string]; display_name: string; lst_price: number; pos_categ_ids: number[]; taxes_id: number[] }
interface RawCategory { id: number; name: string; sequence: number }
interface RawFloor { id: number; name: string; table_ids: number[] }
interface RawTable { id: number; table_number: number; floor_id: [number, string]; seats: number }
interface RawMethod { id: number; name: string; type: PaymentMethod['type'] }
interface RawLoad {
  'product.product': RawProduct[]; 'pos.category': RawCategory[]; 'restaurant.floor': RawFloor[]
  'restaurant.table': RawTable[]; 'pos.payment.method': RawMethod[]
}

export async function loadPosData(sessionId: number): Promise<Catalog> {
  const raw = await callKw<RawLoad>('pos.session', 'load_data', [[sessionId], MODELS])
  const products: Product[] = raw['product.product'].map((p) => ({
    id: p.id, templateId: p.product_tmpl_id[0], name: p.display_name, price: p.lst_price,
    categoryIds: p.pos_categ_ids, taxIds: p.taxes_id,
  }))
  const categories: Category[] = raw['pos.category'].map(({ id, name, sequence }) => ({ id, name, sequence }))
  const floors: Floor[] = raw['restaurant.floor'].map(({ id, name, table_ids }) => ({ id, name, tableIds: table_ids }))
  const tables: Table[] = raw['restaurant.table'].map((t) => ({ id: t.id, number: t.table_number, floorId: t.floor_id[0], seats: t.seats }))
  const paymentMethods: PaymentMethod[] = raw['pos.payment.method'].map(({ id, name, type }) => ({ id, name, type }))
  return { products, categories, floors, tables, paymentMethods }
}
```

`pos/lib/stores/catalogStore.ts`:

```ts
'use client'

import { create } from 'zustand'

import { loadPosData } from '@/lib/services/posData'
import type { Catalog } from '@/lib/types'

interface CatalogState {
  catalog: Catalog | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  load: (sessionId: number) => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set) => ({
  catalog: null,
  status: 'idle',
  load: async (sessionId) => {
    set({ status: 'loading' })
    try {
      set({ catalog: await loadPosData(sessionId), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))
```

`pos/lib/stores/floorStore.ts`:

```ts
'use client'

import { create } from 'zustand'

interface FloorState {
  activeFloorId: number | null
  selectedTableId: number | null
  setFloor: (id: number) => void
  selectTable: (id: number | null) => void
}

export const useFloorStore = create<FloorState>((set) => ({
  activeFloorId: null,
  selectedTableId: null,
  setFloor: (id) => set({ activeFloorId: id, selectedTableId: null }),
  selectTable: (id) => set({ selectedTableId: id }),
}))
```

- [ ] **Paso 4: verificar unitarios**

```bash
cd pos && npm test -- lib/services/__tests__/posData.test.ts
```
Esperado: 2 PASS.

- [ ] **Paso 5: contract test**

`pos/lib/services/__contract__/posData.contract.test.ts`:

```ts
import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo renombra un campo de load_data o si la base de referencia perdió su carta.
it('loads a catalog with products, tables and a cash method from the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = await getOpenSession()
  const catalog = await loadPosData(session!.id)
  expect(catalog.products.length).toBeGreaterThanOrEqual(5)
  expect(catalog.tables.length).toBeGreaterThanOrEqual(12)
  expect(catalog.paymentMethods.some((m) => m.type === 'cash')).toBe(true)
})
```

```bash
cd pos && npm run test:contract -- lib/services/__contract__/posData.contract.test.ts
```
Esperado: 1 PASS.

- [ ] **Paso 6: commit**

```bash
git add pos && git commit -m "feat(pos): load typed catalog, floors and payment methods from load_data"
```

---

### Tarea 5: borrador de pedido (dominio puro, `lib/domain/order.ts`)

**Archivos:**
- Crear: `pos/lib/domain/order.ts`
- Test: `pos/lib/domain/__tests__/order.test.ts`

**Interfaces:**
- Produce:

```ts
export interface DraftLine { uuid: string; productId: number; name: string; unitPrice: number; qty: number; note: string; taxIds: number[] }
export interface DraftOrder { uuid: string; serverId: number | null; sessionId: number; tableId: number; guests: number; lines: DraftLine[] }
export function createDraft(input: { sessionId: number; tableId: number; guests?: number }): DraftOrder
export function addProduct(order: DraftOrder, product: Product): DraftOrder
export function setQty(order: DraftOrder, lineUuid: string, qty: number): DraftOrder
export function setNote(order: DraftOrder, lineUuid: string, note: string): DraftOrder
export function removeLine(order: DraftOrder, lineUuid: string): DraftOrder
export function subtotal(order: DraftOrder): number
export function toSyncPayload(order: DraftOrder): SyncOrderPayload
```

Todas las funciones son puras y devuelven un pedido nuevo. `uuid` se genera
con `crypto.randomUUID()` (disponible en Node 24 y en jsdom moderno).

- [ ] **Paso 1: tests que fallan**

`pos/lib/domain/__tests__/order.test.ts`:

```ts
import { addProduct, createDraft, removeLine, setQty, subtotal, toSyncPayload } from '@/lib/domain/order'
import type { Product } from '@/lib/types'

const angus: Product = { id: 3, templateId: 2, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [5] }
const draft = () => createDraft({ sessionId: 1, tableId: 6, guests: 2 })

// Falla si agregar el mismo producto dos veces crea dos líneas en vez de subir la cantidad.
it('adding the same product twice increments the existing line', () => {
  const o = addProduct(addProduct(draft(), angus), angus)
  expect(o.lines).toHaveLength(1)
  expect(o.lines[0].qty).toBe(2)
})

// Falla si el subtotal deja de multiplicar cantidad por precio unitario.
it('subtotal sums qty times unit price across lines', () => {
  const o = setQty(addProduct(draft(), angus), addProduct(draft(), angus).lines[0].uuid, 3)
  expect(subtotal(o)).toBe(0)
  const o2 = addProduct(draft(), angus)
  expect(subtotal(setQty(o2, o2.lines[0].uuid, 3))).toBe(110700)
})

// Falla si bajar la cantidad a cero deja una línea fantasma que Odoo rechaza.
it('setting qty to zero removes the line', () => {
  const o = addProduct(draft(), angus)
  expect(setQty(o, o.lines[0].uuid, 0).lines).toHaveLength(0)
})

// Falla si el payload deja de llevar uuid estable, session_id, table_id o el comando (0,0,{...}) por línea.
it('builds the sync_from_ui payload Odoo expects', () => {
  const o = addProduct(draft(), angus)
  const p = toSyncPayload(o)
  expect(p.uuid).toBe(o.uuid)
  expect(p).toMatchObject({ id: -1, session_id: 1, table_id: 6, customer_count: 2, state: 'draft' })
  expect(p.lines[0]).toEqual([0, 0, expect.objectContaining({ product_id: 3, qty: 1, price_unit: 36900, tax_ids: [[6, 0, [5]]], uuid: o.lines[0].uuid })])
})

// Falla si removeLine borra una línea distinta a la pedida.
it('removeLine drops only the targeted line', () => {
  const other: Product = { ...angus, id: 4, name: 'Papas' }
  const o = addProduct(addProduct(draft(), angus), other)
  expect(removeLine(o, o.lines[0].uuid).lines.map((l) => l.productId)).toEqual([4])
})
```

Nota: el segundo test tiene una primera aserción sobre un pedido vacío de
líneas (`setQty` sobre un uuid ajeno no cambia nada); sirve para fijar que
`subtotal` de un borrador vacío es 0.

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- lib/domain/__tests__/order.test.ts
```

- [ ] **Paso 3: implementación**

`pos/lib/domain/order.ts`:

```ts
import type { Product } from '@/lib/types'

export interface DraftLine { uuid: string; productId: number; name: string; unitPrice: number; qty: number; note: string; taxIds: number[] }
export interface DraftOrder { uuid: string; serverId: number | null; sessionId: number; tableId: number; guests: number; lines: DraftLine[] }

type LineCommand = [0, 0, Record<string, unknown>]
export interface SyncOrderPayload {
  id: number; uuid: string; session_id: number; table_id: number; customer_count: number
  sequence_number: number; state: 'draft'; amount_total: number; amount_tax: number
  amount_paid: number; amount_return: number; date_order: string; lines: LineCommand[]
}

export function createDraft({ sessionId, tableId, guests = 1 }: { sessionId: number; tableId: number; guests?: number }): DraftOrder {
  return { uuid: crypto.randomUUID(), serverId: null, sessionId, tableId, guests, lines: [] }
}

export function addProduct(order: DraftOrder, product: Product): DraftOrder {
  const existing = order.lines.find((l) => l.productId === product.id && l.note === '')
  if (existing) return setQty(order, existing.uuid, existing.qty + 1)
  const line: DraftLine = { uuid: crypto.randomUUID(), productId: product.id, name: product.name,
    unitPrice: product.price, qty: 1, note: '', taxIds: product.taxIds }
  return { ...order, lines: [...order.lines, line] }
}

export function setQty(order: DraftOrder, lineUuid: string, qty: number): DraftOrder {
  if (qty <= 0) return removeLine(order, lineUuid)
  return { ...order, lines: order.lines.map((l) => (l.uuid === lineUuid ? { ...l, qty } : l)) }
}

export function setNote(order: DraftOrder, lineUuid: string, note: string): DraftOrder {
  return { ...order, lines: order.lines.map((l) => (l.uuid === lineUuid ? { ...l, note } : l)) }
}

export function removeLine(order: DraftOrder, lineUuid: string): DraftOrder {
  return { ...order, lines: order.lines.filter((l) => l.uuid !== lineUuid) }
}

export function subtotal(order: DraftOrder): number {
  return order.lines.reduce((acc, l) => acc + l.unitPrice * l.qty, 0)
}

function nowForOdoo(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function toSyncPayload(order: DraftOrder): SyncOrderPayload {
  return {
    id: order.serverId ?? -1, uuid: order.uuid, session_id: order.sessionId, table_id: order.tableId,
    customer_count: order.guests, sequence_number: 1, state: 'draft',
    amount_total: 0, amount_tax: 0, amount_paid: 0, amount_return: 0, date_order: nowForOdoo(),
    lines: order.lines.map((l) => [0, 0, {
      id: -1, uuid: l.uuid, product_id: l.productId, qty: l.qty, price_unit: l.unitPrice,
      tax_ids: [[6, 0, l.taxIds]], price_subtotal: 0, price_subtotal_incl: 0,
      full_product_name: l.name, customer_note: l.note,
    }]),
  }
}
```

- [ ] **Paso 4: verificar que pasan**

```bash
cd pos && npm test -- lib/domain/__tests__/order.test.ts
```
Esperado: 5 PASS.

- [ ] **Paso 5: commit**

```bash
git add pos/lib/domain && git commit -m "feat(pos): add pure draft order model with sync payload builder"
```

---

### Tarea 6: guardar, pagar y cerrar (`lib/services/orders.ts`)

**Archivos:**
- Crear: `pos/lib/services/orders.ts`
- Test: `pos/lib/services/__tests__/orders.test.ts`,
  `pos/lib/services/__contract__/orders.contract.test.ts`

**Interfaces:**
- Consume: `callKw` (T2), `DraftOrder`, `toSyncPayload` (T5)
- Produce:

```ts
export interface SavedOrder { id: number; reference: string; state: 'draft' | 'paid'; total: number; tax: number; paid: number }
export interface OpenOrder { id: number; tableId: number; total: number; state: 'draft' | 'paid'; lineCount: number }
export function saveOrder(draft: DraftOrder): Promise<SavedOrder>
export function payOrder(orderId: number, paymentMethodId: number, amount: number): Promise<SavedOrder>
export function closeOrder(orderId: number): Promise<SavedOrder>
export function listOpenOrders(sessionId: number): Promise<OpenOrder[]>
```

- [ ] **Paso 1: tests unitarios que fallan**

`pos/lib/services/__tests__/orders.test.ts`:

```ts
import { createDraft, addProduct } from '@/lib/domain/order'
import { callKw } from '@/lib/services/odoo'
import { payOrder, saveOrder } from '@/lib/services/orders'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const mockCallKw = callKw as jest.Mock
const angus = { id: 3, templateId: 2, name: 'Angus', price: 36900, categoryIds: [1], taxIds: [5] }
const read = { id: 13, pos_reference: '260-1-000009', state: 'draft', amount_total: 87822, amount_tax: 14022, amount_paid: 0 }

beforeEach(() => mockCallKw.mockReset())

// Falla si saveOrder olvida recompute_prices: Odoo deja el pedido en total 0 (verificado en el mapeo).
it('calls sync_from_ui, then recompute_prices, then reads the totals', async () => {
  mockCallKw
    .mockResolvedValueOnce({ 'pos.order': [{ id: 13 }] })
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce([read])
  const saved = await saveOrder(addProduct(createDraft({ sessionId: 1, tableId: 6 }), angus))
  expect(mockCallKw.mock.calls.map((c) => c[1])).toEqual(['sync_from_ui', 'recompute_prices', 'read'])
  expect(saved).toEqual({ id: 13, reference: '260-1-000009', state: 'draft', total: 87822, tax: 14022, paid: 0 })
})

// Falla si un reintento manda id:-1 y crea un pedido duplicado en vez de reusar el server id.
it('reuses the server id on a second save of the same draft', async () => {
  mockCallKw.mockResolvedValue([read])
  mockCallKw.mockResolvedValueOnce({ 'pos.order': [{ id: 13 }] }).mockResolvedValueOnce(undefined)
  const draft = { ...addProduct(createDraft({ sessionId: 1, tableId: 6 }), angus), serverId: 13 }
  await saveOrder(draft)
  expect(mockCallKw.mock.calls[0][2][0][0].id).toBe(13)
})

// Falla si payOrder deja de mandar pos_order_id dentro del dict (Odoo crea el pago huérfano).
it('registers the payment with the order id inside the payment dict', async () => {
  mockCallKw.mockResolvedValueOnce(undefined).mockResolvedValueOnce([{ ...read, amount_paid: 87822 }])
  const paid = await payOrder(13, 1, 87822)
  expect(mockCallKw.mock.calls[0]).toEqual(['pos.order', 'add_payment', [[13], { pos_order_id: 13, payment_method_id: 1, amount: 87822 }]])
  expect(paid.paid).toBe(87822)
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- lib/services/__tests__/orders.test.ts
```

- [ ] **Paso 3: implementación**

`pos/lib/services/orders.ts`:

```ts
import { toSyncPayload } from '@/lib/domain/order'
import type { DraftOrder } from '@/lib/domain/order'
import { callKw } from '@/lib/services/odoo'

export interface SavedOrder { id: number; reference: string; state: 'draft' | 'paid'; total: number; tax: number; paid: number }
export interface OpenOrder { id: number; tableId: number; total: number; state: 'draft' | 'paid'; lineCount: number }

interface RawOrder { id: number; pos_reference: string; state: SavedOrder['state']; amount_total: number; amount_tax: number; amount_paid: number }
interface RawOpen { id: number; table_id: [number, string] | false; amount_total: number; state: SavedOrder['state']; lines: number[] }

const READ_FIELDS = ['pos_reference', 'state', 'amount_total', 'amount_tax', 'amount_paid']

async function readOrder(id: number): Promise<SavedOrder> {
  const [raw] = await callKw<RawOrder[]>('pos.order', 'read', [[id], READ_FIELDS])
  return { id: raw.id, reference: raw.pos_reference, state: raw.state, total: raw.amount_total, tax: raw.amount_tax, paid: raw.amount_paid }
}

export async function saveOrder(draft: DraftOrder): Promise<SavedOrder> {
  const result = await callKw<{ 'pos.order': { id: number }[] }>('pos.order', 'sync_from_ui', [[toSyncPayload(draft)]])
  const id = result['pos.order'][0].id
  // sync_from_ui deja amount_total en 0 por la API cruda: el recálculo es obligatorio.
  await callKw<void>('pos.order', 'recompute_prices', [[id]])
  return readOrder(id)
}

export async function payOrder(orderId: number, paymentMethodId: number, amount: number): Promise<SavedOrder> {
  await callKw<void>('pos.order', 'add_payment', [[orderId], { pos_order_id: orderId, payment_method_id: paymentMethodId, amount }])
  return readOrder(orderId)
}

export async function closeOrder(orderId: number): Promise<SavedOrder> {
  await callKw<void>('pos.order', 'action_pos_order_paid', [[orderId]])
  return readOrder(orderId)
}

export async function listOpenOrders(sessionId: number): Promise<OpenOrder[]> {
  const rows = await callKw<RawOpen[]>('pos.order', 'search_read',
    [[['session_id', '=', sessionId], ['state', '=', 'draft']], ['table_id', 'amount_total', 'state', 'lines']])
  return rows
    .filter((r) => r.table_id !== false)
    .map((r) => ({ id: r.id, tableId: (r.table_id as [number, string])[0], total: r.amount_total, state: r.state, lineCount: r.lines.length }))
}
```

- [ ] **Paso 4: verificar unitarios**

```bash
cd pos && npm test -- lib/services/__tests__/orders.test.ts
```
Esperado: 3 PASS.

- [ ] **Paso 5: contract test — el flujo completo del cajero**

`pos/lib/services/__contract__/orders.contract.test.ts`:

```ts
import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { addProduct, createDraft } from '@/lib/domain/order'
import { closeOrder, payOrder, saveOrder } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo deja de recalcular impuestos en servidor o si el cierre no llega a state=paid.
it('creates, prices, pays and closes an order against the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const draft = addProduct(addProduct(createDraft({ sessionId: session.id, tableId: catalog.tables[0].id, guests: 2 }), angus), angus)

  const saved = await saveOrder(draft)
  expect(saved.total).toBe(87822)
  const paid = await payOrder(saved.id, cash.id, saved.total)
  expect(paid.paid).toBe(87822)
  const closed = await closeOrder(saved.id)
  expect(closed.state).toBe('paid')
})
```

```bash
cd pos && npm run test:contract -- lib/services/__contract__/orders.contract.test.ts
```
Esperado: 1 PASS con `total = 87822` (2 × 36.900 + IVA 19 %).

- [ ] **Paso 6: commit**

```bash
git add pos && git commit -m "feat(pos): save, price, pay and close orders through the Odoo API"
```

---

### Tarea 7: estado de mesa derivado (`lib/domain/tableState.ts`)

**Archivos:**
- Crear: `pos/lib/domain/tableState.ts`
- Test: `pos/lib/domain/__tests__/tableState.test.ts`

**Interfaces:**
- Consume: `OpenOrder` (T6), `Table` (T4)
- Produce:

```ts
export type TableState = 'free' | 'occupied' | 'kitchen' | 'billing' | 'paid' | 'ordering' | 'served' | 'assist' | 'closed'
export interface LocalFlags { sentToKitchen?: boolean; billing?: boolean; served?: boolean; assist?: boolean; closed?: boolean }
export interface TableView { table: Table; state: TableState; total: number; orderId: number | null }
export function deriveTableViews(tables: Table[], orders: OpenOrder[], flags: Record<number, LocalFlags>): TableView[]
export function countByState(views: TableView[]): Record<TableState, number>
```

Odoo solo sabe *libre / con pedido / pagado*. Los estados **pidiendo, servido,
asistencia, en cocina, en cuenta, cerrada** vienen de `LocalFlags` que la app
mantiene por mesa (en Plan A viven en memoria del store; en el registro central
después). Prioridad cuando coinciden varios: `assist > billing > served >
kitchen > occupied`.

- [ ] **Paso 1: tests que fallan**

`pos/lib/domain/__tests__/tableState.test.ts`:

```ts
import { countByState, deriveTableViews } from '@/lib/domain/tableState'

const tables = [{ id: 1, number: 1, floorId: 1, seats: 4 }, { id: 2, number: 2, floorId: 1, seats: 2 }, { id: 3, number: 3, floorId: 1, seats: 2 }]
const order = { id: 9, tableId: 2, total: 74200, state: 'draft' as const, lineCount: 2 }

// Falla si una mesa sin pedido abierto deja de mostrarse libre.
it('marks tables without an open order as free with zero total', () => {
  const [t1] = deriveTableViews(tables, [order], {})
  expect(t1).toEqual({ table: tables[0], state: 'free', total: 0, orderId: null })
})

// Falla si el monto del pedido abierto no llega a la celda de la mesa.
it('marks a table with an open order as occupied carrying its total', () => {
  const t2 = deriveTableViews(tables, [order], {})[1]
  expect(t2).toMatchObject({ state: 'occupied', total: 74200, orderId: 9 })
})

// Falla si "asistencia" pierde contra "en cocina": la mesa que llama al mesero debe verse siempre.
it('assist flag wins over kitchen flag on the same table', () => {
  const t2 = deriveTableViews(tables, [order], { 2: { sentToKitchen: true, assist: true } })[1]
  expect(t2.state).toBe('assist')
})

// Falla si la leyenda cuenta mal (la cuenta es lo que el gerente mira de reojo).
it('counts views by state including zero for unused states', () => {
  const counts = countByState(deriveTableViews(tables, [order], { 3: { closed: true } }))
  expect(counts).toMatchObject({ free: 1, occupied: 1, closed: 1, kitchen: 0, assist: 0 })
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- lib/domain/__tests__/tableState.test.ts
```

- [ ] **Paso 3: implementación**

`pos/lib/domain/tableState.ts`:

```ts
import type { OpenOrder } from '@/lib/services/orders'
import type { Table } from '@/lib/types'

export type TableState = 'free' | 'occupied' | 'kitchen' | 'billing' | 'paid' | 'ordering' | 'served' | 'assist' | 'closed'
export interface LocalFlags { sentToKitchen?: boolean; billing?: boolean; served?: boolean; assist?: boolean; closed?: boolean; ordering?: boolean }
export interface TableView { table: Table; state: TableState; total: number; orderId: number | null }

const STATES: TableState[] = ['free', 'occupied', 'kitchen', 'billing', 'paid', 'ordering', 'served', 'assist', 'closed']

function stateFor(order: OpenOrder | undefined, flags: LocalFlags): TableState {
  if (flags.closed) return 'closed'
  if (flags.assist) return 'assist'
  if (!order) return flags.ordering ? 'ordering' : 'free'
  if (flags.billing) return 'billing'
  if (flags.served) return 'served'
  if (flags.sentToKitchen) return 'kitchen'
  return 'occupied'
}

export function deriveTableViews(tables: Table[], orders: OpenOrder[], flags: Record<number, LocalFlags>): TableView[] {
  return tables.map((table) => {
    const order = orders.find((o) => o.tableId === table.id)
    return { table, state: stateFor(order, flags[table.id] ?? {}), total: order?.total ?? 0, orderId: order?.id ?? null }
  })
}

export function countByState(views: TableView[]): Record<TableState, number> {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<TableState, number>
  views.forEach((v) => { counts[v.state] += 1 })
  return counts
}
```

- [ ] **Paso 4: verificar que pasan**

```bash
cd pos && npm test -- lib/domain/__tests__/tableState.test.ts
```
Esperado: 4 PASS.

- [ ] **Paso 5: commit**

```bash
git add pos/lib/domain && git commit -m "feat(pos): derive table state from open orders and local flags"
```

---

### Tarea 8: store del pedido (`orderStore`)

**Archivos:**
- Crear: `pos/lib/stores/orderStore.ts`
- Test: `pos/lib/stores/__tests__/orderStore.test.ts`

**Interfaces:**
- Consume: dominio (T5, T7), servicios (T6)
- Produce `useOrderStore`:

```ts
interface OrderState {
  draft: DraftOrder | null
  saved: SavedOrder | null
  openOrders: OpenOrder[]
  flags: Record<number, LocalFlags>
  busy: boolean
  error: string | null
  start: (sessionId: number, tableId: number, guests: number) => void
  add: (product: Product) => void
  changeQty: (lineUuid: string, qty: number) => void
  note: (lineUuid: string, note: string) => void
  remove: (lineUuid: string) => void
  save: () => Promise<void>                 // guardar borrador
  sendToKitchen: () => Promise<void>        // save + flag sentToKitchen
  requestBill: () => Promise<void>          // save + flag billing
  charge: (paymentMethodId: number) => Promise<void>   // pay total + close + limpiar mesa
  refreshOpenOrders: (sessionId: number) => Promise<void>
}
```

- [ ] **Paso 1: tests que fallan**

`pos/lib/stores/__tests__/orderStore.test.ts`:

```ts
import { act } from '@testing-library/react'

import { closeOrder, listOpenOrders, payOrder, saveOrder } from '@/lib/services/orders'
import { useOrderStore } from '@/lib/stores/orderStore'

jest.mock('@/lib/services/orders', () => ({ saveOrder: jest.fn(), payOrder: jest.fn(), closeOrder: jest.fn(), listOpenOrders: jest.fn() }))
const mSave = saveOrder as jest.Mock
const mPay = payOrder as jest.Mock
const mClose = closeOrder as jest.Mock
const mList = listOpenOrders as jest.Mock
const angus = { id: 3, templateId: 2, name: 'Angus', price: 36900, categoryIds: [1], taxIds: [5] }
const saved = { id: 13, reference: '260-1-000009', state: 'draft' as const, total: 87822, tax: 14022, paid: 0 }

beforeEach(() => {
  jest.clearAllMocks()
  useOrderStore.setState({ draft: null, saved: null, openOrders: [], flags: {}, busy: false, error: null })
})

// Falla si enviar a cocina no deja la mesa marcada "en cocina" (el salón no cambiaría de color).
it('sendToKitchen saves the draft and flags the table as sent to kitchen', async () => {
  mSave.mockResolvedValue(saved)
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().sendToKitchen())
  expect(useOrderStore.getState().saved?.total).toBe(87822)
  expect(useOrderStore.getState().flags[6]).toEqual({ sentToKitchen: true })
  expect(useOrderStore.getState().draft?.serverId).toBe(13)
})

// Falla si cobrar paga un monto distinto al total recalculado por Odoo.
it('charge pays the server total with the chosen method and closes the order', async () => {
  mSave.mockResolvedValue(saved); mPay.mockResolvedValue({ ...saved, paid: 87822 }); mClose.mockResolvedValue({ ...saved, state: 'paid', paid: 87822 })
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().charge(1))
  expect(mPay).toHaveBeenCalledWith(13, 1, 87822)
  expect(mClose).toHaveBeenCalledWith(13)
  expect(useOrderStore.getState().draft).toBeNull()
})

// Falla si un error de Odoo deja el store "ocupado" para siempre (botón bloqueado).
it('save surfaces the Odoo message and releases busy', async () => {
  mSave.mockRejectedValue(new Error('Invalid preset'))
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().save())
  expect(useOrderStore.getState()).toMatchObject({ busy: false, error: 'Invalid preset' })
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- lib/stores/__tests__/orderStore.test.ts
```

- [ ] **Paso 3: implementación**

`pos/lib/stores/orderStore.ts`:

```ts
'use client'

import { create } from 'zustand'

import { addProduct, createDraft, removeLine, setNote, setQty } from '@/lib/domain/order'
import type { DraftOrder } from '@/lib/domain/order'
import type { LocalFlags } from '@/lib/domain/tableState'
import { closeOrder, listOpenOrders, payOrder, saveOrder } from '@/lib/services/orders'
import type { OpenOrder, SavedOrder } from '@/lib/services/orders'
import type { Product } from '@/lib/types'

interface OrderState {
  draft: DraftOrder | null
  saved: SavedOrder | null
  openOrders: OpenOrder[]
  flags: Record<number, LocalFlags>
  busy: boolean
  error: string | null
  start: (sessionId: number, tableId: number, guests: number) => void
  add: (product: Product) => void
  changeQty: (lineUuid: string, qty: number) => void
  note: (lineUuid: string, note: string) => void
  remove: (lineUuid: string) => void
  save: () => Promise<void>
  sendToKitchen: () => Promise<void>
  requestBill: () => Promise<void>
  charge: (paymentMethodId: number) => Promise<void>
  refreshOpenOrders: (sessionId: number) => Promise<void>
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido')

export const useOrderStore = create<OrderState>((set, get) => {
  const update = (fn: (d: DraftOrder) => DraftOrder) => {
    const d = get().draft
    if (d) set({ draft: fn(d) })
  }
  const persist = async (): Promise<SavedOrder | null> => {
    const d = get().draft
    if (!d) return null
    set({ busy: true, error: null })
    try {
      const saved = await saveOrder(d)
      set({ saved, draft: { ...d, serverId: saved.id }, busy: false })
      return saved
    } catch (e) {
      set({ busy: false, error: message(e) })
      return null
    }
  }
  const flag = (tableId: number, patch: LocalFlags) =>
    set((s) => ({ flags: { ...s.flags, [tableId]: { ...s.flags[tableId], ...patch } } }))

  return {
    draft: null, saved: null, openOrders: [], flags: {}, busy: false, error: null,
    start: (sessionId, tableId, guests) => set({ draft: createDraft({ sessionId, tableId, guests }), saved: null, error: null }),
    add: (p) => update((d) => addProduct(d, p)),
    changeQty: (u, q) => update((d) => setQty(d, u, q)),
    note: (u, n) => update((d) => setNote(d, u, n)),
    remove: (u) => update((d) => removeLine(d, u)),
    save: async () => { await persist() },
    sendToKitchen: async () => {
      const saved = await persist()
      if (saved) flag(get().draft!.tableId, { sentToKitchen: true })
    },
    requestBill: async () => {
      const saved = await persist()
      if (saved) flag(get().draft!.tableId, { billing: true })
    },
    charge: async (paymentMethodId) => {
      const saved = await persist()
      if (!saved) return
      set({ busy: true })
      try {
        await payOrder(saved.id, paymentMethodId, saved.total)
        await closeOrder(saved.id)
        const tableId = get().draft!.tableId
        set((s) => ({ draft: null, saved: null, busy: false, flags: { ...s.flags, [tableId]: {} } }))
      } catch (e) {
        set({ busy: false, error: message(e) })
      }
    },
    refreshOpenOrders: async (sessionId) => set({ openOrders: await listOpenOrders(sessionId) }),
  }
})
```

- [ ] **Paso 4: verificar que pasan**

```bash
cd pos && npm test -- lib/stores/__tests__/orderStore.test.ts
```
Esperado: 3 PASS.

- [ ] **Paso 5: commit**

```bash
git add pos/lib/stores && git commit -m "feat(pos): add order store wiring draft, kitchen, billing and charge flows"
```

---

### Tarea 9: primitivas de UI (`Button`, `Badge`, `Money`, `ConfirmDialog`)

**Archivos:**
- Crear: `pos/components/ui/Button.tsx`, `Badge.tsx`, `Money.tsx`, `ConfirmDialog.tsx`, `pos/lib/utils.ts`
- Test: `pos/components/ui/__tests__/Button.test.tsx`, `Money.test.tsx`, `ConfirmDialog.test.tsx`

**Interfaces:**
- `Button`: `{ variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'; size?: 'default' | 'money' | 'compact'; ...ButtonHTMLAttributes }` — alturas `h-tap` (56), `h-tap-money` (64), `h-tap-min` (48).
- `Badge`: `{ tone: 'free' | 'busy' | 'kitchen' | 'pending' | 'assist' | 'brand' | 'neutral'; children }` — par suave/tinta, siempre con texto.
- `Money`: `{ amount: number; withSymbol?: boolean; className? }` → `<span class="font-mono tabular">36.900</span>`.
- `ConfirmDialog`: `{ open; title; body; confirmLabel; cancelLabel; destructive?; onConfirm; onCancel }` — `role="dialog"`, botones con `h-tap`.
- `cn(...classes)` en `lib/utils.ts` (concatenación con filtro de falsy).

- [ ] **Paso 1: tests que fallan**

`pos/components/ui/__tests__/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'

import { Button } from '@/components/ui/Button'

// Falla si la acción de dinero baja de los 64 px que fija el sistema Waiter.
it('money size renders the 64px touch target class', () => {
  render(<Button size="money">Cobrar</Button>)
  expect(screen.getByRole('button', { name: 'Cobrar' })).toHaveClass('h-tap-money')
})

// Falla si el primario deja de ser Brasa (el único color de acción permitido en operación).
it('primary variant uses the brand background', () => {
  render(<Button variant="primary">Enviar a cocina</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-brand-500')
})
```

`pos/components/ui/__tests__/Money.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'

import { Money } from '@/components/ui/Money'

// Falla si una cifra sale sin mono tabular: en columnas dejan de alinearse.
it('renders the formatted amount in tabular mono', () => {
  render(<Money amount={80960} withSymbol />)
  const el = screen.getByText('$ 80.960')
  expect(el).toHaveClass('font-mono', 'tabular')
})
```

`pos/components/ui/__tests__/ConfirmDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Falla si el botón de confirmar deja de disparar onConfirm (cobros que nunca se ejecutan).
it('confirm button calls onConfirm once', async () => {
  const onConfirm = jest.fn()
  render(<ConfirmDialog open title="¿Cobrar mesa 9?" body="Total $ 80.960" confirmLabel="Sí, cobrar" cancelLabel="Mejor no" onConfirm={onConfirm} onCancel={jest.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Sí, cobrar' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})

// Falla si un diálogo cerrado sigue en el DOM y captura clics del salón.
it('renders nothing when closed', () => {
  render(<ConfirmDialog open={false} title="x" body="y" confirmLabel="a" cancelLabel="b" onConfirm={jest.fn()} onCancel={jest.fn()} />)
  expect(screen.queryByRole('dialog')).toBeNull()
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- components/ui
```

- [ ] **Paso 3: implementación**

`pos/lib/utils.ts`:

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
```

`pos/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  size?: 'default' | 'money' | 'compact'
}

const VARIANT = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  secondary: 'bg-surface text-ink border border-border hover:bg-muted',
  destructive: 'bg-busy-soft text-busy-ink border border-busy-soft hover:bg-busy hover:text-white',
  ghost: 'bg-transparent text-soft hover:bg-muted',
}
const SIZE = { default: 'h-tap px-5 text-base', money: 'h-tap-money px-6 text-lg', compact: 'h-tap-min px-4 text-[15px]' }

export function Button({ variant = 'secondary', size = 'default', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-md font-semibold', 'disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand-500', VARIANT[variant], SIZE[size], className)}
      {...rest}
    />
  )
}
```

`pos/components/ui/Badge.tsx`:

```tsx
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const TONE = {
  free: 'bg-free-soft text-free-ink', busy: 'bg-busy-soft text-busy-ink', kitchen: 'bg-kitchen-soft text-kitchen-ink',
  pending: 'bg-pending-soft text-pending-ink', assist: 'bg-assist-soft text-assist', brand: 'bg-brand-50 text-brand-600',
  neutral: 'bg-muted text-soft',
}

export function Badge({ tone, children, className }: { tone: keyof typeof TONE; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm font-semibold', TONE[tone], className)}>{children}</span>
}
```

`pos/components/ui/Money.tsx`:

```tsx
import { formatCop } from '@/lib/domain/money'
import { cn } from '@/lib/utils'

export function Money({ amount, withSymbol = false, className }: { amount: number; withSymbol?: boolean; className?: string }) {
  const text = withSymbol ? `$ ${formatCop(amount)}` : formatCop(amount)
  return <span className={cn('font-mono tabular', className)}>{text}</span>
}
```

`pos/components/ui/ConfirmDialog.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean; title: string; body: string; confirmLabel: string; cancelLabel: string
  destructive?: boolean; onConfirm: () => void; onCancel: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-lg bg-surface border border-border p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-2xl font-semibold">{title}</h2>
        <p className="text-base text-soft leading-relaxed">{body}</p>
        <div className="flex gap-4 justify-end pt-2">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
```

El `gap-4` (16 px) entre cancelar y confirmar cumple «las acciones
destructivas nunca van pegadas a la principal».

- [ ] **Paso 4: verificar que pasan**

```bash
cd pos && npm test -- components/ui
```
Esperado: 5 PASS.

- [ ] **Paso 5: commit**

```bash
git add pos && git commit -m "feat(pos): add Waiter UI primitives (button, badge, money, confirm dialog)"
```

---

### Tarea 10: shell de la app, i18n, login y gate de autenticación

**Archivos:**
- Crear: `pos/lib/i18n/messages/es.json`,
  `pos/app/layout.tsx`, `pos/app/page.tsx`, `pos/app/login/page.tsx`,
  `pos/app/(pos)/layout.tsx`, `pos/components/layout/Shell.tsx`,
  `Sidebar.tsx`, `Rail.tsx`, `Topbar.tsx`
- Modificar: `pos/app/providers.tsx` (envolver con `NextIntlClientProvider`)
- Test: `pos/components/layout/__tests__/Sidebar.test.tsx`,
  `pos/app/login/__tests__/page.test.tsx`

**Interfaces:**
- `Shell`: `{ mode: 'sidebar' | 'rail'; children }` — 248 px con grupos en
  salón; 88 px en toma de pedido (según diseño 1a/1b).
- `Topbar`: `{ left: ReactNode; right: ReactNode }` — 76 px.
- Todo texto visible por `useTranslations('pos')`.

- [ ] **Paso 1: mensajes**

`pos/lib/i18n/messages/es.json`:

```json
{
  "pos": {
    "brand": "Waiter",
    "nav": { "operation": "Operación", "sales": "Ventas", "catalog": "Catálogo", "inventory": "Inventario", "customers": "Clientes", "automation": "Automatización", "billing": "Facturación", "settings": "Configuración", "soon": "Próximamente" },
    "rail": { "tables": "Mesas", "orders": "Pedidos", "kitchen": "Cocina", "payments": "Pagos" },
    "topbar": { "operational": "Restaurante operativo", "search": "Buscar mesa o pedido", "newTable": "Nueva mesa" },
    "login": { "title": "Entrar al turno", "user": "Usuario", "password": "Contraseña", "submit": "Entrar", "failed": "Usuario o contraseña incorrectos" },
    "salon": {
      "legend": { "free": "Libre", "occupied": "Ocupada", "kitchen": "En cocina", "ordering": "Pidiendo", "served": "Servido", "billing": "En cuenta", "paid": "Pagado", "assist": "Asistencia", "closed": "Cerrada" },
      "pax": "{count} pax", "table": "Mesa {number}", "emptyPanel": "Toca una mesa para ver su cuenta",
      "subtotal": "Subtotal", "service": "Servicio (10%)", "total": "Total", "split": "Dividir", "print": "Imprimir", "charge": "Cobrar {amount}",
      "confirmTitle": "¿Cobrar mesa {number}?", "confirmBody": "Total {amount} en {method}.", "confirmYes": "Sí, cobrar", "confirmNo": "Mejor no",
      "emptyFloor": "Ni un alma todavía. Buen momento para revisar el inventario."
    },
    "order": {
      "back": "Salón", "header": "Mesa {number}", "meta": "{pax} pax · pedido {ref}", "search": "Buscar plato", "kitchenNote": "Nota a cocina",
      "panelTitle": "Pedido de mesa {number}", "items": "{count} ítems", "modify": "Modificar", "remove": "Quitar", "notePrompt": "Nota para cocina",
      "partial": "Total parcial", "save": "Guardar", "bill": "Cuenta", "send": "Enviar a cocina", "sent": "Pedido enviado. La cocina ya lo tiene.",
      "soldOut": "Agotado", "photo": "Foto 4:3"
    }
  }
}
```

Toda la app es cliente (`'use client'` bajo `(pos)/`), así que basta el
`NextIntlClientProvider` del paso 4: **no** hace falta el plugin de `next-intl`
ni `request.ts`. Menos piezas, menos formas de romperse.

- [ ] **Paso 2: tests que fallan**

`pos/components/layout/__tests__/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Sidebar } from '@/components/layout/Sidebar'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si un módulo sin pantalla (Ventas, Inventario…) se vuelve navegable y lleva a un 404.
it('renders Operación as the only enabled navigation item', () => {
  wrap(<Sidebar active="operation" />)
  expect(screen.getByRole('link', { name: 'Operación' })).toHaveAttribute('href', '/salon')
  expect(screen.getByRole('button', { name: /Ventas/ })).toBeDisabled()
})
```

`pos/app/login/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import LoginPage from '@/app/login/page'
import messages from '@/lib/i18n/messages/es.json'
import { useAuthStore } from '@/lib/stores/authStore'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Falla si un login correcto no lleva al salón (el mesero se queda en el formulario).
it('navigates to the floor after a successful login', async () => {
  useAuthStore.setState({ login: jest.fn().mockResolvedValue(undefined) })
  render(<NextIntlClientProvider locale="es" messages={messages}><LoginPage /></NextIntlClientProvider>)
  await userEvent.type(screen.getByLabelText('Usuario'), 'admin')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'admin')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(push).toHaveBeenCalledWith('/salon')
})
```

- [ ] **Paso 3: verificar que fallan**

```bash
cd pos && npm test -- components/layout app/login
```

- [ ] **Paso 4: implementación**

`pos/components/layout/Sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

const ITEMS = ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'] as const
type Item = (typeof ITEMS)[number]
const ROUTES: Partial<Record<Item, string>> = { operation: '/salon' }

export function Sidebar({ active }: { active: Item }) {
  const t = useTranslations('pos')
  const itemClass = 'flex items-center justify-between h-12 px-3 rounded-[10px] text-base'
  return (
    <aside className="w-sidebar shrink-0 bg-sidebar text-sidebar-soft p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-display text-lg text-ink">Wt.</span>
        <span className="font-display text-xl text-sidebar-ink">{t('brand')}<span className="text-brand-500">.</span></span>
      </div>
      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const href = ROUTES[item]
          if (href) {
            return (
              <Link key={item} href={href} className={cn(itemClass, item === active ? 'bg-brand-500 text-ink font-semibold' : 'hover:bg-sidebar-hover hover:text-sidebar-ink')}>
                {t(`nav.${item}`)}
              </Link>
            )
          }
          return (
            <button key={item} type="button" disabled title={t('nav.soon')} className={cn(itemClass, 'opacity-60 cursor-not-allowed')}>
              {t(`nav.${item}`)}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
```

`pos/components/layout/Rail.tsx` (88 px, para 1b):

```tsx
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

export function Rail({ active }: { active: 'tables' | 'orders' | 'kitchen' | 'payments' }) {
  const t = useTranslations('pos.rail')
  const items = [['tables', '/salon'], ['orders', null], ['kitchen', null], ['payments', null]] as const
  return (
    <aside className="w-rail shrink-0 bg-sidebar p-3 flex flex-col items-center gap-3">
      <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-display text-[17px] text-ink">Wt.</span>
      <nav className="w-full flex flex-col gap-1.5 mt-2">
        {items.map(([key, href]) => {
          const cls = cn('h-16 rounded-md grid place-items-center text-[13px] text-center leading-tight', key === active ? 'bg-brand-500 text-ink font-bold' : 'text-sidebar-soft')
          return href ? <Link key={key} href={href} className={cls}>{t(key)}</Link> : <span key={key} className={cn(cls, 'opacity-60')}>{t(key)}</span>
        })}
      </nav>
    </aside>
  )
}
```

`pos/components/layout/Topbar.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Topbar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <header className="h-[76px] shrink-0 px-7 flex items-center justify-between border-b border-border bg-surface">
      <div className="flex items-center gap-3.5">{left}</div>
      <div className="flex items-center gap-2.5">{right}</div>
    </header>
  )
}
```

`pos/components/layout/Shell.tsx`:

```tsx
import type { ReactNode } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Sidebar } from '@/components/layout/Sidebar'

export function Shell({ mode, children }: { mode: 'sidebar' | 'rail'; children: ReactNode }) {
  return (
    <div className="h-screen flex bg-canvas">
      {mode === 'sidebar' ? <Sidebar active="operation" /> : <Rail active="tables" />}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  )
}
```

`pos/app/(pos)/layout.tsx` — gate:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, hydrated, hydrate } = useAuthStore()
  const load = useCatalogStore((s) => s.load)

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    if (!hydrated) return
    if (!session) { router.replace('/login'); return }
    void load(session.id)
  }, [hydrated, session, router, load])

  if (!hydrated || !session) return null
  return <>{children}</>
}
```

`pos/app/login/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'

export default function LoginPage() {
  const t = useTranslations('pos.login')
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [failed, setFailed] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFailed(false)
    try { await login(user, password); router.push('/salon') } catch { setFailed(true) }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-canvas p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface border border-border rounded-lg p-8 flex flex-col gap-5">
        <h1 className="font-display text-4xl">{t('title')}</h1>
        <label className="flex flex-col gap-2 text-[15px] font-medium">{t('user')}
          <input value={user} onChange={(e) => setUser(e.target.value)} className="h-tap-min rounded-sm border border-border px-3 text-base" autoComplete="username" />
        </label>
        <label className="flex flex-col gap-2 text-[15px] font-medium">{t('password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-tap-min rounded-sm border border-border px-3 text-base" autoComplete="current-password" />
        </label>
        {failed && <p role="alert" className="text-busy-ink text-[15px]">{t('failed')}</p>}
        <Button type="submit" variant="primary">{t('submit')}</Button>
      </form>
    </main>
  )
}
```

`pos/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/salon')
}
```

`pos/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'

import './globals.css'
import Providers from './providers'

export const metadata: Metadata = { title: 'Waiter · POS', description: 'Punto de venta del operador' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`pos/app/providers.tsx` (reemplaza por completo el copiado de la plantilla):

```tsx
'use client'

import { NextIntlClientProvider } from 'next-intl'

import messages from '@/lib/i18n/messages/es.json'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
      {children}
    </NextIntlClientProvider>
  )
}
```

- [ ] **Paso 5: verificar que pasan, typecheck**

```bash
cd pos && npm test -- components/layout app/login && npm run typecheck
```
Esperado: 2 PASS, typecheck limpio.

- [ ] **Paso 6: arrancar y comprobar el proxy a mano (una vez)**

```bash
cd pos && npm run dev -- --hostname 192.168.56.10 --port 3000
```
En la anfitriona: `http://192.168.56.10:3000/login`, entrar con `admin/admin`.
Esperado: redirige a `/salon` (que aún está vacío) sin error de CORS en consola.

- [ ] **Paso 7: commit**

```bash
git add pos && git commit -m "feat(pos): add app shell, Spanish messages, login page and auth gate"
```

---

### Tarea 11: pantalla 1a — plano de salón con panel de cuenta

**Archivos:**
- Crear: `pos/app/(pos)/salon/page.tsx`, `pos/components/salon/FloorTabs.tsx`,
  `StateLegend.tsx`, `TableGrid.tsx`, `TableCell.tsx`, `BillPanel.tsx`
- Test: `pos/components/salon/__tests__/TableCell.test.tsx`,
  `pos/components/salon/__tests__/BillPanel.test.tsx`, `pos/e2e/salon.spec.ts`

**Interfaces:**
- `TableCell`: `{ view: TableView; selected: boolean; onSelect(id) }` — 138 px,
  radio 16, número 34 px bold, meta mono 13 px, palabra de estado 15 px,
  monto mono 16 px, barra de progreso 9 px. Color de fondo por estado:
  `free→bg-free`, `occupied/served→bg-busy`, `kitchen→bg-kitchen`,
  `ordering→bg-pending`, `assist→bg-assist`, `paid→bg-free-ink`,
  `billing→bg-surface + border-2 border-brand-500 + ring`, `closed→bg-muted text-ink-3 dashed`.
- `BillPanel`: `{ view: TableView | null; lines: DraftLine[]; onCharge(); onOpenOrder() }` — 372 px.
- `StateLegend`: `{ counts: Record<TableState, number> }` — muestra
  `free, occupied, kitchen, ordering` con cuadradito 10 px + texto + conteo.

- [ ] **Paso 1: tests que fallan**

`pos/components/salon/__tests__/TableCell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TableCell } from '@/components/salon/TableCell'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const table = { id: 6, number: 9, floorId: 1, seats: 4 }

// Falla si el estado se comunica solo con color: un 8% de los meseros no distingue rojo/verde.
it('renders the state word next to the table number', () => {
  wrap(<TableCell view={{ table, state: 'billing', total: 48800, orderId: 9 }} selected={false} onSelect={jest.fn()} />)
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('En cuenta')).toBeInTheDocument()
  expect(screen.getByText('48.800')).toHaveClass('font-mono')
})

// Falla si una mesa libre muestra un monto en cero como si tuviera consumo.
it('omits the amount when the table is free', () => {
  wrap(<TableCell view={{ table, state: 'free', total: 0, orderId: null }} selected={false} onSelect={jest.fn()} />)
  expect(screen.queryByText('0')).toBeNull()
  expect(screen.getByText('4 pax')).toBeInTheDocument()
})
```

`pos/components/salon/__tests__/BillPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { BillPanel } from '@/components/salon/BillPanel'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const view = { table: { id: 6, number: 9, floorId: 1, seats: 4 }, state: 'billing' as const, total: 73600, orderId: 9 }
const lines = [{ uuid: 'a', productId: 3, name: 'Hamburguesa Angus', unitPrice: 36900, qty: 1, note: '', taxIds: [] }]

// Falla si el total deja de ser el elemento más grande o el botón de cobrar deja de llevar el monto.
it('shows the server total and a charge button carrying the amount', () => {
  wrap(<BillPanel view={view} lines={lines} onCharge={jest.fn()} onOpenOrder={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Cobrar $ 73.600' })).toHaveClass('h-tap-money', 'bg-brand-500')
})

// Falla si el panel intenta pintar líneas sin mesa seleccionada (crash al abrir el salón).
it('renders the empty hint when no table is selected', () => {
  wrap(<BillPanel view={null} lines={[]} onCharge={jest.fn()} onOpenOrder={jest.fn()} />)
  expect(screen.getByText('Toca una mesa para ver su cuenta')).toBeInTheDocument()
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- components/salon
```

- [ ] **Paso 3: implementación**

`pos/components/salon/TableCell.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { TableView } from '@/lib/domain/tableState'
import { cn } from '@/lib/utils'

const SURFACE = {
  free: 'bg-free text-white', occupied: 'bg-busy text-white', served: 'bg-busy text-white', kitchen: 'bg-kitchen text-white',
  ordering: 'bg-pending text-white', assist: 'bg-assist text-white', paid: 'bg-free-ink text-white',
  billing: 'bg-surface text-ink border-2 border-brand-500 ring-4 ring-brand-50',
  closed: 'bg-muted text-ink-3 border border-dashed border-border',
}

export function TableCell({ view, selected, onSelect }: { view: TableView; selected: boolean; onSelect: (id: number) => void }) {
  const t = useTranslations('pos.salon')
  const { table, state, total } = view
  const showAmount = total > 0
  return (
    <button
      type="button"
      onClick={() => onSelect(table.id)}
      aria-pressed={selected}
      className={cn('relative h-table-cell rounded-2xl p-3.5 flex flex-col justify-between text-left shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]',
        SURFACE[state], selected && state !== 'billing' && 'ring-4 ring-brand-300')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[34px] font-bold leading-none">{table.number}</span>
        <span className="font-mono text-[13px] opacity-80">{t('pax', { count: table.seats })}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-[15px] font-medium whitespace-nowrap', state === 'billing' && 'text-brand-600 font-semibold')}>{t(`legend.${state}`)}</span>
        {showAmount && <Money amount={total} className="text-base" />}
      </div>
      <div className={cn('h-[9px] rounded-full', showAmount ? 'bg-black/30' : 'border border-dashed border-white/45')} />
    </button>
  )
}
```

`pos/components/salon/StateLegend.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import type { TableState } from '@/lib/domain/tableState'

const SHOWN: Array<[TableState, string]> = [['free', 'bg-free'], ['occupied', 'bg-busy'], ['kitchen', 'bg-kitchen'], ['ordering', 'bg-pending']]

export function StateLegend({ counts }: { counts: Record<TableState, number> }) {
  const t = useTranslations('pos.salon.legend')
  return (
    <div className="flex items-center gap-2 text-sm text-soft">
      {SHOWN.map(([state, color]) => (
        <span key={state} className="inline-flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-[3px] ${color}`} />{t(state)} {counts[state]}
        </span>
      ))}
    </div>
  )
}
```

`pos/components/salon/FloorTabs.tsx`:

```tsx
'use client'

import type { Floor } from '@/lib/types'
import { cn } from '@/lib/utils'

export function FloorTabs({ floors, activeId, onChange }: { floors: Floor[]; activeId: number | null; onChange: (id: number) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 p-1 bg-muted rounded-md">
      {floors.map((f) => (
        <button key={f.id} role="tab" aria-selected={f.id === activeId} onClick={() => onChange(f.id)}
          className={cn('px-4.5 py-2.75 rounded-[9px] text-[15px] min-h-tap-min', f.id === activeId ? 'bg-surface font-semibold shadow-sm' : 'text-soft')}>
          {f.name}
        </button>
      ))}
    </div>
  )
}
```

`pos/components/salon/TableGrid.tsx`:

```tsx
'use client'

import { TableCell } from '@/components/salon/TableCell'
import type { TableView } from '@/lib/domain/tableState'

export function TableGrid({ views, selectedId, onSelect }: { views: TableView[]; selectedId: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-4.5 content-start p-1.5">
      {views.map((v) => <TableCell key={v.table.id} view={v} selected={v.table.id === selectedId} onSelect={onSelect} />)}
    </div>
  )
}
```

`pos/components/salon/BillPanel.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { formatCop } from '@/lib/domain/money'
import type { DraftLine } from '@/lib/domain/order'
import type { TableView } from '@/lib/domain/tableState'

interface BillPanelProps { view: TableView | null; lines: DraftLine[]; onCharge: () => void; onOpenOrder: () => void }

export function BillPanel({ view, lines, onCharge, onOpenOrder }: BillPanelProps) {
  const t = useTranslations('pos.salon')
  if (!view) {
    return <aside className="w-panel shrink-0 border-l border-border bg-surface grid place-items-center text-soft text-[15px] p-6 text-center">{t('emptyPanel')}</aside>
  }
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0)
  const service = Math.round(subtotal * 0.1)
  return (
    <aside className="w-panel shrink-0 border-l border-border bg-surface flex flex-col">
      {/* La cabecera es el acceso al pedido: tocar "Mesa N" abre la toma de pedido. */}
      <button type="button" onClick={onOpenOrder} className="p-5 border-b border-muted flex items-center justify-between text-left w-full hover:bg-canvas">
        <div className="flex flex-col gap-1">
          <span className="text-[26px] font-bold leading-none">{t('table', { number: view.table.number })}</span>
          <span className="text-sm text-soft">{t('pax', { count: view.table.seats })}</span>
        </div>
        <Badge tone={view.state === 'billing' ? 'brand' : 'neutral'}>{t(`legend.${view.state}`)}</Badge>
      </button>
      <div className="flex-1 min-h-0 px-5 py-1.5 overflow-auto">
        {lines.map((l) => (
          <div key={l.uuid} className="grid grid-cols-[26px_1fr_auto] gap-3 py-3.5 text-[17px] border-b border-muted">
            <span className="font-mono text-ink-3">{l.qty}</span><span>{l.name}</span><Money amount={l.unitPrice * l.qty} />
          </div>
        ))}
      </div>
      <div className="p-4.5 border-t border-muted bg-canvas">
        <div className="flex justify-between text-[15px] text-soft py-0.5"><span>{t('subtotal')}</span><Money amount={subtotal} /></div>
        <div className="flex justify-between text-[15px] text-soft py-0.5"><span>{t('service')}</span><Money amount={service} /></div>
        <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-border">
          <span className="text-xl font-bold">{t('total')}</span><Money amount={view.total || subtotal} withSymbol className="text-4xl" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <Button disabled>{t('split')}</Button>
          <Button disabled>{t('print')}</Button>
        </div>
        <Button variant="primary" size="money" className="w-full mt-2.5" onClick={onCharge} disabled={lines.length === 0}>
          {t('charge', { amount: `$ ${formatCop(view.total || subtotal)}` })}
        </Button>
      </div>
    </aside>
  )
}
```

`Dividir` e `Imprimir` van deshabilitados en Plan A (no hay flujo diseñado).
El total mostrado es el de Odoo cuando existe (`view.total`, ya con IVA) y el
subtotal del borrador cuando aún no se guardó.

`pos/app/(pos)/salon/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { BillPanel } from '@/components/salon/BillPanel'
import { FloorTabs } from '@/components/salon/FloorTabs'
import { StateLegend } from '@/components/salon/StateLegend'
import { TableGrid } from '@/components/salon/TableGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCop } from '@/lib/domain/money'
import { countByState, deriveTableViews } from '@/lib/domain/tableState'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useFloorStore } from '@/lib/stores/floorStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export default function SalonPage() {
  const t = useTranslations('pos')
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const { activeFloorId, selectedTableId, setFloor, selectTable } = useFloorStore()
  const { openOrders, flags, draft, refreshOpenOrders, charge, busy } = useOrderStore()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (session) void refreshOpenOrders(session.id) }, [session, refreshOpenOrders])
  useEffect(() => { if (catalog && activeFloorId === null && catalog.floors[0]) setFloor(catalog.floors[0].id) }, [catalog, activeFloorId, setFloor])

  const views = useMemo(() => {
    if (!catalog) return []
    const tables = catalog.tables.filter((x) => x.floorId === activeFloorId)
    return deriveTableViews(tables, openOrders, flags)
  }, [catalog, activeFloorId, openOrders, flags])
  const selected = views.find((v) => v.table.id === selectedTableId) ?? null
  const cash = catalog?.paymentMethods.find((m) => m.type === 'cash')

  async function onConfirmCharge() {
    if (!cash) return
    await charge(cash.id)
    setConfirming(false)
    if (session) await refreshOpenOrders(session.id)
    selectTable(null)
  }

  if (!catalog) return null
  return (
    <Shell mode="sidebar">
      <Topbar
        left={<><span className="text-[15px] text-soft">{new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span><Badge tone="free"><span className="w-[7px] h-[7px] rounded-full bg-free" />{t('topbar.operational')}</Badge></>}
        right={<><Button variant="secondary" disabled>{t('topbar.search')}</Button><Button variant="primary" disabled>{t('topbar.newTable')}</Button></>}
      />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <FloorTabs floors={catalog.floors} activeId={activeFloorId} onChange={setFloor} />
            <StateLegend counts={countByState(views)} />
          </div>
          {views.length === 0 ? <p className="text-soft text-base">{t('salon.emptyFloor')}</p> : <TableGrid views={views} selectedId={selectedTableId} onSelect={selectTable} />}
        </section>
        <BillPanel view={selected} lines={draft?.tableId === selectedTableId ? draft.lines : []} onCharge={() => setConfirming(true)} onOpenOrder={() => selected && router.push(`/mesas/${selected.table.id}`)} />
      </div>
      <ConfirmDialog open={confirming && !!selected} title={t('salon.confirmTitle', { number: selected?.table.number ?? 0 })}
        body={t('salon.confirmBody', { amount: `$ ${formatCop(selected?.total ?? 0)}`, method: cash?.name ?? '' })}
        confirmLabel={t('salon.confirmYes')} cancelLabel={t('salon.confirmNo')} onConfirm={onConfirmCharge} onCancel={() => setConfirming(false)} />
      {busy && <span className="sr-only" role="status">…</span>}
    </Shell>
  )
}
```

Nota de diseño respetada: en el salón hay **un solo botón Brasa** activo por
vista: *Cobrar* en el panel. *Nueva mesa* del topbar queda deshabilitado en
Plan A (no hay flujo), así no compiten dos Brasa.

- [ ] **Paso 4: verificar unitarios y typecheck**

```bash
cd pos && npm test -- components/salon && npm run typecheck
```
Esperado: 4 PASS.

- [ ] **Paso 5: E2E que falla**

`pos/e2e/helpers/odoo.ts`:

```ts
import type { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('admin')
  await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/salon')
}
```

`pos/e2e/salon.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: salon-view-tables  @outcome: display
test('the floor shows the seeded tables with their state word', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('tab', { name: 'Terraza' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^1\b.*Libre/ })).toBeVisible()
  await expect(page.getByText('Toca una mesa para ver su cuenta')).toBeVisible()
})
```

`pos/playwright.config.ts`: dejar un solo `webServer`:

```ts
webServer: {
  command: 'npm run dev -- --port 3000',
  url: 'http://localhost:3000/login',
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
},
```

- [ ] **Paso 6: correr el E2E**

```bash
cd pos && npx playwright install chromium && npx playwright test e2e/salon.spec.ts
```
Esperado: 1 passed. Requiere Odoo arriba (compose) y la base `projectapp`
sembrada con la Terraza de 12 mesas.

- [ ] **Paso 7: commit**

```bash
git add pos && git commit -m "feat(pos): add floor plan screen with table states and bill panel"
```

---

### Tarea 12: pantalla 1b — toma de pedido

**Archivos:**
- Crear: `pos/app/(pos)/mesas/[tableId]/page.tsx`,
  `pos/components/order/CategoryChips.tsx`, `ProductGrid.tsx`,
  `ProductCard.tsx`, `OrderPanel.tsx`, `OrderLineRow.tsx`, `QtyStepper.tsx`
- Test: `pos/components/order/__tests__/QtyStepper.test.tsx`,
  `pos/components/order/__tests__/OrderPanel.test.tsx`, `pos/e2e/pedido.spec.ts`

**Interfaces:**
- `CategoryChips`: `{ categories: Category[]; counts: Record<number, number>; activeId: number | null; onChange(id|null) }` — chips 48 px píldora; activo en Brasa.
- `ProductCard`: `{ product: Product; onAdd(product) }` — 214 px alto, foto 4:3 placeholder, nombre 17 px, precio mono 17 px.
- `QtyStepper`: `{ qty; onChange(qty) }` — tres celdas de 52 px, cantidad en mono.
- `OrderLineRow`: `{ line: DraftLine; selected; onSelect; onQty; onNote; onRemove }`.
- `OrderPanel`: `{ tableNumber; lines; selectedUuid; busy; onSelectLine; onQty; onNote; onRemove; onSave; onBill; onSend }` — 400 px.

- [ ] **Paso 1: tests que fallan**

`pos/components/order/__tests__/QtyStepper.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { QtyStepper } from '@/components/order/QtyStepper'

// Falla si el "+" deja de sumar de uno en uno (el mesero pide 2 y salen 3).
it('plus increments the quantity by one', async () => {
  const onChange = jest.fn()
  render(<QtyStepper qty={1} onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: '＋' }))
  expect(onChange).toHaveBeenCalledWith(2)
})

// Falla si las celdas bajan de los 52 px que "se aciertan sin mirar".
it('renders 52px touch cells', () => {
  render(<QtyStepper qty={1} onChange={jest.fn()} />)
  expect(screen.getByRole('button', { name: '−' })).toHaveClass('w-[52px]', 'h-[52px]')
})
```

`pos/components/order/__tests__/OrderPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { OrderPanel } from '@/components/order/OrderPanel'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const lines = [
  { uuid: 'a', productId: 3, name: 'Hamburguesa Angus', unitPrice: 36900, qty: 2, note: 'sin cebolla', taxIds: [] },
  { uuid: 'b', productId: 5, name: 'Limonada de coco', unitPrice: 9900, qty: 2, note: '', taxIds: [] },
]
const noop = jest.fn()

// Falla si el total parcial deja de sumar las líneas (el mesero anuncia un monto falso).
it('shows the partial total of all lines and the item count', () => {
  wrap(<OrderPanel tableNumber={8} lines={lines} selectedUuid={null} busy={false} onSelectLine={noop} onQty={noop} onNote={noop} onRemove={noop} onSave={noop} onBill={noop} onSend={noop} />)
  expect(screen.getByText('$ 93.600')).toHaveClass('font-mono')
  expect(screen.getByText('2 ítems')).toBeInTheDocument()
})

// Falla si la nota de cocina ("sin cebolla") no se ve en la línea: la cocina la prepara mal.
it('renders the line note as a chip', () => {
  wrap(<OrderPanel tableNumber={8} lines={lines} selectedUuid={null} busy={false} onSelectLine={noop} onQty={noop} onNote={noop} onRemove={noop} onSave={noop} onBill={noop} onSend={noop} />)
  expect(screen.getByText('sin cebolla')).toBeInTheDocument()
})

// Falla si "Enviar a cocina" queda habilitado con el pedido vacío (comandas en blanco).
it('disables send when there are no lines', () => {
  wrap(<OrderPanel tableNumber={8} lines={[]} selectedUuid={null} busy={false} onSelectLine={noop} onQty={noop} onNote={noop} onRemove={noop} onSave={noop} onBill={noop} onSend={noop} />)
  expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeDisabled()
})
```

- [ ] **Paso 2: verificar que fallan**

```bash
cd pos && npm test -- components/order
```

- [ ] **Paso 3: implementación**

`pos/components/order/QtyStepper.tsx`:

```tsx
'use client'

export function QtyStepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  const cell = 'w-[52px] h-[52px] grid place-items-center text-[22px] text-soft'
  return (
    <div className="inline-flex items-center border border-border rounded-md overflow-hidden bg-surface">
      <button type="button" className={cell} onClick={() => onChange(qty - 1)}>−</button>
      <span className="w-[52px] text-center font-mono tabular text-[19px]">{qty}</span>
      <button type="button" className={`${cell} border-l border-muted`} onClick={() => onChange(qty + 1)}>＋</button>
    </div>
  )
}
```

`pos/components/order/OrderLineRow.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { QtyStepper } from '@/components/order/QtyStepper'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import type { DraftLine } from '@/lib/domain/order'
import { cn } from '@/lib/utils'

interface Props { line: DraftLine; selected: boolean; onSelect: () => void; onQty: (q: number) => void; onNote: () => void; onRemove: () => void }

export function OrderLineRow({ line, selected, onSelect, onQty, onNote, onRemove }: Props) {
  const t = useTranslations('pos.order')
  const chips = line.note.split(' · ').filter(Boolean)
  return (
    <div className={cn('py-3.5 border-b border-muted flex flex-col gap-1.5', selected && 'bg-brand-50 -mx-5 px-5')}>
      <button type="button" onClick={onSelect} className={cn('grid grid-cols-[26px_1fr_auto] gap-2.5 text-[17px] text-left w-full', selected && 'font-semibold')}>
        <span className={cn('font-mono', selected ? 'text-brand-600' : 'text-ink-3')}>{line.qty}</span>
        <span>{line.name}</span>
        <Money amount={line.unitPrice * line.qty} />
      </button>
      {chips.length > 0 && !selected && (
        <div className="flex gap-1.5 pl-9">{chips.map((c) => <span key={c} className="h-[30px] px-2.5 rounded-sm bg-muted text-sm text-soft grid place-items-center">{c}</span>)}</div>
      )}
      {selected && (
        <div className="flex items-center gap-2.5 mt-2.5 pl-9">
          <QtyStepper qty={line.qty} onChange={onQty} />
          <Button size="compact" onClick={onNote}>{t('modify')}</Button>
          <Button size="compact" variant="destructive" className="ml-2" onClick={onRemove}>{t('remove')}</Button>
        </div>
      )}
    </div>
  )
}
```

`pos/components/order/OrderPanel.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { OrderLineRow } from '@/components/order/OrderLineRow'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import type { DraftLine } from '@/lib/domain/order'

interface Props {
  tableNumber: number; lines: DraftLine[]; selectedUuid: string | null; busy: boolean
  onSelectLine: (uuid: string | null) => void; onQty: (uuid: string, qty: number) => void; onNote: (uuid: string) => void
  onRemove: (uuid: string) => void; onSave: () => void; onBill: () => void; onSend: () => void
}

export function OrderPanel({ tableNumber, lines, selectedUuid, busy, onSelectLine, onQty, onNote, onRemove, onSave, onBill, onSend }: Props) {
  const t = useTranslations('pos.order')
  const total = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0)
  return (
    <aside className="w-panel-lg shrink-0 border-l border-border bg-surface flex flex-col">
      <div className="px-5 py-4 border-b border-muted flex items-center justify-between">
        <span className="text-[19px] font-semibold">{t('panelTitle', { number: tableNumber })}</span>
        <span className="text-[15px] text-soft">{t('items', { count: lines.length })}</span>
      </div>
      <div className="flex-1 min-h-0 px-5 py-1 overflow-auto">
        {lines.map((l) => (
          <OrderLineRow key={l.uuid} line={l} selected={l.uuid === selectedUuid}
            onSelect={() => onSelectLine(l.uuid === selectedUuid ? null : l.uuid)} onQty={(q) => onQty(l.uuid, q)} onNote={() => onNote(l.uuid)} onRemove={() => onRemove(l.uuid)} />
        ))}
      </div>
      <div className="px-5 py-4 border-t border-muted bg-canvas">
        <div className="flex justify-between items-baseline mb-3.5"><span className="text-lg font-semibold">{t('partial')}</span><Money amount={total} withSymbol className="text-3xl" /></div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={onSave} disabled={busy || lines.length === 0}>{t('save')}</Button>
          <Button onClick={onBill} disabled={busy || lines.length === 0}>{t('bill')}</Button>
        </div>
        <Button variant="primary" size="money" className="w-full mt-2.5" onClick={onSend} disabled={busy || lines.length === 0}>{t('send')}</Button>
      </div>
    </aside>
  )
}
```

`pos/components/order/ProductCard.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { Product } from '@/lib/types'

export function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const t = useTranslations('pos.order')
  return (
    <button type="button" onClick={() => onAdd(product)} className="h-[214px] border border-border rounded-[14px] bg-surface overflow-hidden flex flex-col text-left active:ring-4 active:ring-brand-50">
      <div className="flex-1 bg-muted grid place-items-center text-xs tracking-[0.08em] uppercase text-ink-3">{t('photo')}</div>
      <div className="px-3.5 py-3 flex flex-col gap-1.5">
        <span className="text-[17px] font-semibold leading-tight">{product.name}</span>
        <Money amount={product.price} className="text-[17px]" />
      </div>
    </button>
  )
}
```

`pos/components/order/CategoryChips.tsx`:

```tsx
'use client'

import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props { categories: Category[]; counts: Record<number, number>; activeId: number | null; onChange: (id: number | null) => void }

export function CategoryChips({ categories, counts, activeId, onChange }: Props) {
  return (
    <div className="px-6 pt-4.5 pb-3.5 flex gap-2 flex-wrap border-b border-muted">
      {categories.map((c) => (
        <button key={c.id} type="button" onClick={() => onChange(c.id === activeId ? null : c.id)}
          className={cn('h-tap-min px-4.5 rounded-full text-base grid place-items-center', c.id === activeId ? 'bg-brand-500 text-white font-semibold' : 'bg-surface border border-border')}>
          {c.name} {counts[c.id] ?? 0}
        </button>
      ))}
    </div>
  )
}
```

`pos/components/order/ProductGrid.tsx`:

```tsx
'use client'

import { ProductCard } from '@/components/order/ProductCard'
import type { Product } from '@/lib/types'

export function ProductGrid({ products, onAdd }: { products: Product[]; onAdd: (p: Product) => void }) {
  return (
    <div className="flex-1 min-h-0 p-4.5 px-6 grid grid-cols-4 auto-rows-[214px] gap-3.5 content-start overflow-auto">
      {products.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}
    </div>
  )
}
```

`pos/app/(pos)/mesas/[tableId]/page.tsx`:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Topbar } from '@/components/layout/Topbar'
import { CategoryChips } from '@/components/order/CategoryChips'
import { OrderPanel } from '@/components/order/OrderPanel'
import { ProductGrid } from '@/components/order/ProductGrid'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export default function OrderPage() {
  const t = useTranslations('pos.order')
  const router = useRouter()
  const tableId = Number(useParams<{ tableId: string }>().tableId)
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const order = useOrderStore()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)

  const table = catalog?.tables.find((x) => x.id === tableId)

  useEffect(() => {
    if (session && table && order.draft?.tableId !== tableId) order.start(session.id, tableId, table.seats)
  }, [session, table, tableId, order])

  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    catalog?.products.forEach((p) => p.categoryIds.forEach((id) => { c[id] = (c[id] ?? 0) + 1 }))
    return c
  }, [catalog])
  const products = useMemo(() => (catalog?.products ?? []).filter((p) => categoryId === null || p.categoryIds.includes(categoryId)), [catalog, categoryId])

  function onNote(uuid: string) {
    const current = order.draft?.lines.find((l) => l.uuid === uuid)?.note ?? ''
    const note = window.prompt(t('notePrompt'), current)
    if (note !== null) order.note(uuid, note.trim())
  }
  async function onSend() { await order.sendToKitchen(); if (!order.error) router.push('/salon') }
  async function onBill() { await order.requestBill(); if (!order.error) router.push('/salon') }

  if (!catalog || !table || !order.draft) return null
  return (
    <div className="h-screen flex bg-canvas">
      <Rail active="tables" />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          left={<><Button size="compact" onClick={() => router.push('/salon')}>← {t('back')}</Button><span className="text-[22px] font-bold">{t('header', { number: table.number })}</span><span className="text-[15px] text-soft">{t('meta', { pax: table.seats, ref: order.saved?.reference ?? '—' })}</span></>}
          right={<><Button size="compact" disabled>{t('search')}</Button><Button size="compact" disabled>{t('kitchenNote')}</Button></>}
        />
        {order.error && <p role="alert" className="mx-6 mt-3 px-4 py-3 rounded-md bg-busy-soft text-busy-ink text-[15px]">{order.error}</p>}
        <div className="flex-1 min-h-0 flex">
          <section className="flex-1 min-w-0 flex flex-col">
            <CategoryChips categories={catalog.categories} counts={counts} activeId={categoryId} onChange={setCategoryId} />
            <ProductGrid products={products} onAdd={order.add} />
          </section>
          <OrderPanel tableNumber={table.number} lines={order.draft.lines} selectedUuid={selectedLine} busy={order.busy}
            onSelectLine={setSelectedLine} onQty={order.changeQty} onNote={onNote} onRemove={(u) => { order.remove(u); setSelectedLine(null) }}
            onSave={order.save} onBill={onBill} onSend={onSend} />
        </div>
      </div>
    </div>
  )
}
```

La nota de cocina usa `window.prompt` en Plan A: es el único diálogo con
entrada de texto y no hay diseño para él; se reemplaza cuando exista.

- [ ] **Paso 4: verificar unitarios y typecheck**

```bash
cd pos && npm test -- components/order && npm run typecheck && npm run lint
```
Esperado: 5 PASS, sin errores.

- [ ] **Paso 5: E2E del flujo completo**

`pos/e2e/pedido.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: order-send-and-charge  @outcome: success
test('a waiter opens a table, adds two burgers, sends to kitchen and charges', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: /^3\b.*Libre/ }).click()
  await page.getByText('Toca una mesa para ver su cuenta').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Mesa 3/ }).click()
  await page.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await page.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await expect(page.getByText('$ 73.800')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')
  await expect(page.getByRole('button', { name: /^3\b.*En cocina/ })).toBeVisible()
  await page.getByRole('button', { name: /^3\b.*En cocina/ }).click()
  await page.getByRole('button', { name: /^Cobrar \$ 87\.822$/ }).click()
  await page.getByRole('button', { name: 'Sí, cobrar' }).click()
  await expect(page.getByRole('button', { name: /^3\b.*Libre/ })).toBeVisible()
})
```

El `87.822` es el total con IVA que Odoo calcula (2 × 36.900 + 19 %): el E2E
prueba que el salón muestra el total del servidor y no el subtotal local.

```bash
cd pos && npx playwright test e2e/pedido.spec.ts
```
Esperado: 1 passed. Cada corrida deja un pedido pagado en Odoo: es aceptable
en la base de referencia; **nunca** apuntar este E2E a un inquilino real.

- [ ] **Paso 6: commit**

```bash
git add pos && git commit -m "feat(pos): add order-taking screen with categories, product grid and order panel"
```

---

### Tarea 13: documentación, README de `pos/` y cierre del plan

**Archivos:**
- Crear: `pos/README.md`
- Modificar: `docs/arquitectura/2026-09-04-arquitectura-modular.md` (árbol del
  repo: añadir `pos/`), `README.md` raíz (estado)

- [ ] **Paso 1: README de la app**

`pos/README.md`:

```markdown
# pos — POS del operador

App Next.js para mesero y cajero. Habla con Odoo por su API externa JSON-RPC a
través del proxy same-origin `/odoo/*`; **nunca usa la interfaz de Odoo**.
Diseño: `docs/diseno/waiter-pantallas.dc.html` (pantallas 1a y 1b).

## Correr

    export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use   # Node 24.20.0
    npm install
    cp .env.local.example .env.local                                # ODOO_ORIGIN, NEXT_PUBLIC_ODOO_DB
    npm run dev -- --hostname 192.168.56.10 --port 3000

Odoo debe estar arriba: `docker compose -p odoo-spike -f ../odoo/compose/docker-compose.yml up -d`.
El navegador corre en la máquina anfitriona: entrar por `http://192.168.56.10:3000`.

## Tests — nunca la suite completa

| Capa | Comando | Contra qué |
|---|---|---|
| Unitarios (Jest, jsdom) | `npm test -- <ruta>` | mocks; dominio y stores |
| Contrato (Jest, node) | `npm run test:contract -- <ruta>` | **Odoo real**; falla si Odoo no responde |
| E2E (Playwright) | `npx playwright test <spec>` | Next + Odoo real; deja pedidos pagados en la base de referencia |

Cada test: ≤50 líneas, ≤7 asserts, sin condicionales, y un comentario
`// Falla si …` que nombre el bug que atrapa. Los E2E llevan `@flow:` y
`@outcome:`.

## Fuera de Plan A (y dónde vive)

KDS de cocina → Plan B · Dashboard de ROI y operación en vivo → Plan C ·
modo sin conexión, propina real, impresión de comanda, sugerencias del Mesero
IA, modificadores por atributo y agotados por inventario → siguientes planes.
```

Crear también `pos/.env.local.example` con las dos variables del paso 3 de la
tarea 1, para que el README no prometa un archivo que no existe.

- [ ] **Paso 2: árbol de arquitectura**

En el bloque `Estructura del repositorio` del documento de arquitectura,
añadir bajo la raíz:

```text
├── pos/                   app Next.js del operador: mesero y cajero (bloque 1, lado cliente)
```

- [ ] **Paso 3: verificación final de la rama**

```bash
cd pos && npm run typecheck && npm run lint
cd .. && git log --oneline main..HEAD
```
Esperado: 13 commits por delante de `main`, typecheck y lint limpios.

- [ ] **Paso 4: commit**

```bash
git add pos/README.md docs README.md && git commit -m "docs(pos): document the operator app, its test layers and Plan A scope"
```

---

## Autorevisión del plan

**Cobertura de la spec (1a y 1b):** sidebar 248 con grupos (T10) · topbar con
fecha y pill operativo (T11) · tabs de piso y leyenda con conteos (T11) · celda
de mesa 138 px con número 34, meta mono, estado en palabra, monto y barra
(T11) · panel 372 con líneas, subtotal, servicio 10 %, total 36 px, Dividir e
Imprimir secundarios y Cobrar Brasa 64 px (T11) · rail 88 (T10) · header con
← Salón, mesa y referencia (T12) · chips de categoría 48 px con conteo (T12) ·
rejilla 4 × 214 con foto 4:3 y precio mono (T12) · panel 400 con líneas, chips
de nota, stepper 52, Modificar/Quitar, total parcial 30 px, Guardar/Cuenta y
Enviar a cocina 64 px (T12). **Sin tarea:** «El favorito», «Agotado», el bloque
«Alex sugiere» y «Pedido por el mesero IA» — dependen de datos del bloque 3 y
quedan declarados fuera de alcance arriba.

**Consistencia de tipos:** `SavedOrder`/`OpenOrder` (T6) se consumen igual en
T7, T8 y T11; `DraftLine` (T5) en T11 y T12; `TableView`/`LocalFlags` (T7) en
T8 y T11; `useOrderStore` expone exactamente `start/add/changeQty/note/remove/
save/sendToKitchen/requestBill/charge/refreshOpenOrders` (T8) y T12 usa esos
nombres.

**Placeholders:** ninguno; cada paso de código lleva el código.

---

### Tarea 14 (añadida tras revisión visual): fidelidad al diseño y cobro de pedidos ajenos

Ejecutada después de comparar capturas de la app contra `docs/diseno/waiter-pantallas.dc.html`.
Registro en commits, no en pasos: `debd2b7` (uuid sin `crypto.randomUUID`: la pantalla de pedido
crasheaba en `http://192.168.56.10`, contexto no seguro; el E2E corría en localhost y no lo vio),
`6ef4d89` (nombre del restaurante, tarjeta de turno, usuario, sillas, cronómetro y barra 12/18,
mesero en la cuenta, favorito, agotado solo para almacenables, "Abrir pedido" en mesa libre) y
`0f68d14` (líneas del servidor y cobro por id para pedidos hechos en otro dispositivo o por el
comensal; Subtotal / IVA / Total con propina sugerida no sumada; celda sin recorte). El E2E corre
ahora sobre `PLAYWRIGHT_BASE_URL=http://192.168.56.10:3000`, el origen real del restaurante.
