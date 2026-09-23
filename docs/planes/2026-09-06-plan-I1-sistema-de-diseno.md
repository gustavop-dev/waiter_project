# Plan I.1 · Sistema de diseño del kit CloudPos y armazón del POS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el POS adopta los tokens, la tipografía, los iconos y los componentes base del kit CloudPos, con modo claro y oscuro, barra superior por rol, modal de ajustes con tema y cierre de sesión, y sistema de toasts, sin romper ninguna pantalla actual.

**Architecture:** los tokens viven en variables CSS (`--kit-*`) con dos temas y se exponen a Tailwind con `@theme inline` reutilizando los nombres que ya usan las pantallas (`brand-500`, `ink`, `canvas`, `surface`, `border`, `soft`, `muted`), de modo que la interfaz existente cambia de piel en un solo paso. Los componentes del kit viven en `pos/components/kit/` y no dependen de ningún módulo. El `Shell` actual pasa a delegar en `KitShell` (barra superior) para que las rutas existentes sigan funcionando.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 (`@theme inline`, `@custom-variant`), Zustand 5, next-intl 4, `@tabler/icons-react`, `@fontsource/open-sans`, Jest 30 + Testing Library, Playwright 1.62.

**Spec:** [Plan I](2026-09-06-plan-I-rediseno-pos-kit.md) y [Inventario del kit](../diseno/2026-09-06-inventario-kit-cloudpos.md). Pantallas de referencia: `docs/diseno/pos-kit/pantallas/Visual Design Light/3 – Dashboard/Filled.png` (barra superior), `10 – Account Setting/*.png` (modal Setting), `4 – Order/Ipad View.png` (chips, tarjetas, toast), `1 – Authentication/Select Employee.png` (teclado y PIN).

## Global Constraints

- Tokens medidos en el `.fig` (Plan I, "Restricciones globales"): primario `#447DFC`, tinta `#0F172A`, suave `#475569`, terciario `#94A3B8`, lienzo `#F8FAFC`, atenuado `#F1F5F9`, borde `#E2E8F0`, superficie `#FFFFFF`, velo `#131316`, en progreso `#F59E0B` / `#FFFBEB`, error `#EF4444` / `#FEF3F2`, info `#6172F3` / `#EEF4FF`, éxito `#22C55E` / `#F0FDF4`. Oscuro: fondo `#131316`, superficie `#1A1A1E`, elevado `#26272B`, borde `#51525C`, borde suave `#3F3F46`, texto `#F7F7F7`, suave `#A0A0AB`, apagado `#70707B`.
- Tipografía Open Sans 400 / 500 / 600 autoalojada vía `@fontsource/open-sans`. Sin Google Fonts en runtime.
- Iconos: solo `@tabler/icons-react`, siempre a través de `components/kit/Icon.tsx`.
- Radios: 8 · 12 · 16 · 24. Alturas táctiles del sistema Waiter se conservan (`h-tap` 56, `h-tap-min` 48, `h-tap-money` 64).
- Textos nuevos en `pos/lib/i18n/messages/es.json` bajo `pos.kit`. Nada en inglés en la interfaz.
- Cada tarea termina con `npm test -- --runInBand` verde en `pos/` y un commit.
- No se tocan `experience/`, `diner/` ni los addons en esta oleada.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `pos/lib/design/tokens.ts` | Fuente única de la paleta (claro y oscuro) y modos de tema; la usan CSS, pruebas y futuras gráficas |
| `pos/app/globals.css` | Variables `--kit-*` por tema, `@theme inline`, variante `dark`, fuentes |
| `pos/lib/hooks/useTheme.ts` | Modo de tema persistido (`waiter.theme`), aplicación en `<html data-theme>` |
| `pos/components/kit/Icon.tsx` | Mapa de nombres del kit → iconos Tabler |
| `pos/components/kit/Chip.tsx`, `StatusPill.tsx`, `Toggle.tsx`, `Card.tsx`, `KitEmptyState.tsx` | Átomos del kit |
| `pos/components/kit/NumericKeypad.tsx`, `PinInput.tsx` | Teclado y casillas de PIN del login y del cambio de PIN |
| `pos/components/kit/Modal.tsx`, `WizardSteps.tsx` | Modales del kit (centrado, ancho, pantalla completa) y cabecera de pasos |
| `pos/lib/stores/toastStore.ts`, `pos/components/kit/Toaster.tsx` | Toasts oscuros del kit |
| `pos/lib/domain/navigation.ts` | Pestañas por rol y ruta activa |
| `pos/components/kit/TopBar.tsx`, `KitShell.tsx` | Barra superior y armazón |
| `pos/components/kit/SettingsModal.tsx` | Modal "Setting": perfil, pantalla (tema, idioma), salir |
| `pos/components/layout/Shell.tsx` | Pasa a delegar en `KitShell` |
| `pos/app/(pos)/{dashboard,pedidos,reservas,historial}/page.tsx` | Rutas nuevas con estado vacío honesto hasta su oleada |
| `pos/app/(pos)/kit/page.tsx` | Galería de componentes (solo admin) para cotejar con los PNG |
| `pos/scripts/kit-compare.cjs`, `pos/playwright.config.ts` | Capturas a 1194×834 (`iPad Pro 11 landscape`) |
| `pos/e2e/armazon.spec.ts` | Recorrido: login → barra → tema oscuro → salir |

---

### Task 1: Tokens del kit, Open Sans y modo oscuro

**Files:**
- Create: `pos/lib/design/tokens.ts`
- Modify: `pos/app/globals.css` (bloque `@theme` completo y `@font-face` de Ubuntu)
- Modify: `pos/package.json` (dependencia `@fontsource/open-sans`)
- Test: `pos/lib/design/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: `KIT_LIGHT`, `KIT_DARK` (`Record<KitToken, string>`), `KitToken`, `THEME_MODES`, `ThemeMode` desde `@/lib/design/tokens`.
- Consumes: `contrast(a, b)` de `@/lib/domain/brand` (existe: devuelve la relación de contraste WCAG).

- [ ] **Step 1: Instalar Open Sans**

```bash
cd pos && npm install @fontsource/open-sans@5.3.0
```

- [ ] **Step 2: Escribir la prueba de tokens**

`pos/lib/design/__tests__/tokens.test.ts`:

```ts
import { KIT_DARK, KIT_LIGHT, THEME_MODES } from '@/lib/design/tokens'
import { contrast } from '@/lib/domain/brand'

