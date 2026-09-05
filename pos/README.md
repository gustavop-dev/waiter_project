# pos — POS del operador

App Next.js para mesero, cajero y administrador. Habla con Odoo por su API externa JSON-RPC a
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

## Alcance actual

A: salón y pedidos; B: KDS; C: backoffice y ROI; E: cobro, caja y roles;
G: configuración de marca; H: galería, personalización y vista previa de 30 plantillas.
El catálogo y los ajustes de plantillas viven en `experience/`; el POS los administra
mediante `/waiter/admin/menu_settings`, autorizado por Odoo. Los secretos permanecen en
el servidor. El comensal usa la app independiente `diner/`.

El pago móvil de H es demo. El cobro real, incluidos pedidos del comensal con descuento,
sigue en este POS. [Contexto y revisión de H](../docs/revisiones/2026-09-05-cierre-H-pr14.md).
