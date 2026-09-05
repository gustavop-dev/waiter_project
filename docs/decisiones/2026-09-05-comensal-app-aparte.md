# ADR — El comensal es una app aparte que solo conoce al bloque 3

**Fecha:** 2026-09-05 · **Estado:** aceptada · **Afecta a:** `diner/` (nuevo), `experience/`, `registry/`, `pos/`, `projectapp_ops`

## Contexto

El usuario lo fijó al arrancar el bloque del comensal: "con la arquitectura
modular, para que si toca reemplazar el POS luego no esté todo mezclado con
lo del usuario". La arquitectura ya prohíbe que el bloque 3 toque Odoo salvo
por su adaptador; aquí se extiende esa regla al frontend del comensal.

## Decisión

1. **`diner/` es un paquete propio** (Next.js), sin importar nada de `pos/`.
   Comparte solo la idea del sistema de diseño; sus tokens son los del
   restaurante (`--r-*`) sobre la base fija de Waiter (`--w-*`).
2. **Habla únicamente con `experience/`** (`/api/v1/*`, por proxy same-origin
   de Next). Nunca con Odoo, nunca con el registro. Reemplazar el POS es
   reescribir `experience/adapters/odoo`; el comensal no cambia una línea.
3. **La marca del restaurante vive en el registro** (`Restaurant.brand_*`),
   viaja con el `Tenant` y sale en `contexto.marca` de la API pública. Seis
   variables derivadas de dos entradas (color y tipografía), como manda el
   sistema de diseño; el contraste del color de acción se valida en servidor.
4. **Lo que el comensal pide llega al salón por Odoo**, no por un canal
   paralelo: "llamar al mesero", "pedir la cuenta" y "está pidiendo" se
   escriben en `restaurant.table.waiter_call` (addon `projectapp_ops`) a
   través del adaptador; el POS lo lee como lee todo lo demás. Si el POS
   cambia, cambia el adaptador y el campo equivalente, y el comensal sigue
   llamando al mismo endpoint.
5. **Pago y Mesero IA quedan detrás de la misma API**: `pagos/` e `ia/` se
   enchufan en `experience/` cuando existan; el comensal ya tiene los sitios
   donde aparecen ("Pagar desde el celular" y el saludo del mesero).

## Consecuencias

- Tres frontends, tres orígenes en producción (`restaurant.projectapp.co`,
  `pos.<sede>`, KDS); el comensal es el único público.
- La cookie del comensal es del origen de `diner/` (el proxy la traslada al
  bloque 3), así que no hay CORS ni SameSite que negociar.
- Un cambio de POS obliga a tocar dos sitios acotados: el adaptador de Odoo en
  `experience/` y el campo de llamadas en el nuevo motor. Nada más.