// Falla si el primario deja de ser el azul medido en el kit o si el texto blanco sobre él no cumple AA.
it('primary is the kit blue and white text on it reaches 4.5:1', () => {
  expect(KIT_LIGHT.primary).toBe('#447DFC')
  expect(contrast(KIT_LIGHT.primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
})

// Falla si algún token del tema oscuro se queda sin valor o hereda del claro por descuido.
it('dark theme defines every token with a distinct background', () => {
  expect(Object.keys(KIT_DARK).sort()).toEqual(Object.keys(KIT_LIGHT).sort())
  expect(KIT_DARK.canvas).toBe('#131316')
  expect(contrast(KIT_DARK.canvas, KIT_DARK.ink)).toBeGreaterThanOrEqual(4.5)
})

it('exposes the three theme modes of the kit', () => {
  expect(THEME_MODES).toEqual(['system', 'light', 'dark'])
})
```

- [ ] **Step 3: Ejecutar y ver fallar**

Run: `cd pos && npx jest lib/design -v`
Expected: FAIL, `Cannot find module '@/lib/design/tokens'`.

- [ ] **Step 4: Escribir `tokens.ts`**

```ts
// Paleta medida en el .fig del kit CloudPos (Plan I). Única fuente: CSS la lee vía globals.css, las pruebas y las gráficas vía este módulo.
export const KIT_LIGHT = {
  primary: '#447DFC', primarySoft: '#EEF4FF', primaryInk: '#FFFFFF',
  canvas: '#F8FAFC', surface: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0',
  ink: '#0F172A', soft: '#475569', dim: '#94A3B8', overlay: '#131316',
  progress: '#F59E0B', progressSoft: '#FFFBEB', progressInk: '#B45309',
  success: '#22C55E', successSoft: '#F0FDF4', successInk: '#15803D',
  danger: '#EF4444', dangerSoft: '#FEF3F2', dangerInk: '#B91C1C',
  info: '#6172F3', infoSoft: '#EEF4FF', infoInk: '#3538CD',
  reserved: '#0F172A', reservedInk: '#FFFFFF',
} as const
export type KitToken = keyof typeof KIT_LIGHT

export const KIT_DARK: Record<KitToken, string> = {
  primary: '#447DFC', primarySoft: '#1E2A44', primaryInk: '#FFFFFF',
  canvas: '#131316', surface: '#1A1A1E', muted: '#26272B', border: '#51525C',
  ink: '#F7F7F7', soft: '#A0A0AB', dim: '#70707B', overlay: '#000000',
  progress: '#F59E0B', progressSoft: '#78350F', progressInk: '#FDE68A',
  success: '#22C55E', successSoft: '#14532D', successInk: '#BBF7D0',
  danger: '#EF4444', dangerSoft: '#7F1D1D', dangerInk: '#FECACA',
  info: '#6172F3', infoSoft: '#1E2A44', infoInk: '#C7D2FE',
  reserved: '#F7F7F7', reservedInk: '#131316',
}

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

// Convierte camelCase a kebab-case para el nombre de la variable CSS (--kit-primary-soft).
export const cssVar = (token: KitToken): string => `--kit-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
```

- [ ] **Step 5: Reescribir el bloque de tema en `globals.css`**

Sustituir desde la primera línea hasta el cierre de `@theme { … }` por:

```css
@import 'tailwindcss';
@import '@fontsource/open-sans/400.css';
@import '@fontsource/open-sans/500.css';
@import '@fontsource/open-sans/600.css';

@font-face { font-family: 'IBM Plex Mono'; font-weight: 400; font-display: swap;
  src: url('/fonts/ibm-plex-mono-400-normal-latin.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; font-weight: 500; font-display: swap;
  src: url('/fonts/ibm-plex-mono-500-normal-latin.woff2') format('woff2'); }

/* Tema oscuro por atributo en <html>: lo fija useTheme según la preferencia del usuario. */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* Paleta del kit CloudPos. Mismos valores que lib/design/tokens.ts: si cambias uno, cambia el otro. */
:root {
  --kit-primary: #447DFC; --kit-primary-soft: #EEF4FF; --kit-primary-ink: #FFFFFF;
  --kit-canvas: #F8FAFC; --kit-surface: #FFFFFF; --kit-muted: #F1F5F9; --kit-border: #E2E8F0;
  --kit-ink: #0F172A; --kit-soft: #475569; --kit-dim: #94A3B8; --kit-overlay: #131316;
  --kit-progress: #F59E0B; --kit-progress-soft: #FFFBEB; --kit-progress-ink: #B45309;
  --kit-success: #22C55E; --kit-success-soft: #F0FDF4; --kit-success-ink: #15803D;
  --kit-danger: #EF4444; --kit-danger-soft: #FEF3F2; --kit-danger-ink: #B91C1C;
  --kit-info: #6172F3; --kit-info-soft: #EEF4FF; --kit-info-ink: #3538CD;
  --kit-reserved: #0F172A; --kit-reserved-ink: #FFFFFF;
  color-scheme: light;
}
[data-theme=dark] {
  --kit-primary-soft: #1E2A44;
  --kit-canvas: #131316; --kit-surface: #1A1A1E; --kit-muted: #26272B; --kit-border: #51525C;
  --kit-ink: #F7F7F7; --kit-soft: #A0A0AB; --kit-dim: #70707B; --kit-overlay: #000000;
  --kit-progress-soft: #78350F; --kit-progress-ink: #FDE68A;
  --kit-success-soft: #14532D; --kit-success-ink: #BBF7D0;
  --kit-danger-soft: #7F1D1D; --kit-danger-ink: #FECACA;
  --kit-info-soft: #1E2A44; --kit-info-ink: #C7D2FE;
  --kit-reserved: #F7F7F7; --kit-reserved-ink: #131316;
  color-scheme: dark;
}

@theme inline {
  /* Nombres que ya usan las pantallas: cambian de valor, no de nombre. */
  --color-brand-50: var(--kit-primary-soft); --color-brand-100: var(--kit-primary-soft); --color-brand-300: #93B4FD;
  --color-brand-500: var(--kit-primary); --color-brand-600: #2F66E6; --color-brand-700: #1F4FC2;
  --color-surface: var(--kit-surface); --color-canvas: var(--kit-canvas); --color-muted: var(--kit-muted);
  --color-border: var(--kit-border); --color-ink: var(--kit-ink); --color-soft: var(--kit-soft); --color-ink-3: var(--kit-dim);
  --color-free: var(--kit-success); --color-free-soft: var(--kit-success-soft); --color-free-ink: var(--kit-success-ink);
  --color-busy: var(--kit-danger); --color-busy-soft: var(--kit-danger-soft); --color-busy-ink: var(--kit-danger-ink);
  --color-kitchen: var(--kit-info); --color-kitchen-soft: var(--kit-info-soft); --color-kitchen-ink: var(--kit-info-ink);
  --color-pending: var(--kit-progress); --color-pending-soft: var(--kit-progress-soft); --color-pending-ink: var(--kit-progress-ink);
  --color-assist: var(--kit-soft); --color-assist-soft: var(--kit-muted);
  --color-kds-bg: #131316; --color-kds-surface: #1A1A1E; --color-kds-raised: #26272B; --color-kds-ink: #F7F7F7;
  --color-sidebar: #131316; --color-sidebar-raised: #1A1A1E; --color-sidebar-hover: #26272B;
  --color-sidebar-ink: #F7F7F7; --color-sidebar-soft: #A0A0AB; --color-sidebar-dim: #70707B;
  /* Nombres nuevos del kit. */
  --color-primary: var(--kit-primary); --color-primary-soft: var(--kit-primary-soft); --color-primary-ink: var(--kit-primary-ink);
  --color-dim: var(--kit-dim); --color-overlay: var(--kit-overlay);
  --color-progress: var(--kit-progress); --color-progress-soft: var(--kit-progress-soft); --color-progress-ink: var(--kit-progress-ink);
  --color-success: var(--kit-success); --color-success-soft: var(--kit-success-soft); --color-success-ink: var(--kit-success-ink);
  --color-danger: var(--kit-danger); --color-danger-soft: var(--kit-danger-soft); --color-danger-ink: var(--kit-danger-ink);
  --color-info: var(--kit-info); --color-info-soft: var(--kit-info-soft); --color-info-ink: var(--kit-info-ink);
  --color-reserved: var(--kit-reserved); --color-reserved-ink: var(--kit-reserved-ink);
  --font-ui: 'Open Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --tracking-wordmark: -0.035em; --tracking-monogram: -0.05em; --tracking-title: -0.02em;
  --spacing-tap-min: 48px; --spacing-tap: 56px; --spacing-tap-money: 64px;
  --spacing-topbar: 92px; --spacing-sidebar: 248px; --spacing-rail: 88px; --spacing-panel: 372px; --spacing-panel-lg: 400px;
  --spacing-table-cell: 138px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px;
}
```

Dejar intactos `body { … }`, `.tabular` y el bloque `@media print`. Borrar los `@font-face` de Ubuntu y los archivos `public/fonts/ubuntu-*.woff2`.

- [ ] **Step 6: Ejecutar pruebas, typecheck y arranque**

Run: `cd pos && npx jest lib/design -v && npm run typecheck && npm run build 2>&1 | tail -5`
Expected: pruebas PASS; build sin errores de CSS (Tailwind acepta `@theme inline` y `@custom-variant`).

- [ ] **Step 7: Commit**

```bash
git add pos/lib/design pos/app/globals.css pos/package.json pos/package-lock.json
git rm -q pos/public/fonts/ubuntu-*.woff2
git commit -m "feat(pos): kit CloudPos tokens with light and dark themes, Open Sans"
```

---

### Task 2: Iconos Tabler a través de `Icon`

**Files:**
- Create: `pos/components/kit/Icon.tsx`
- Modify: `pos/package.json` (dependencia `@tabler/icons-react`)
- Test: `pos/components/kit/__tests__/Icon.test.tsx`

**Interfaces:**
- Produces: `Icon({ name, size?, className?, label? })` y `type KitIcon`. Los nombres son los del kit, no los de Tabler, para que el resto del código no dependa de la librería.

- [ ] **Step 1: Instalar**

```bash
cd pos && npm install @tabler/icons-react@3.46.0
```

- [ ] **Step 2: Prueba**

`pos/components/kit/__tests__/Icon.test.tsx`:

```tsx
import { render } from '@testing-library/react'

import { Icon, KIT_ICON_NAMES } from '@/components/kit/Icon'

// Falla si un icono del kit deja de resolver a un SVG de Tabler o pierde el tamaño por defecto (20).
it('renders a decorative svg at 20px by default', () => {
  const { container } = render(<Icon name="bell" />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('width', '20')
})

// Falla si un icono con etiqueta deja de ser accesible.
it('exposes a label as an accessible image when given', () => {
  const { getByRole } = render(<Icon name="search" label="Buscar" />)
  expect(getByRole('img', { name: 'Buscar' })).toBeInTheDocument()
})

it('every kit icon name resolves', () => {
  for (const name of KIT_ICON_NAMES) expect(render(<Icon name={name} />).container.querySelector('svg')).not.toBeNull()
})
```

- [ ] **Step 3: Ejecutar y ver fallar**

Run: `cd pos && npx jest components/kit -v`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 4: Implementar `Icon.tsx`**

```tsx
import {
  IconAdjustments, IconAddressBook, IconAlarm, IconArrowLeft, IconArrowRight, IconArrowsMove, IconBabyCarriage, IconBackspace,
  IconBell, IconBox, IconBuildingStore, IconCalendarEvent, IconCash, IconCashRegister, IconChartBar, IconCheck, IconChefHat,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconClock, IconCreditCard, IconDeviceDesktop, IconDotsVertical,
  IconFileInvoice, IconFileText, IconFingerprint, IconHistory, IconLanguage, IconLayoutDashboard, IconLock, IconLogout,
  IconMail, IconMinus, IconPackage, IconPencil, IconPhoto, IconPlus, IconPrinter, IconQrcode, IconReceipt, IconRotate,
  IconSearch, IconSettings, IconShoppingCart, IconToolsKitchen2, IconTrash, IconTruckDelivery, IconUser, IconUsers, IconX,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

// Nombres del kit → Tabler Icons (el kit los declara en su página "Icons"). Solo se añaden aquí.
const ICONS = {
  dashboard: IconLayoutDashboard, orders: IconFileText, tables: IconDeviceDesktop, reservations: IconCalendarEvent,
  history: IconHistory, inventory: IconBox, cash: IconCashRegister, kitchen: IconToolsKitchen2, admin: IconAdjustments,
  sales: IconChartBar, catalog: IconPackage, customers: IconAddressBook, billing: IconFileInvoice, settings: IconSettings,
  bell: IconBell, search: IconSearch, plus: IconPlus, minus: IconMinus, close: IconX, check: IconCheck,
  chevronDown: IconChevronDown, chevronLeft: IconChevronLeft, chevronRight: IconChevronRight,
  arrowLeft: IconArrowLeft, arrowRight: IconArrowRight, more: IconDotsVertical,
  trash: IconTrash, edit: IconPencil, backspace: IconBackspace, user: IconUser, users: IconUsers, clock: IconClock, alarm: IconAlarm,
  printer: IconPrinter, money: IconCash, card: IconCreditCard, qr: IconQrcode, receipt: IconReceipt, cart: IconShoppingCart,
  logout: IconLogout, lock: IconLock, photo: IconPhoto, chef: IconChefHat, move: IconArrowsMove, rotate: IconRotate,
  mail: IconMail, fingerprint: IconFingerprint, language: IconLanguage, babyChair: IconBabyCarriage, delivery: IconTruckDelivery,
  store: IconBuildingStore,
} satisfies Record<string, ComponentType<IconProps>>

export type KitIcon = keyof typeof ICONS
export const KIT_ICON_NAMES = Object.keys(ICONS) as KitIcon[]

export function Icon({ name, size = 20, className, label }: { name: KitIcon; size?: number; className?: string; label?: string }) {
  const Cmp = ICONS[name]
  return label
    ? <Cmp size={size} stroke={1.75} className={className} role="img" aria-label={label} />
    : <Cmp size={size} stroke={1.75} className={className} aria-hidden="true" />
}
```

- [ ] **Step 5: Ejecutar**

Run: `cd pos && npx jest components/kit -v`
Expected: PASS (3 pruebas).

- [ ] **Step 6: Commit**

```bash
git add pos/components/kit/Icon.tsx pos/components/kit/__tests__/Icon.test.tsx pos/package.json pos/package-lock.json
git commit -m "feat(pos): kit icons through Tabler with a single Icon component"
```

---

### Task 3: Átomos del kit: Chip, StatusPill, Toggle, Card, KitEmptyState

**Files:**
- Create: `pos/components/kit/Chip.tsx`, `StatusPill.tsx`, `Toggle.tsx`, `Card.tsx`, `KitEmptyState.tsx`
- Test: `pos/components/kit/__tests__/atoms.test.tsx`

**Interfaces:**
- `Chip({ label, count?, active?, onClick?, icon? })`: botón con `aria-pressed`; activo = fondo `primary-soft`, texto `primary`, conteo en badge `primary`.
- `StatusPill({ tone, icon?, children })` con `tone: 'progress' | 'success' | 'info' | 'danger' | 'reserved' | 'neutral'`.
- `Toggle({ checked, onChange, label })`: `role="switch"`.
- `Card({ title?, action?, className?, children })`: superficie blanca, borde, radio 16.
- `KitEmptyState({ icon, title, body? })`.

- [ ] **Step 1: Prueba**

`pos/components/kit/__tests__/atoms.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Card } from '@/components/kit/Card'
import { Chip } from '@/components/kit/Chip'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { StatusPill } from '@/components/kit/StatusPill'
import { Toggle } from '@/components/kit/Toggle'

// Falla si el chip activo pierde el fondo suave del primario o el conteo deja de verse.
it('chip shows its count and marks the active state', async () => {
  const onClick = jest.fn()
  render(<Chip label="En progreso" count={20} active onClick={onClick} />)
  const chip = screen.getByRole('button', { name: /En progreso 20/ })
  expect(chip).toHaveAttribute('aria-pressed', 'true')
  expect(chip).toHaveClass('bg-primary-soft')
  await userEvent.click(chip)
  expect(onClick).toHaveBeenCalled()
})

// Falla si un tono de estado deja de mapear al color del kit (naranja en progreso, verde servido).
it('status pill maps tones to kit colors', () => {
  render(<><StatusPill tone="progress">En progreso</StatusPill><StatusPill tone="success">Servido</StatusPill></>)
  expect(screen.getByText('En progreso')).toHaveClass('bg-progress-soft', 'text-progress-ink')
  expect(screen.getByText('Servido')).toHaveClass('bg-success-soft', 'text-success-ink')
})

it('toggle is a switch that reports the new value', async () => {
  const onChange = jest.fn()
  render(<Toggle checked={false} onChange={onChange} label="Sonido" />)
  await userEvent.click(screen.getByRole('switch', { name: 'Sonido' }))
  expect(onChange).toHaveBeenCalledWith(true)
})

it('card renders title, action and body; empty state renders icon and copy', () => {
  render(<Card title="Mesas disponibles" action={<button>Ver</button>}>cuerpo</Card>)
  expect(screen.getByText('Mesas disponibles')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument()
  render(<KitEmptyState icon="cart" title="Sin pedidos" body="Aquí aparecerá el último pedido." />)
  expect(screen.getByText('Sin pedidos')).toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `cd pos && npx jest components/kit/__tests__/atoms -v`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: Implementar los cinco componentes**

`Chip.tsx`:

```tsx
'use client'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

// Chip de filtro del kit: píldora con borde, conteo en badge; activo en azul suave (Order / Ipad View.png).
export function Chip({ label, count, active = false, onClick, icon }: { label: string; count?: number; active?: boolean; onClick?: () => void; icon?: KitIcon }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('inline-flex items-center gap-2 h-11 px-4 rounded-md border text-[15px] font-semibold whitespace-nowrap',
        active ? 'bg-primary-soft border-primary/40 text-primary' : 'bg-surface border-border text-soft hover:bg-muted')}>
      {icon && <Icon name={icon} size={18} />}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn('min-w-6 h-6 px-1.5 rounded-md grid place-items-center text-[13px] font-semibold', active ? 'bg-primary text-primary-ink' : 'bg-muted text-soft')}>{count}</span>
      )}
    </button>
  )
}
```

`StatusPill.tsx`:

```tsx
import type { ReactNode } from 'react'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

