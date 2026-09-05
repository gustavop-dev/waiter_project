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


## Revisión de H

El pago confirma el pedido antes de simular la autorización y usa el monto de la
respuesta del servidor. Las variantes que permiten reparto envían la opción, nunca
un importe confiado al navegador. Un fallo de confirmación impide continuar al pago.
Las pantallas sin layout específico (plato, estado y cuenta de mesa) también toman
superficies y tinta de la plantilla activa.

El registro demo solo verifica el desafío de esta cookie (diez minutos, uso único),
no permite recuperar una cuenta existente por correo y falla cerrado en producción.
El pago sigue llevando «Demo · sin cobro real»; no cobra ni factura.

Ver [evidencia y pasos de integración](../docs/revisiones/2026-09-05-cierre-H-pr14.md).
