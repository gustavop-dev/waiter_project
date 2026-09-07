# pos — POS del operador

App Next.js para mesero, cajero y administrador. Habla con Odoo por su API externa JSON-RPC a
través del proxy same-origin `/odoo/*`; **nunca usa la interfaz de Odoo**.
Diseño: el kit CloudPos (`docs/diseno/pos-kit/`, Plan I). Las pantallas 1a y 1b de
`docs/diseno/waiter-pantallas.dc.html` son la referencia anterior a la oleada I.1.

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

## Sistema de diseño del kit CloudPos (Plan I.1)

- Tokens en `lib/design/tokens.ts` y `app/globals.css` (`--kit-*`, temas claro y oscuro por
  `<html data-theme>`, `@theme inline`). Los nombres antiguos (`brand-500`, `ink`, `canvas`…) siguen
  existiendo con los valores del kit. Tipografía Open Sans (`@fontsource/open-sans`).
- Iconos: solo Tabler, a través de `components/kit/Icon.tsx`.
- Componentes del kit en `components/kit/`: `TopBar`, `KitShell`, `SettingsModal`, `Chip`,
  `StatusPill`, `Toggle`, `Card`, `KitEmptyState`, `NumericKeypad`, `PinInput`, `Modal`,
  `WizardSteps`, `Toaster` (con `lib/stores/toastStore.ts`).
- Navegación por rol en `lib/domain/navigation.ts`; `Shell` delega en `KitShell`.
- Tema: `lib/hooks/useTheme.ts` (`waiter.theme`); preferencias de aviso en `waiter.notify` hasta la oleada I.5.
- Galería de componentes en `/kit` (solo admin). Capturas a 1194×834 para cotejar con los PNG del kit:
  `PLAYWRIGHT_BASE_URL=http://192.168.56.10:3000 npm run kit:compare -- /kit /salon` → `kit-compare/`.
- Playwright tiene el proyecto `Tablet` (iPad Pro 11 apaisado sobre Chromium): `npx playwright test <spec> --project=Tablet`.

## Inventario del kit (12 – Inventory, `/inventario`)

Sobre los módulos estándar de Odoo, sin addon propio: ingrediente = `product.template` almacenable y no
vendible (`sale_ok = false`, `is_storable = true`, `available_in_pos = false`) con categoría hija de
`product.category` "Ingredientes"; receta = `mrp.bom` tipo kit (`phantom`) del plato; proveedor =
`product.supplierinfo`; umbrales Bajo / Medio / Alto = `stock.warehouse.orderpoint` (mín y máx; sin punto
de pedido: Bajo ≤ 5, Medio ≤ 20); solicitud = `purchase.order` en borrador (Odoo no envía correo hasta que
alguien pulse "Enviar por correo" en la orden). Reglas puras en `lib/domain/pantry.ts`, Odoo en
`lib/services/pantry.ts`, textos en `lib/i18n/messages/modules/pantry.json`.

Datos demo del kit (idempotente; volver a correrlo deja el stock en los valores demo):

    node scripts/seed-pantry.cjs        # ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD opcionales

Crea las categorías de ingrediente, las unidades Manojo / Diente / Rebanada, 2 proveedores, 8 ingredientes
con stock y punto de pedido, y la receta de 6 platos demo (hamburguesas, arepa, bowl, carbonara, tacos).
Los ingredientes no tienen foto (no hay imágenes de ingredientes en `assets/demo/imagenes/`).
## Mesas (kit 6 – Table, oleada I.2)

`/salon` pinta el plano real de `restaurant.table` (`position_h/v`, `width`, `height`, `seats`) con las tres
plantillas del kit (`lib/domain/tablesKit.ts`). Lo que Odoo no guarda viaja así, hasta que el addon lo tenga:
tipo de piso como sufijo del nombre (`Piso 4 · Exterior`), rotación intercambiando ancho y alto, nombre de mesa
reducido a `table_number` (de "Mesa A12" se guarda 12). "Reservada" aparece en la leyenda pero no hay reservas
hasta el módulo de reservas. "Ir a pagar" abre el cobro actual en un modal hasta que exista `/pago/<orderId>`.

## Alcance actual

A: salón y pedidos; B: KDS; C: backoffice y ROI; E: cobro, caja y roles;
G: configuración de marca; H: galería, personalización y vista previa de 30 plantillas.
El catálogo y los ajustes de plantillas viven en `experience/`; el POS los administra
mediante `/waiter/admin/menu_settings`, autorizado por Odoo. Los secretos permanecen en
el servidor. El comensal usa la app independiente `diner/`.

El pago móvil de H es demo. El cobro real, incluidos pedidos del comensal con descuento,
sigue en este POS. [Contexto y revisión de H](../docs/revisiones/2026-09-05-cierre-H-pr14.md).
