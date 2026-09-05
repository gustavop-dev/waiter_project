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

### E2E de marca (`e2e/marca.spec.ts`)

El comensal ve la marca cuando caduca la caché de `experience/`
(`BRAND_CACHE_SECONDS`, 60 s por defecto). En dev arranca `experience/` con
`BRAND_CACHE_SECONDS=5` para que el sondeo del E2E no espere un minuto; si
usas otro valor, pásalo también al test con `E2E_BRAND_CACHE_SECONDS`
(default 5), que fija el timeout del sondeo (caché + 10 s). Con
`EXPERIENCE_INTERNAL_KEY` (la misma clave del `.env` de `experience/`) el
test invalida la caché al terminar por
`POST http://192.168.56.10:8001/internal/v1/carta/burger-house/poblado/invalidar/`
(cabecera `X-Internal-Key`); sin ella avisa por consola y la deja caducar.

    E2E_BRAND_CACHE_SECONDS=5 EXPERIENCE_INTERNAL_KEY=… npx playwright test e2e/marca.spec.ts

## Fuera de Plan A (y dónde vive)

KDS de cocina → Plan B · Dashboard de ROI y operación en vivo → Plan C ·
modo sin conexión, propina real, impresión de comanda, sugerencias del Mesero
IA, modificadores por atributo y agotados por inventario → siguientes planes.
