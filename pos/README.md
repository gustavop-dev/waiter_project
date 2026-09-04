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
