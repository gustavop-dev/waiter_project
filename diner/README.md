# diner — la app del comensal

Frontend del bloque 3. **Solo habla con `experience/`** (`/api/v1/*` por proxy
same-origin); no importa nada de `pos/` ni conoce Odoo ni el registro
(`docs/decisiones/2026-09-05-comensal-app-aparte.md`).

```bash
npm ci && npm run dev            # 192.168.56.10:3001 · EXPERIENCE_ORIGIN=http://192.168.56.10:8001
npm test -- lib components       # unit por lotes
PLAYWRIGHT_BASE_URL=http://192.168.56.10:3001 npx playwright test
```

Rutas: `/<rest>/<sede>` (domicilio) y `/<rest>/<sede>/t/<token>` (mesa), más
`/carta`, `/plato/<id>`, `/pedido`, `/estado/<id>`, `/la-cuenta` (pedir la cuenta),
`/pago` (maquetado: sin pasarela), `/cuenta/registro`, `/cuenta/codigo` y `/cuenta`
(Mi cuenta e historial; registro maquetado). La marca del
restaurante llega en `contexto.marca` y se aplica como variables `--r-*`.

## Plantillas (Plan H)

La app es un motor: `contexto.plantilla` trae los tokens (`--t-*`) y qué layout pinta cada
pantalla (`components/templates/registry.ts`: 30 menús por código, carrito y pago por
familia, nueve patrones de cuenta). Una plantilla se previsualiza sin guardar con
`?vista_previa=<base64url {"plantilla":"A1","paleta":{...},"tipografia":{...}}>` (así la
embebe el POS en Configuración › Plantilla del menú). Las capturas de referencia de cada
plantilla viven en `public/plantillas-capturas/`.