export type PillTone = 'progress' | 'success' | 'info' | 'danger' | 'reserved' | 'neutral'
const TONE: Record<PillTone, string> = {
  progress: 'bg-progress-soft text-progress-ink', success: 'bg-success-soft text-success-ink', info: 'bg-info-soft text-info-ink',
  danger: 'bg-danger-soft text-danger-ink', reserved: 'bg-reserved text-reserved-ink', neutral: 'bg-muted text-soft',
}

export function StatusPill({ tone, icon, children, className }: { tone: PillTone; icon?: KitIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-sm text-[14px] font-semibold', TONE[tone], className)}>
      {icon && <Icon name={icon} size={16} />}{children}
    </span>
  )
}
```

`Toggle.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative w-12 h-7 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')}>
      <span className={cn('absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}
```

`Card.tsx`:

```tsx
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Tarjeta del kit: superficie, borde suave, radio 16, cabecera opcional con acción a la derecha.
export function Card({ title, action, className, children }: { title?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn('bg-surface border border-border rounded-lg flex flex-col', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between px-5 h-16 border-b border-border">
          {title && <h2 className="text-[18px] font-semibold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}
```

`KitEmptyState.tsx`:

```tsx
import { Icon, type KitIcon } from '@/components/kit/Icon'

// Estado vacío del kit (Dashboard / Empty.png): icono en círculo, título y frase.
export function KitEmptyState({ icon, title, body }: { icon: KitIcon; title: string; body?: string }) {
  return (
    <div className="flex-1 grid place-items-center p-8 text-center">
      <div className="flex flex-col items-center gap-2 max-w-xs">
        <span className="w-14 h-14 rounded-full border border-border grid place-items-center text-soft"><Icon name={icon} size={26} /></span>
        <span className="text-[18px] font-semibold text-ink">{title}</span>
        {body && <p className="text-[14px] text-soft">{body}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar**

Run: `cd pos && npx jest components/kit -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/components/kit
git commit -m "feat(pos): kit atoms — chip, status pill, toggle, card, empty state"
```

---

### Task 4: Teclado numérico y casillas de PIN

**Files:**
- Create: `pos/components/kit/NumericKeypad.tsx`, `pos/components/kit/PinInput.tsx`
- Test: `pos/components/kit/__tests__/keypad.test.tsx`

**Interfaces:**
- `NumericKeypad({ onDigit(d: string), onBackspace(), disabled? })`: botones 1-9, 0 y borrar con `aria-label` "Borrar".
- `PinInput({ value, length = 6, label })`: seis casillas visuales y un `input` oculto `type="password"` con `aria-label` para lectores y para E2E.

- [ ] **Step 1: Prueba**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NumericKeypad } from '@/components/kit/NumericKeypad'
import { PinInput } from '@/components/kit/PinInput'

// Falla si el teclado deja de emitir dígitos o si borrar deja de existir.
it('keypad emits digits and backspace', async () => {
  const onDigit = jest.fn(); const onBackspace = jest.fn()
  render(<NumericKeypad onDigit={onDigit} onBackspace={onBackspace} />)
  await userEvent.click(screen.getByRole('button', { name: '7' }))
  await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
  expect(onDigit).toHaveBeenCalledWith('7')
  expect(onBackspace).toHaveBeenCalled()
})

// Falla si el PIN muestra los dígitos en claro o si pierde una de las seis casillas.
it('pin input renders six masked boxes and exposes the value to assistive tech', () => {
  render(<PinInput value="123" label="PIN" />)
  expect(screen.getAllByTestId('pin-box')).toHaveLength(6)
  expect(screen.getAllByTestId('pin-box').filter((b) => b.dataset.filled === 'true')).toHaveLength(3)
  expect(screen.getByLabelText('PIN')).toHaveValue('123')
  expect(screen.queryByText('1')).toBeNull()
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `cd pos && npx jest components/kit/__tests__/keypad -v` → FAIL.

- [ ] **Step 3: Implementar**

`NumericKeypad.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const KEY = 'h-16 rounded-md text-[30px] font-medium text-ink hover:bg-muted active:bg-border disabled:opacity-40'

// Teclado del kit (Select Employee.png): 3×3, 0 al centro y borrar a la derecha.
export function NumericKeypad({ onDigit, onBackspace, disabled = false }: { onDigit: (d: string) => void; onBackspace: () => void; disabled?: boolean }) {
  const t = useTranslations('pos.kit.keypad')
  return (
    <div className="grid grid-cols-3 gap-2 w-[300px]">
      {KEYS.map((k) => <button key={k} type="button" disabled={disabled} onClick={() => onDigit(k)} className={KEY}>{k}</button>)}
      <span />
      <button type="button" disabled={disabled} onClick={() => onDigit('0')} className={KEY}>0</button>
      <button type="button" disabled={disabled} onClick={onBackspace} aria-label={t('backspace')} className={cn(KEY, 'grid place-items-center')}><Icon name="backspace" size={28} /></button>
    </div>
  )
}
```

`PinInput.tsx`:

```tsx
import { cn } from '@/lib/utils'

// Seis casillas del kit; el valor real va en un input oculto para lectores de pantalla y E2E.
export function PinInput({ value, length = 6, label }: { value: string; length?: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <input type="password" readOnly value={value} aria-label={label} className="sr-only" />
      <div className="flex gap-3" aria-hidden="true">
        {Array.from({ length }, (_, i) => (
          <span key={i} data-testid="pin-box" data-filled={i < value.length ? 'true' : 'false'}
            className={cn('w-12 h-12 rounded-md border grid place-items-center', i < value.length ? 'border-primary' : 'border-border')}>
            {i < value.length && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
          </span>
        ))}
      </div>
    </div>
  )
}
```

Añadir en `es.json` dentro de `pos`: `"kit": { "keypad": { "backspace": "Borrar" } }` (el bloque `kit` crece en tareas siguientes).

Envolver la prueba del teclado con `NextIntlClientProvider` como hace `Sidebar.test.tsx`.

- [ ] **Step 4: Ejecutar** → PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/components/kit/NumericKeypad.tsx pos/components/kit/PinInput.tsx pos/components/kit/__tests__/keypad.test.tsx pos/lib/i18n/messages/es.json
git commit -m "feat(pos): kit numeric keypad and PIN boxes"
```

---

### Task 5: Modal y cabecera de pasos del wizard

**Files:**
- Create: `pos/components/kit/Modal.tsx`, `pos/components/kit/WizardSteps.tsx`
- Test: `pos/components/kit/__tests__/modal.test.tsx`

**Interfaces:**
- `Modal({ open, onClose, title?, size = 'center', children, footer? })` con `size: 'center' | 'wide' | 'full'`; `role="dialog"`, `aria-modal`, cierra con Escape y con el botón ✕ (aria-label "Cerrar"); velo `bg-overlay/60`.
- `WizardSteps({ steps: string[], current: number })`: pasos anteriores con check, actual en azul, siguientes en gris (Reservation / Add New).

- [ ] **Step 1: Prueba**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { Modal } from '@/components/kit/Modal'
import { WizardSteps } from '@/components/kit/WizardSteps'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si el modal deja de cerrarse con Escape o con su botón, o si deja de anunciarse como diálogo.
it('modal is a dialog that closes with Escape and with its close button', async () => {
  const onClose = jest.fn()
  wrap(<Modal open onClose={onClose} title="Detalle del pedido">cuerpo</Modal>)
  expect(screen.getByRole('dialog', { name: 'Detalle del pedido' })).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('modal renders nothing when closed', () => {
  wrap(<Modal open={false} onClose={() => undefined}>cuerpo</Modal>)
  expect(screen.queryByRole('dialog')).toBeNull()
})

// Falla si el paso actual deja de marcarse o los pasos hechos pierden el check.
it('wizard marks done, current and pending steps', () => {
  wrap(<WizardSteps steps={['Datos', 'Mesa', 'Menú']} current={1} />)
  expect(screen.getByText('Datos').closest('li')).toHaveAttribute('data-state', 'done')
  expect(screen.getByText('Mesa').closest('li')).toHaveAttribute('aria-current', 'step')
  expect(screen.getByText('Menú').closest('li')).toHaveAttribute('data-state', 'pending')
})
```

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar**

`Modal.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useEffect, type ReactNode } from 'react'

import { Icon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

const SIZE = { center: 'w-[480px] max-h-[80vh]', wide: 'w-[1046px] h-[640px]', full: 'w-[1174px] h-[754px]' }

// Modales del kit: centrado (confirmaciones), ancho (Setting, Table Detail) y pantalla casi completa (wizards).
export function Modal({ open, onClose, title, size = 'center', children, footer }: { open: boolean; onClose: () => void; title?: string; size?: keyof typeof SIZE; children: ReactNode; footer?: ReactNode }) {
  const t = useTranslations('pos.ui')
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cn('bg-surface rounded-xl shadow-xl flex flex-col overflow-hidden', SIZE[size])}>
        {(title || size !== 'center') && (
          <header className="flex items-center justify-between px-6 h-[72px] border-b border-border shrink-0">
            <span className="text-[20px] font-semibold text-ink">{title}</span>
            <button type="button" onClick={onClose} aria-label={t('close')} className="w-10 h-10 rounded-full bg-ink text-surface grid place-items-center"><Icon name="close" size={20} /></button>
          </header>
        )}
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
        {footer && <footer className="px-6 py-4 border-t border-border shrink-0">{footer}</footer>}
      </div>
    </div>
  )
}
```

`WizardSteps.tsx`:

```tsx
import { Icon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

export function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'pending'
        return (
          <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}
            className={cn('flex items-center gap-2 h-10 px-3 rounded-md text-[15px] font-semibold', state === 'current' ? 'bg-primary text-primary-ink' : state === 'done' ? 'text-primary' : 'text-dim')}>
            <span className={cn('w-6 h-6 rounded-full grid place-items-center text-[13px]', state === 'current' ? 'bg-surface/20' : state === 'done' ? 'bg-primary-soft' : 'bg-muted')}>
              {state === 'done' ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span>{label}</span>
            {i < steps.length - 1 && <Icon name="chevronRight" size={16} className="text-dim" />}
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 4: Ejecutar** → PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/components/kit/Modal.tsx pos/components/kit/WizardSteps.tsx pos/components/kit/__tests__/modal.test.tsx
git commit -m "feat(pos): kit modal sizes and wizard steps header"
```

---

### Task 6: Toasts del kit

**Files:**
- Create: `pos/lib/stores/toastStore.ts`, `pos/components/kit/Toaster.tsx`
- Modify: `pos/app/providers.tsx` (montar `<Toaster />`)
- Test: `pos/lib/stores/__tests__/toastStore.test.ts`, `pos/components/kit/__tests__/Toaster.test.tsx`

**Interfaces:**
- `toast({ title, body?, tone? })` con `tone: 'success' | 'danger' | 'info'` (por defecto `success`); `useToastStore` con `toasts: Toast[]`, `push`, `dismiss(id)`. Auto-cierre a los 5 s.

- [ ] **Step 1: Pruebas**

`toastStore.test.ts`:

```ts
import { act } from '@testing-library/react'

import { toast, useToastStore } from '@/lib/stores/toastStore'

beforeEach(() => { jest.useFakeTimers(); useToastStore.setState({ toasts: [] }) })
afterEach(() => jest.useRealTimers())

// Falla si un toast no desaparece solo a los 5 s o si se pierde el orden de llegada.
it('pushes toasts and removes them after five seconds', () => {
  act(() => { toast({ title: 'Pedido #DI001 enviado' }); toast({ title: 'Otro', tone: 'danger' }) })
  expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual(['Pedido #DI001 enviado', 'Otro'])
  act(() => { jest.advanceTimersByTime(5_000) })
  expect(useToastStore.getState().toasts).toHaveLength(0)
})
```

`Toaster.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { Toaster } from '@/components/kit/Toaster'
import messages from '@/lib/i18n/messages/es.json'
import { toast, useToastStore } from '@/lib/stores/toastStore'

beforeEach(() => useToastStore.setState({ toasts: [] }))

// Falla si el toast deja de anunciarse (status) o si su ✕ deja de cerrarlo.
it('renders toasts as status messages and dismisses on close', async () => {
  render(<NextIntlClientProvider locale="es" messages={messages}><Toaster /></NextIntlClientProvider>)
  act(() => { toast({ title: '¡Pedido #DI001 enviado!', body: 'Va camino a cocina.' }) })
  expect(screen.getByRole('status')).toHaveTextContent('¡Pedido #DI001 enviado!')
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(screen.queryByRole('status')).toBeNull()
})
```

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar**

`toastStore.ts`:

```ts
'use client'

import { create } from 'zustand'

export type ToastTone = 'success' | 'danger' | 'info'
export interface Toast { id: number; title: string; body?: string; tone: ToastTone }

const TTL_MS = 5_000
let seq = 0

interface ToastState { toasts: Toast[]; push: (t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void; dismiss: (id: number) => void }

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ title, body, tone = 'success' }) => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts, { id, title, body, tone }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TTL_MS)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (t: Parameters<ToastState['push']>[0]) => useToastStore.getState().push(t)
```

`Toaster.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { useToastStore, type ToastTone } from '@/lib/stores/toastStore'
import { cn } from '@/lib/utils'

const ICON: Record<ToastTone, { name: 'check' | 'close' | 'bell'; cls: string }> = {
  success: { name: 'check', cls: 'bg-success text-white' }, danger: { name: 'close', cls: 'bg-danger text-white' }, info: { name: 'bell', cls: 'bg-info text-white' },
}

// Toast del kit (Success Order.png): oscuro, abajo al centro, icono en círculo, título y frase, ✕.
export function Toaster() {
  const t = useTranslations('pos.ui')
  const { toasts, dismiss } = useToastStore()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-3 w-[480px]">
      {toasts.map((x) => (
        <div key={x.id} role="status" className="flex items-start gap-3 p-4 rounded-lg bg-[#131316] text-[#F7F7F7] shadow-xl">
          <span className={cn('w-9 h-9 rounded-full grid place-items-center shrink-0', ICON[x.tone].cls)}><Icon name={ICON[x.tone].name} size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold">{x.title}</p>
            {x.body && <p className="text-[13px] text-[#A0A0AB]">{x.body}</p>}
          </div>
          <button type="button" onClick={() => dismiss(x.id)} aria-label={t('close')} className="text-[#A0A0AB] hover:text-white"><Icon name="close" size={18} /></button>
        </div>
      ))}
    </div>
  )
}
```

En `providers.tsx`, dentro del provider: `{children}<Toaster />`.

- [ ] **Step 4: Ejecutar** → PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/lib/stores/toastStore.ts pos/components/kit/Toaster.tsx pos/app/providers.tsx pos/lib/stores/__tests__/toastStore.test.ts pos/components/kit/__tests__/Toaster.test.tsx
git commit -m "feat(pos): kit toasts with a store and a bottom-center toaster"
```

---

### Task 7: Tema persistido (`useTheme`)

**Files:**
- Create: `pos/lib/hooks/useTheme.ts`
- Test: `pos/lib/hooks/__tests__/useTheme.test.tsx`

**Interfaces:**
- `applyTheme(mode: ThemeMode)`: fija `document.documentElement.dataset.theme` a `'light'` o `'dark'` (resolviendo `system` con `matchMedia('(prefers-color-scheme: dark)')`) y guarda `waiter.theme`.
- `useTheme(): { mode: ThemeMode; setMode(m: ThemeMode): void }`; al montar lee `localStorage` y aplica.

- [ ] **Step 1: Prueba**

```tsx
import { act, renderHook } from '@testing-library/react'

import { applyTheme, useTheme } from '@/lib/hooks/useTheme'

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme })

// Falla si elegir Oscuro no marca <html data-theme="dark"> o no se recuerda entre cargas.
it('applies and persists the chosen mode', () => {
  const { result } = renderHook(() => useTheme())
  act(() => result.current.setMode('dark'))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('waiter.theme')).toBe('dark')
})

// Falla si "Sistema" deja de seguir a prefers-color-scheme (matchMedia está mockeado en claro en jest.setup).
it('system resolves through matchMedia', () => {
  applyTheme('system')
  expect(document.documentElement.dataset.theme).toBe('light')
})
```

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar**

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'

import { THEME_MODES, type ThemeMode } from '@/lib/design/tokens'

const KEY = 'waiter.theme'
const read = (): ThemeMode => { try { const v = localStorage.getItem(KEY); return (THEME_MODES as readonly string[]).includes(v ?? '') ? (v as ThemeMode) : 'system' } catch { return 'system' } }

export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  try { localStorage.setItem(KEY, mode) } catch { /* sin almacenamiento */ }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('system')
  useEffect(() => { const m = read(); setModeState(m); applyTheme(m) }, [])
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); applyTheme(m) }, [])
  return { mode, setMode }
}
```

- [ ] **Step 4: Ejecutar** → PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/lib/hooks/useTheme.ts pos/lib/hooks/__tests__/useTheme.test.tsx
git commit -m "feat(pos): persisted theme mode (system, light, dark)"
```

---

### Task 8: Navegación por rol y barra superior

**Files:**
- Create: `pos/lib/domain/navigation.ts`, `pos/components/kit/TopBar.tsx`
- Modify: `pos/lib/domain/roles.ts` (`allowedPath` conoce las rutas nuevas), `pos/lib/i18n/messages/es.json` (`pos.kit.nav`)
- Test: `pos/lib/domain/__tests__/navigation.test.ts`, `pos/components/kit/__tests__/TopBar.test.tsx`

**Interfaces:**
- `KitTab = 'dashboard' | 'orders' | 'tables' | 'reservations' | 'history' | 'inventory' | 'cash' | 'kitchen' | 'admin'`.
- `TAB_ROUTES: Record<KitTab, string>` = dashboard `/dashboard`, orders `/pedidos`, tables `/salon`, reservations `/reservas`, history `/historial`, inventory `/inventario`, cash `/ventas`, kitchen `/kds`, admin `/catalogo`.
- `ADMIN_SUBTABS`: `[['sales','/ventas'],['catalog','/catalogo'],['customers','/clientes'],['billing','/facturacion'],['roi','/automatizacion'],['settings','/configuracion']]`.
- `tabsFor(role: Role): KitTab[]`; `tabForPath(pathname): KitTab | null`.
- `TopBar({ active, role, userName, unread?, onOpenSettings })`.

- [ ] **Step 1: Pruebas**

`navigation.test.ts`:

```ts
import { ADMIN_SUBTABS, TAB_ROUTES, tabForPath, tabsFor } from '@/lib/domain/navigation'
import { allowedPath } from '@/lib/domain/roles'

// Falla si el mesero ve pestañas de caja o administración, o si el admin pierde alguna.
it('gives each role its tabs', () => {
  expect(tabsFor('waiter')).toEqual(['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory'])
  expect(tabsFor('cashier')).toEqual(['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory', 'cash', 'kitchen'])
  expect(tabsFor('admin')).toContain('admin')
})

// Falla si una ruta de administración deja de activar la pestaña Administración.
it('maps paths to tabs, including admin subtabs', () => {
  expect(tabForPath('/mesas/12')).toBe('tables')
  expect(tabForPath('/configuracion')).toBe('admin')
  expect(tabForPath('/pedidos')).toBe('orders')
  expect(ADMIN_SUBTABS.map(([, href]) => href)).toContain(TAB_ROUTES.admin)
})

// Falla si un mesero puede entrar a /ventas o si pierde /reservas.
it('allowedPath follows the tabs', () => {
  expect(allowedPath('waiter', '/reservas')).toBe(true)
  expect(allowedPath('waiter', '/ventas')).toBe(false)
  expect(allowedPath('admin', '/configuracion')).toBe(true)
})
```

`TopBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TopBar } from '@/components/kit/TopBar'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si la barra pierde una pestaña del kit, el punto de no leídas o el chip de usuario con rol.
it('renders kit tabs for the role, the bell with unread dot and the user chip', () => {
  wrap(<TopBar active="orders" role="waiter" userName="Ricardo Wilson" unread={2} onOpenSettings={() => undefined} />)
  expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Mesas' })).toHaveAttribute('href', '/salon')
  expect(screen.queryByRole('link', { name: 'Caja' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Ricardo Wilson/ })).toHaveTextContent('Mesero')
})

it('admin sees the administration row with its subtabs', () => {
  wrap(<TopBar active="admin" role="admin" userName="Ana" onOpenSettings={() => undefined} />)
  expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute('href', '/configuracion')
})
```

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar `navigation.ts`**

```ts
import type { Role } from '@/lib/domain/roles'

export const KIT_TABS = ['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory', 'cash', 'kitchen', 'admin'] as const
export type KitTab = (typeof KIT_TABS)[number]

export const TAB_ROUTES: Record<KitTab, string> = {
  dashboard: '/dashboard', orders: '/pedidos', tables: '/salon', reservations: '/reservas', history: '/historial',
  inventory: '/inventario', cash: '/ventas', kitchen: '/kds', admin: '/catalogo',
}
export const ADMIN_SUBTABS = [['sales', '/ventas'], ['catalog', '/catalogo'], ['customers', '/clientes'], ['billing', '/facturacion'], ['roi', '/automatizacion'], ['settings', '/configuracion']] as const
export type AdminSubtab = (typeof ADMIN_SUBTABS)[number][0]

const WAITER: KitTab[] = ['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory']
const BY_ROLE: Record<Role, KitTab[]> = { waiter: WAITER, cashier: [...WAITER, 'cash', 'kitchen'], admin: [...WAITER, 'cash', 'kitchen', 'admin'] }
export const tabsFor = (role: Role): KitTab[] => BY_ROLE[role]

const PATH_TAB: [RegExp, KitTab][] = [
  [/^\/dashboard/, 'dashboard'], [/^\/(pedidos|operacion)/, 'orders'], [/^\/(salon|mesas)/, 'tables'], [/^\/reservas/, 'reservations'],
  [/^\/historial/, 'history'], [/^\/inventario/, 'inventory'], [/^\/ventas/, 'cash'], [/^\/kds/, 'kitchen'],
  [/^\/(catalogo|clientes|facturacion|automatizacion|configuracion|kit)/, 'admin'],
]
export const tabForPath = (pathname: string): KitTab | null => PATH_TAB.find(([re]) => re.test(pathname))?.[1] ?? null
```

En `roles.ts`, reemplazar `allowedPath` para que use las pestañas (y dejar `navFor` para el sidebar antiguo hasta que se retire):

```ts
import { tabForPath, tabsFor } from '@/lib/domain/navigation'
export function allowedPath(role: Role, pathname: string): boolean {
  const tab = tabForPath(pathname)
  return tab ? tabsFor(role).includes(tab) : true
}
```

`/ventas` queda bajo la pestaña `cash` (cajero y admin); `/automatizacion` bajo `admin`. Eliminar `ROUTE_ITEM` y el import circular de `Sidebar` en `roles.ts` (mover el tipo `NavItem` a `Sidebar` sin importar `roles`, o tipar `NAV` con `string[]`).

- [ ] **Step 4: Implementar `TopBar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { initials } from '@/components/layout/Sidebar'
import { ADMIN_SUBTABS, TAB_ROUTES, tabsFor, type KitTab } from '@/lib/domain/navigation'
import type { Role } from '@/lib/domain/roles'
import { cn } from '@/lib/utils'

const ICON: Record<KitTab, KitIcon> = { dashboard: 'dashboard', orders: 'orders', tables: 'tables', reservations: 'reservations', history: 'history', inventory: 'inventory', cash: 'cash', kitchen: 'kitchen', admin: 'admin' }

// Barra superior del kit (Dashboard / Filled.png): logo, pestañas en píldora gris, campana con punto, chip de usuario.
export function TopBar({ active, role, userName, unread = 0, activeSubtab, onOpenSettings }: { active: KitTab | null; role: Role; userName: string; unread?: number; activeSubtab?: string; onOpenSettings: () => void }) {
  const t = useTranslations('pos.kit.nav')
  const tr = useTranslations('pos.nav.roles')
  const tabs = tabsFor(role)
  return (
    <header className="shrink-0 bg-surface border-b border-border">
      <div className="h-topbar px-6 flex items-center gap-6">
        <Link href="/dashboard" aria-label="Waiter" className="w-9 h-9 rounded-md bg-primary text-primary-ink grid place-items-center font-semibold">W</Link>
        <nav aria-label={t('main')} className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {tabs.map((tab) => (
            <Link key={tab} href={TAB_ROUTES[tab]} aria-current={tab === active ? 'page' : undefined}
              className={cn('flex items-center gap-2 h-11 px-4 rounded-md text-[16px] font-semibold', tab === active ? 'bg-surface border border-border text-ink' : 'text-dim hover:text-soft')}>
              <Icon name={ICON[tab]} size={20} /><span>{t(tab)}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" aria-label={t('bell', { count: unread })} className="relative w-12 h-12 rounded-md border border-border grid place-items-center text-soft">
            <Icon name="bell" size={22} />
            {unread > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-danger border-2 border-surface" />}
          </button>
          <button type="button" onClick={onOpenSettings} className="h-12 pl-1.5 pr-4 rounded-md border border-border flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-primary-soft text-primary grid place-items-center text-[14px] font-semibold">{initials(userName)}</span>
            <span className="text-[15px] text-ink font-semibold">{userName}<span className="text-dim font-normal"> / {tr(role)}</span></span>
          </button>
        </div>
      </div>
      {active === 'admin' && (
        <nav aria-label={t('adminRow')} className="h-14 px-6 flex items-center gap-2 border-t border-border">
          {ADMIN_SUBTABS.map(([key, href]) => (
            <Link key={key} href={href} aria-current={key === activeSubtab ? 'page' : undefined}
              className={cn('h-10 px-4 rounded-md border text-[15px] font-semibold', key === activeSubtab ? 'bg-primary-soft border-primary/40 text-primary' : 'bg-surface border-border text-soft')}>{t(`sub.${key}`)}</Link>
          ))}
        </nav>
      )}
    </header>
  )
}
```

Añadir a `es.json` en `pos.kit`:

```json
"nav": {
  "main": "Navegación principal", "adminRow": "Administración",
  "dashboard": "Inicio", "orders": "Pedidos", "tables": "Mesas", "reservations": "Reservas", "history": "Historial",
  "inventory": "Inventario", "cash": "Caja", "kitchen": "Cocina", "admin": "Administración",
  "bell": "Notificaciones, {count} sin leer",
  "sub": { "sales": "Ventas", "catalog": "Catálogo", "customers": "Clientes", "billing": "Facturación", "roi": "Retorno", "settings": "Configuración" }
}
```

En el componente, el `aria-label` de la fila de administración usa `t('adminRow')`; la pestaña usa `t('admin')`.

- [ ] **Step 5: Ejecutar** → PASS. Ejecutar también `npx jest components/layout lib/domain` para comprobar que `Sidebar.test.tsx` y `roles` siguen verdes.

- [ ] **Step 6: Commit**

```bash
git add pos/lib/domain/navigation.ts pos/lib/domain/roles.ts pos/components/kit/TopBar.tsx pos/lib/i18n/messages/es.json pos/lib/domain/__tests__/navigation.test.ts pos/components/kit/__tests__/TopBar.test.tsx
git commit -m "feat(pos): kit top bar with tabs per role and admin row"
```

---

### Task 9: Modal "Setting" con perfil, pantalla y salir

**Files:**
- Create: `pos/components/kit/SettingsModal.tsx`
- Modify: `pos/lib/i18n/messages/es.json` (`pos.kit.settings`)
- Test: `pos/components/kit/__tests__/SettingsModal.test.tsx`

**Interfaces:**
- `SettingsModal({ open, onClose, user: { name, role }, restaurant, onLogout })`. Pestañas: `profile` (Employee Info: nombre, rol, restaurante; los campos de empleado llegan en I.6), `notifications` (los seis toggles guardados en `localStorage` `waiter.notify` hasta que I.5 los mueva a Odoo), `security` (botón "Cambiar PIN" deshabilitado con nota "Disponible con el login por PIN"), `display` (idioma: selector deshabilitado en "Español"; modo de color: tres tarjetas Sistema / Claro / Oscuro con `useTheme`). Pie: botón "Cerrar sesión" que abre `Modal` de confirmación "¿Cerrar sesión?" con "No, volver" y "Sí, salir".

- [ ] **Step 1: Prueba**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { SettingsModal } from '@/components/kit/SettingsModal'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme })

// Falla si elegir "Oscuro" en Pantalla no cambia el tema del documento.
it('display tab switches the theme', async () => {
  wrap(<SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'admin' }} restaurant="La Provincia" onLogout={async () => undefined} />)
  await userEvent.click(screen.getByRole('tab', { name: 'Pantalla' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

// Falla si "Cerrar sesión" sale sin confirmar o si la confirmación no llama a onLogout.
it('logout asks for confirmation before calling onLogout', async () => {
  const onLogout = jest.fn(async () => undefined)
  wrap(<SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'waiter' }} restaurant="" onLogout={onLogout} />)
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(onLogout).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))
  expect(onLogout).toHaveBeenCalled()
})
```

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { Toggle } from '@/components/kit/Toggle'
import { Button } from '@/components/ui/Button'
import { THEME_MODES, type ThemeMode } from '@/lib/design/tokens'
import type { Role } from '@/lib/domain/roles'
import { useTheme } from '@/lib/hooks/useTheme'
import { useStored } from '@/lib/hooks/useStored'
import { cn } from '@/lib/utils'

const TABS = [['profile', 'user'], ['notifications', 'bell'], ['security', 'lock'], ['display', 'photo']] as const
type Tab = (typeof TABS)[number][0]
const CHANNELS = ['kitchen', 'inventory', 'system'] as const
const MODES = ['popup', 'sound'] as const

// Modal "Setting" del kit (10 – Account Setting/*.png): pestañas verticales, panel, tarjeta de tiempo y salir.
export function SettingsModal({ open, onClose, user, restaurant, onLogout }: { open: boolean; onClose: () => void; user: { name: string; role: Role }; restaurant: string; onLogout: () => Promise<void> }) {
  const t = useTranslations('pos.kit.settings')
  const tr = useTranslations('pos.nav.roles')
  const [tab, setTab] = useState<Tab>('profile')
  const [confirming, setConfirming] = useState(false)
  const { mode, setMode } = useTheme()
  const stored = useStored('waiter.notify')
  const [notify, setNotify] = useState<Record<string, boolean>>(() => { try { return JSON.parse(stored || '{}') } catch { return {} } })
  const flip = (key: string, v: boolean) => { const next = { ...notify, [key]: v }; setNotify(next); try { localStorage.setItem('waiter.notify', JSON.stringify(next)) } catch { /* sin almacenamiento */ } }
  const on = (key: string) => notify[key] ?? true

  return (
    <>
      <Modal open={open} onClose={onClose} title={t('title')} size="wide">
        <div className="h-full flex">
          <aside className="w-[280px] shrink-0 border-r border-border p-4 flex flex-col gap-1">
            <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
              {TABS.map(([key, icon]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={cn('flex items-center gap-3 h-12 px-3 rounded-md text-[15px] font-semibold', tab === key ? 'bg-surface border border-border text-ink' : 'text-soft hover:bg-muted')}>
                  <Icon name={icon as KitIcon} size={20} /><span>{t(`tabs.${key}`)}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto p-4 rounded-md bg-muted flex flex-col gap-3">
              <span className="text-[13px] text-soft">{t('session')}</span>
              <Button variant="destructive" onClick={() => setConfirming(true)}><Icon name="logout" size={18} />{t('logout')}</Button>
            </div>
          </aside>
          <section className="flex-1 min-w-0 p-6 overflow-auto">
            {tab === 'profile' && (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[15px]">
                <div><dt className="text-dim">{t('profile.name')}</dt><dd className="font-semibold text-ink">{user.name}</dd></div>
                <div><dt className="text-dim">{t('profile.role')}</dt><dd className="font-semibold text-ink">{tr(user.role)}</dd></div>
                <div><dt className="text-dim">{t('profile.restaurant')}</dt><dd className="font-semibold text-ink">{restaurant || '—'}</dd></div>
                <p className="col-span-2 text-[13px] text-dim">{t('profile.soon')}</p>
              </dl>
            )}
            {tab === 'notifications' && CHANNELS.map((ch) => (
              <div key={ch} className="py-4 border-b border-border flex flex-col gap-3">
                <div><p className="font-semibold text-ink">{t(`notify.${ch}.title`)}</p><p className="text-[13px] text-soft">{t(`notify.${ch}.body`)}</p></div>
                {MODES.map((m) => <label key={m} className="flex items-center justify-between text-[15px] text-ink"><span>{t(`notify.${m}`)}</span><Toggle checked={on(`${ch}.${m}`)} onChange={(v) => flip(`${ch}.${m}`, v)} label={`${t(`notify.${ch}.title`)} ${t(`notify.${m}`)}`} /></label>)}
              </div>
            ))}
            {tab === 'security' && (
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div><p className="font-semibold text-ink">PIN</p><p className="text-[13px] text-soft">{t('security.pinSoon')}</p></div>
                <Button disabled>{t('security.changePin')}<Icon name="chevronRight" size={16} /></Button>
              </div>
            )}
            {tab === 'display' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between"><div><p className="font-semibold text-ink">{t('display.language')}</p><p className="text-[13px] text-soft">{t('display.languageBody')}</p></div><Button disabled><Icon name="language" size={18} />Español</Button></div>
                <div>
                  <p className="font-semibold text-ink">{t('display.colorMode')}</p><p className="text-[13px] text-soft mb-3">{t('display.colorModeBody')}</p>
                  <div role="radiogroup" aria-label={t('display.colorMode')} className="grid grid-cols-3 gap-3">
                    {THEME_MODES.map((m: ThemeMode) => (
                      <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                        className={cn('h-28 rounded-lg border-2 flex flex-col items-center justify-center gap-2 text-[15px] font-semibold', mode === m ? 'border-primary text-primary' : 'border-border text-soft')}>
                        <span className={cn('w-16 h-10 rounded-sm border border-border', m === 'dark' ? 'bg-[#131316]' : m === 'light' ? 'bg-white' : 'bg-gradient-to-r from-white to-[#131316]')} />
                        {t(`display.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </Modal>
      <Modal open={confirming} onClose={() => setConfirming(false)} footer={
        <div className="flex gap-3"><Button className="flex-1" onClick={() => setConfirming(false)}>{t('logoutNo')}</Button><Button variant="primary" className="flex-1" onClick={() => { setConfirming(false); void onLogout() }}>{t('logoutYes')}</Button></div>
      }>
        <div className="p-8 text-center flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center"><Icon name="logout" size={26} /></span>
          <p className="text-[20px] font-semibold text-ink">{t('logoutTitle')}</p><p className="text-soft">{t('logoutBody')}</p>
        </div>
      </Modal>
    </>
  )
}
```

`es.json`, en `pos.kit`:

```json
"settings": {
  "title": "Ajustes", "session": "Sesión en este dispositivo", "logout": "Cerrar sesión",
  "logoutTitle": "¿Cerrar sesión?", "logoutBody": "Saldrás de la aplicación en este dispositivo.", "logoutNo": "No, volver", "logoutYes": "Sí, salir",
  "tabs": { "profile": "Empleado", "notifications": "Notificaciones", "security": "Seguridad", "display": "Pantalla" },
  "profile": { "name": "Nombre", "role": "Rol", "restaurant": "Restaurante", "soon": "Teléfono, correo, turno y fecha de ingreso llegan con el login por PIN." },
  "notify": { "popup": "Aviso en pantalla", "sound": "Sonido",
    "kitchen": { "title": "Cocina", "body": "Avisos de cocina sobre los pedidos." },
    "inventory": { "title": "Inventario", "body": "Avisos sobre existencias e ingredientes." },
    "system": { "title": "Sistema", "body": "Avisos sobre actualizaciones del sistema." } },
  "security": { "changePin": "Cambiar PIN", "pinSoon": "Disponible con el login por PIN." },
  "display": { "language": "Idioma", "languageBody": "Idioma de la aplicación.", "colorMode": "Modo de color", "colorModeBody": "Sistema, claro u oscuro.", "system": "Sistema", "light": "Claro", "dark": "Oscuro" }
}
```

- [ ] **Step 4: Ejecutar** → PASS.

- [ ] **Step 5: Commit**

```bash
git add pos/components/kit/SettingsModal.tsx pos/components/kit/__tests__/SettingsModal.test.tsx pos/lib/i18n/messages/es.json
git commit -m "feat(pos): kit settings modal with theme, notification preferences and logout"
```

---

### Task 10: `KitShell` y rutas nuevas; `Shell` delega

**Files:**
- Create: `pos/components/kit/KitShell.tsx`, `pos/app/(pos)/dashboard/page.tsx`, `pos/app/(pos)/pedidos/page.tsx`, `pos/app/(pos)/reservas/page.tsx`, `pos/app/(pos)/historial/page.tsx`
- Modify: `pos/components/layout/Shell.tsx`, `pos/app/page.tsx` (redirige a `/dashboard`), `pos/lib/i18n/messages/es.json` (`pos.kit.soon`)
- Test: `pos/components/kit/__tests__/KitShell.test.tsx`

**Interfaces:**
- `KitShell({ children })`: lee usuario, rol y restaurante de los stores; calcula la pestaña activa con `tabForPath(usePathname())`; renderiza `TopBar`, el contenido en `bg-canvas` y `SettingsModal`; `onLogout` = `authStore.logout()` y `router.replace('/login')`.
- `Shell` conserva su firma (`mode`, `active`, `badges`, `subnav`, `autonomy`) pero ignora `mode`, `badges`, `subnav` y `autonomy` y renderiza `KitShell`. Las páginas antiguas no se tocan en esta oleada.

- [ ] **Step 1: Prueba**

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { KitShell } from '@/components/kit/KitShell'
import messages from '@/lib/i18n/messages/es.json'
import { useAuthStore } from '@/lib/stores/authStore'

jest.mock('next/navigation', () => ({ usePathname: () => '/reservas', useRouter: () => ({ replace: jest.fn() }) }))

// Falla si el armazón deja de mostrar la barra superior con la pestaña de la ruta actual.
it('renders the top bar with the tab of the current path and the page content', () => {
  useAuthStore.setState({ user: { id: 1, name: 'Ricardo Wilson', login: 'r', role: 'waiter' } as never, session: null, hydrated: true })
  render(<NextIntlClientProvider locale="es" messages={messages}><KitShell><p>contenido</p></KitShell></NextIntlClientProvider>)
  expect(screen.getByRole('link', { name: 'Reservas' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('contenido')).toBeInTheDocument()
})
```

Comprobar el tipo `AuthUser` en `lib/services/session.ts` y ajustar el objeto del `setState` a sus campos reales.

- [ ] **Step 2: Ejecutar y ver fallar** → FAIL.

- [ ] **Step 3: Implementar `KitShell.tsx`**

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { SettingsModal } from '@/components/kit/SettingsModal'
import { TopBar } from '@/components/kit/TopBar'
import { ADMIN_SUBTABS, tabForPath } from '@/lib/domain/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

export function KitShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const restaurant = useCatalogStore((s) => s.catalog?.company.name ?? '')
  const [settings, setSettings] = useState(false)
  const role = user?.role ?? 'waiter'
  const activeSubtab = ADMIN_SUBTABS.find(([, href]) => pathname.startsWith(href))?.[0]
  return (
    <div className="h-screen flex flex-col bg-canvas text-ink">
      <TopBar active={tabForPath(pathname)} role={role} userName={user?.name ?? ''} activeSubtab={activeSubtab} onOpenSettings={() => setSettings(true)} />
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      <SettingsModal open={settings} onClose={() => setSettings(false)} user={{ name: user?.name ?? '', role }} restaurant={restaurant}
        onLogout={async () => { await logout(); router.replace('/login') }} />
    </div>
  )
}
```

`Shell.tsx` pasa a:

```tsx
'use client'

import type { ReactNode } from 'react'

import { KitShell } from '@/components/kit/KitShell'
import type { Autonomy, NavBadge, NavItem, SubNavItem } from '@/components/layout/Sidebar'

// Compatibilidad: las pantallas anteriores a la oleada I.1 siguen llamando a Shell; todo se pinta con el armazón del kit.
interface ShellProps { mode: 'sidebar' | 'rail'; active?: NavItem; children: ReactNode; badges?: Partial<Record<NavItem, NavBadge>>; subnav?: { label: string; items: SubNavItem[] }; autonomy?: Autonomy | null }
export function Shell({ children }: ShellProps) {
  return <KitShell>{children}</KitShell>
}
```

Las cuatro páginas nuevas, con el mismo patrón (ejemplo `reservas/page.tsx`):

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'

export default function ReservasPage() {
  const t = useTranslations('pos.kit.soon')
  return <KitShell><KitEmptyState icon="reservations" title={t('reservations')} body={t('body')} /></KitShell>
}
```

`es.json`: `"soon": { "body": "Esta pantalla llega en su oleada del Plan I.", "dashboard": "Inicio", "orders": "Pedidos", "reservations": "Reservas", "history": "Historial" }`. `app/page.tsx` redirige a `/dashboard`.

- [ ] **Step 4: Ejecutar la suite completa**

Run: `cd pos && npm test -- --runInBand && npm run typecheck && npm run lint`
Expected: todo verde. `Sidebar.test.tsx` sigue verde porque `Sidebar` no se borra. Si `Shell` era el único consumidor de `Rail`, `Rail` queda sin uso y se elimina junto con su clave `pos.rail` en una tarea de limpieza de I.7.

- [ ] **Step 5: Commit**

```bash
git add pos/components/kit/KitShell.tsx pos/components/layout/Shell.tsx "pos/app/(pos)/dashboard" "pos/app/(pos)/pedidos" "pos/app/(pos)/reservas" "pos/app/(pos)/historial" pos/app/page.tsx pos/lib/i18n/messages/es.json pos/components/kit/__tests__/KitShell.test.tsx
git commit -m "feat(pos): kit shell with top bar replaces the sidebar; new routes with honest empty states"
```

---

### Task 11: Galería de componentes y capturas a 1194×834

**Files:**
- Create: `pos/app/(pos)/kit/page.tsx`, `pos/scripts/kit-compare.cjs`
- Modify: `pos/playwright.config.ts` (proyecto `Tablet` con `devices['iPad Pro 11 landscape']`), `pos/.gitignore` (`kit-compare/`), `pos/package.json` (script `kit:compare`)

**Interfaces:**
- `/kit` (solo admin, `allowedPath` ya lo mapea a `admin`): muestra Chip activo e inactivo con conteo, seis `StatusPill`, `Toggle`, `Card` con acción, `KitEmptyState`, `NumericKeypad` + `PinInput`, `WizardSteps`, botón que abre `Modal` en sus tres tamaños y botón que dispara un toast.
- `npm run kit:compare -- /kit /salon` captura cada ruta con la sesión de admin a 1194×834 en `pos/kit-compare/<ruta>.png`.

- [ ] **Step 1: Página `/kit`**

```tsx
'use client'

import { useState } from 'react'

import { Card } from '@/components/kit/Card'
import { Chip } from '@/components/kit/Chip'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { Modal } from '@/components/kit/Modal'
import { NumericKeypad } from '@/components/kit/NumericKeypad'
import { PinInput } from '@/components/kit/PinInput'
import { StatusPill, type PillTone } from '@/components/kit/StatusPill'
import { Toggle } from '@/components/kit/Toggle'
import { WizardSteps } from '@/components/kit/WizardSteps'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/stores/toastStore'

const TONES: PillTone[] = ['progress', 'success', 'info', 'danger', 'reserved', 'neutral']

// Galería de desarrollo: cada bloque se coteja con su PNG del kit (docs/diseno/pos-kit/pantallas).
export default function KitPage() {
  const [pin, setPin] = useState('')
  const [on, setOn] = useState(true)
  const [modal, setModal] = useState<'center' | 'wide' | 'full' | null>(null)
  return (
    <KitShell>
      <div className="p-6 grid grid-cols-2 gap-6 overflow-auto">
        <Card title="Chips y estados" action={<Button size="compact" onClick={() => toast({ title: '¡Pedido #DI001 enviado!', body: 'Va camino a cocina.' })}>Toast</Button>}>
          <div className="p-5 flex flex-wrap gap-2"><Chip label="Todos" count={20} active /><Chip label="En progreso" count={11} /><Chip label="Listos" count={5} icon="check" /></div>
          <div className="p-5 pt-0 flex flex-wrap gap-2">{TONES.map((t) => <StatusPill key={t} tone={t} icon="clock">{t}</StatusPill>)}</div>
          <div className="p-5 pt-0"><Toggle checked={on} onChange={setOn} label="Sonido" /></div>
        </Card>
        <Card title="Teclado y PIN"><div className="p-5 flex flex-col items-center gap-4"><PinInput value={pin} label="PIN" /><NumericKeypad onDigit={(d) => setPin((p) => (p + d).slice(0, 6))} onBackspace={() => setPin((p) => p.slice(0, -1))} /></div></Card>
        <Card title="Pasos y modales">
          <div className="p-5 flex flex-col gap-4"><WizardSteps steps={['Datos del cliente', 'Mesa', 'Menú', 'Resumen']} current={1} />
            <div className="flex gap-2"><Button onClick={() => setModal('center')}>Centrado</Button><Button onClick={() => setModal('wide')}>Ancho</Button><Button onClick={() => setModal('full')}>Completo</Button></div></div>
        </Card>
        <Card title="Estado vacío"><KitEmptyState icon="cart" title="No hay pedidos" body="Cuando se cree un pedido, el último aparecerá aquí." /></Card>
      </div>
      <Modal open={modal !== null} onClose={() => setModal(null)} title="Detalle" size={modal ?? 'center'}><div className="p-6">Contenido del modal {modal}</div></Modal>
    </KitShell>
  )
}
```

- [ ] **Step 2: Proyecto Tablet en Playwright y script de capturas**

En `playwright.config.ts`, `projects` pasa a:

```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Tablet', use: { ...devices['iPad Pro 11 landscape'] } },
],
```

`scripts/kit-compare.cjs`:

```js
// Captura rutas del POS a 1194×834 (iPad Pro 11 apaisado, el marco del kit) para cotejarlas con docs/diseno/pos-kit/pantallas.
// Uso: npm run kit:compare -- /kit /salon   (requiere `next dev` en http://localhost:3000 y Odoo demo con admin/admin)
const { chromium, devices } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const routes = process.argv.slice(2)
  if (routes.length === 0) { console.error('Indica al menos una ruta, por ejemplo: npm run kit:compare -- /kit'); process.exit(1) }
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const out = path.join(__dirname, '..', 'kit-compare'); fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['iPad Pro 11 landscape'] })
  const page = await context.newPage()
  await page.goto(`${base}/login`)
  await page.getByLabel('Correo').fill('admin'); await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: 'Abrir mi turno' }).click()
  await page.waitForURL('**/dashboard')
  for (const route of routes) {
    await page.goto(`${base}${route}`); await page.waitForLoadState('networkidle')
    const file = path.join(out, `${route.replace(/\//g, '_').replace(/^_/, '') || 'root'}.png`)
    await page.screenshot({ path: file }); console.log('captura', file)
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
```

`package.json`: `"kit:compare": "node scripts/kit-compare.cjs"`. `.gitignore` de `pos/`: `kit-compare/`.

- [ ] **Step 3: Probar a mano**

Run: `cd pos && npx next dev --hostname 192.168.56.10 --port 3000` en una terminal y `PLAYWRIGHT_BASE_URL=http://192.168.56.10:3000 npm run kit:compare -- /kit /salon /ventas` en otra.
Expected: tres PNG en `pos/kit-compare/`. Abrir `kit.png` junto a `docs/diseno/pos-kit/pantallas/Visual Design Light/4 – Order/Ipad View.png` y comprobar: barra superior con píldora gris y pestaña activa blanca, chips con conteo, toast oscuro abajo. Anotar diferencias en el commit si las hay.

- [ ] **Step 4: Commit**

```bash
git add "pos/app/(pos)/kit" pos/scripts/kit-compare.cjs pos/playwright.config.ts pos/package.json pos/.gitignore
git commit -m "chore(pos): kit component gallery and 1194x834 capture script"
```

---

### Task 12: Recorrido E2E del armazón y documentación

**Files:**
- Create: `pos/e2e/armazon.spec.ts`
- Modify: `pos/e2e/helpers/odoo.ts` (`loginAsAdmin` espera `**/dashboard`), `pos/README.md` (sección "Sistema de diseño del kit"), `docs/README.md` (enlace al Plan I), `odoo/addons/README.md` sin cambios.

- [ ] **Step 1: Ajustar el helper**

En `loginAsAdmin`, cambiar `await page.waitForURL('**/salon')` por `await page.waitForURL('**/dashboard')`. Ejecutar `npx playwright test e2e/pedido.spec.ts --project="Desktop Chrome"` y corregir cualquier E2E que asumiera `/salon` tras el login (navegar explícitamente a `/salon` con `page.goto`).

- [ ] **Step 2: Escribir el recorrido**

```ts
import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// Armazón del kit: barra superior por rol, ajustes con tema oscuro y cierre de sesión con confirmación.
test('top bar, dark theme and logout', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Administración' })).toBeVisible()
  await page.getByRole('link', { name: 'Mesas' }).click()
  await expect(page).toHaveURL(/\/salon$/)

  await page.getByRole('button', { name: /Administrator|admin/i }).click()
  await page.getByRole('tab', { name: 'Pantalla' }).click()
  await page.getByRole('radio', { name: 'Oscuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: /Administrator|admin/i }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('button', { name: 'Sí, salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
```

Run: `cd pos && npx playwright test e2e/armazon.spec.ts --project=Tablet`
Expected: 1/1 verde. Si el nombre del usuario admin en la demo no coincide con el patrón, leerlo con `page.getByRole('button', { name: /\/ Administrador/ })`.

- [ ] **Step 3: Documentar**

`pos/README.md`, sección nueva "Sistema de diseño del kit CloudPos": tokens en `lib/design/tokens.ts` y `globals.css`; componentes en `components/kit/`; galería `/kit`; `npm run kit:compare`; tema en `waiter.theme`. `docs/README.md`: añadir al orden de lectura "6. [Plan I](planes/2026-09-06-plan-I-rediseno-pos-kit.md) y [Plan I.1](planes/2026-09-06-plan-I1-sistema-de-diseno.md)".

- [ ] **Step 4: Verificación final de la oleada**

```bash
cd pos && npm test -- --runInBand && npm run typecheck && npm run lint && npx playwright test e2e/armazon.spec.ts e2e/pedido.spec.ts e2e/caja.spec.ts
```

Expected: Jest verde con las pruebas nuevas (tokens, Icon, átomos, teclado, modal, toasts, tema, navegación, TopBar, SettingsModal, KitShell), typecheck y lint sin errores, E2E verdes.

- [ ] **Step 5: Commit**

```bash
git add pos/e2e/armazon.spec.ts pos/e2e/helpers/odoo.ts pos/README.md docs/README.md
git commit -m "test(e2e): kit shell round trip; docs for the kit design system"
```

---

## Self-review

- **Cobertura del spec (Plan I, oleada I.1):** tokens y dos temas (T1, T7), Open Sans (T1), Tabler (T2), componentes base con pruebas (T3 a T6), barra superior por rol (T8), modal Setting con tema e idioma (T9), toasts (T6), galería y capturas (T11), rutas actuales funcionando dentro del nuevo armazón (T10, T12).
- **Nombres consistentes:** `Icon`/`KitIcon`, `Chip`, `StatusPill`/`PillTone`, `Toggle`, `Card`, `KitEmptyState`, `NumericKeypad`, `PinInput`, `Modal` (`size: center | wide | full`), `WizardSteps`, `toast`/`useToastStore`, `useTheme`/`applyTheme`, `KIT_TABS`/`TAB_ROUTES`/`ADMIN_SUBTABS`/`tabsFor`/`tabForPath`, `TopBar`, `SettingsModal`, `KitShell`. Las claves i18n nuevas cuelgan de `pos.kit` (`keypad`, `nav`, `settings`, `soon`) y reutilizan `pos.ui.close` y `pos.nav.roles`.
- **Sin placeholders:** cada tarea trae la prueba, el código y el comando. Lo que queda para otras oleadas está dicho con su oleada (campos de empleado en I.6, preferencias en Odoo en I.5, retirar `Rail` y `Sidebar` en I.7).
