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
- Galería interna en `/kit` (solo desarrollo y sesión admin; 404 en producción, sin enlace en Configuración). Capturas a 1194×834 para cotejar con los PNG del kit:
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
hasta el módulo de reservas. Mesas no cobra: el cobro es de la caja y se hace desde Pedidos, en `/pago/<orderId>`.

## Alcance actual

A: salón y pedidos; B: KDS; C: backoffice y ROI; E: cobro, caja y roles;
G: configuración de marca; H: galería, personalización y vista previa de 30 plantillas.
El catálogo y los ajustes de plantillas viven en `experience/`; el POS los administra
mediante `/waiter/admin/menu_settings`, autorizado por Odoo. Los secretos permanecen en
el servidor. El comensal usa la app independiente `diner/`.

El pago móvil de H es demo. El cobro real, incluidos pedidos del comensal con descuento,
sigue en este POS. [Contexto y revisión de H](../docs/revisiones/2026-09-05-cierre-H-pr14.md).

## Administración con caja cerrada

Después de validar el PIN de administrador, la pantalla de caja permite **Entrar a administración sin abrir caja**.
Se pueden gestionar mesas y pisos, inventario, catálogo, reservas, clientes, configuración y consultar históricos.
La barra indica **Administración · Caja cerrada** y ofrece **Abrir caja** para empezar a operar.
Pedidos nuevos y cocina requieren una sesión de caja; el acceso sin caja no se habilita para PIN de mesero o cajero.
Los datos administrativos se leen directamente desde los modelos de Odoo, sin crear sesiones de caja.
Los cambios del plano que Odoo restringe durante el servicio se realizan con caja cerrada.

Validación: `e2e/admin-sin-caja.spec.ts` requiere una caja ya cerrada y comprueba edición de piso e inventario,
persistencia al recargar y que no se haya abierto ninguna sesión.

## Editor del restaurante y zonas

Con caja cerrada: **Mesas → Ajustes → Editar piso actual** (o **Agregar piso**).
El plano se edita en la misma pantalla. Se pueden mover, girar y redimensionar mesas, indicar capacidad,
dibujar paredes y zonas con nombre/color y usar una imagen de referencia. La mesa seleccionada muestra
sus propiedades en el panel izquierdo. Los cruces se marcan en rojo; Guardar requiere corregirlos.
Cancelar descarta los cambios; también hay Deshacer, Rehacer, zoom, desplazamiento y Ver todo.

Con caja abierta: **Mesas → Asignar meseros por zona**. Admite varios empleados por zona y se guarda
solo para el turno actual. **Mis zonas** destaca sus mesas, y los avisos de cocina respetan la asignación.
Detalles y validación en [la decisión del editor](../docs/decisiones/2026-09-08-editor-plano-y-zonas.md).


### Ficha del menú Smart Menu

En Catálogo → editar plato → Atributos se publican ingredientes, nutrición,
adicionales y acompañamientos. Cada adicional usa un producto del catálogo con
su precio y disponibilidad; no hay precios duplicados en el editor del menú.
Los acompañamientos pueden seleccionarse manualmente (incluida una selección
vacía) o dejar que el menú sugiera hasta tres productos disponibles.
La identidad visual sigue en Configuración → Menú: colores, tipografía y logo.
