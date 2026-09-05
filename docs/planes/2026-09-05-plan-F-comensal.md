# Plan F — Bloque del usuario · Parte 1: PWA del comensal (sin pago ni IA)

> Contexto posterior (Plan H, 2026-09-05): `experience/` guarda las 30 plantillas y los
> ajustes por sede; `diner/` renderiza y el POS administra. Descuento real con reserva
> atómica; pago simulado después de confirmar; cuenta demo ligada al desafío de la
> misma cookie, sin recuperación de cuentas existentes y deshabilitada en producción.
> El diseño y los planes anteriores conservan su alcance histórico; el estado ejecutado
> y sus límites están en [la revisión de H](../revisiones/2026-09-05-cierre-H-pr14.md).

> **Para agentes:** ejecutar tarea por tarea con el ciclo completo (test que
> falla → implementación mínima → test que pasa → commit). Regla dura: nada
> en `diner/` importa de `pos/` ni habla con Odoo o el registro.

**Objetivo:** que el comensal, al tocar el NFC de la mesa (o abrir el enlace
de domicilio), vea la carta con la marca del restaurante, arme su pedido
junto a los demás de la mesa, lo confirme y siga su estado; y que pueda
llamar al mesero o pedir la cuenta, y que eso se vea en el salón del POS.

**Arquitectura:** ver `docs/decisiones/2026-09-05-comensal-app-aparte.md`.
`diner/` (Next.js 16, Tailwind 4, next-intl, Zustand, Jest, Playwright) ↔
`experience/` (Django) ↔ adaptadores ↔ Odoo / registro.

**Spec:** `docs/diseno/waiter-design-system.dc.html` sección **06 · Comensal
y white-label** (portada: encabezado con nombre en serif y lema, píldora
"Mesa N", saludo en serif, línea del mesero, "Ver la carta →",
"Recomendado para ti" en tarjetas con foto, descripción, precio mono y ＋,
**barra de pedido fija** oscura abajo) · `docs/arquitectura/2026-09-04-bloque-3-experiencia.md`
(contrato de API) · visión §4 (NFC/QR), §11 (todo / lo mío / dividir).

## Contrato entre bloques (fijo para todas las tareas)

```jsonc
// GET /api/v1/<rest>/<sede>[/t/<token>]/  → contexto.marca (nuevo)
"marca": { "nombre": "La Provincia", "lema": "Cocina de barrio", "color": "#7A2E2A", "colorTexto": "#FFFFFF",
           "colorSuave": "#F6EBEA", "fuente": "Instrument Serif", "radio": 14, "logo": null,
           "saludo": "Buenas noches", "mesero": "Alex", "bienvenida": "¿Qué te provoca hoy?" }
// POST /api/v1/sesiones/<id>/llamar/   → {"ok": true}   escribe restaurant.table.waiter_call = "assist"
// POST /api/v1/sesiones/<id>/cuenta/   → {"ok": true, "total": 83700, "porComensal": [...]}  waiter_call = "bill"
// POST /api/v1/sesiones/               (mesa) marca waiter_call = "ordering" si la mesa no tiene pedido aún
// POST /api/v1/sesiones/<id>/confirmar/ limpia "ordering"
// Fuentes curadas (6): "Instrument Serif", "Playfair Display", "Fraunces", "DM Serif Display", "Lora", "Cormorant Garamond"
// Radios: 4 | 14 | 24
```

En el POS (`pos/`): `restaurant.table.waiter_call` ∈ none | ordering | assist |
bill (+ `waiter_call_at`), leído en cada refresco del salón; alimenta los
estados **Pidiendo**, **Asistencia**, **En cuenta** y la alerta "Mesa pide
mesero" de operación en vivo. Cobrar la mesa o atender la alerta lo limpia.

## Notas de ejecución (2026-09-05)

- El proxy `/api` de Next conserva la barra final (Django la exige) con dos
  rewrites; `trailingSlash: true` en `diner/`. Las URL del NFC funcionan con o
  sin barra.
- El tema del restaurante se declara con `@theme inline` en Tailwind 4 para
  que las utilidades apunten a `--r-*` y el override por `<main style>` surta
  efecto (con `@theme` normal el valor se congela en `:root`).
- Tareas 3 a 5 se construyen en paralelo por agentes en worktrees (una rama
  por pantalla) con revisión adversarial de dos lentes antes de fusionar.
- La E2E `pos/e2e/comensal-salon.spec.ts` prueba de punta a punta que
  "llamar al mesero" desde el celular llega al salón (*Asistencia*) y a
  operación en vivo, y que "Voy yo" lo limpia.
- Las pantallas 3 a 5 salieron de dos workflows ultracode (12 agentes para
  construir y verificar por dos lentes; 8 para corregir y recomprobar). Los
  hallazgos que se aplicaron: el token `rounded-r` chocaba con la utilidad
  de Tailwind (ahora `rounded-rest`, con test guardián); un SVG servido como
  foto permitía XSS (las fotos son solo ráster, con `nosniff` y CSP
  `sandbox`); la pantalla de estado sondeaba sin parar tras un pedido
  fallido; y el árbol de `diner/node_modules` se había colado en un commit
  (la rama se reescribió limpia y `.gitignore` lo cubre).
- Precios: Odoo guarda el precio de lista y suma los impuestos encima
  (IVA 19 % en la demo). El comensal ve siempre el **precio final**
  (`Product.final_price`, `CartLine.final_unit_price`): carta, carrito,
  botón de enviar, estado y cuenta muestran la misma cifra que cobra el POS.
  A Odoo sigue viajando el precio de lista.
- Una visita termina cuando el salón cobra: al confirmar sobre un pedido
  pagado la API responde 409 y cierra la sesión; abrir sesión o consultar el
  estado sobre un pedido pagado también la cierra. El siguiente toque al NFC
  arranca limpio. La app del comensal reabre sesión sola ante el 409.
- Recargar la página del comensal conservaba la sesión (cookie) pero no traía
  el carrito: la barra de pedido desaparecía. Ahora se trae al cargar.
- Quién edita la marca del restaurante quedó pendiente aquí (ProjectApp la
  fijaba en el registro al hacer el onboarding). Resuelto en el Plan G: se
  edita desde Configuración › Marca del POS y vive en Odoo; el registro
  guarda el valor inicial (`docs/decisiones/2026-09-05-marca-desde-el-pos.md`).

## Tareas

1. ✅ Plan, ADR, contrato. Addon: `restaurant.table.waiter_call/_at`.
   Registro: `Restaurant.brand_*` + derivación de contraste. Experiencia:
   `marca` en el contexto, `llamar/`, `cuenta/`, `ordering` al abrir sesión,
   limpieza al confirmar; adaptador `set_table_call`. POS: lee las llamadas
   y las pinta; alerta "Mesa pide mesero"; cobrar/atender las limpia.
2. ✅ `diner/`: andamiaje (proxy a `experience`, tokens `--w-*` fijos + `--r-*`
   por restaurante, i18n es, PWA), cliente de API, stores, componentes base
   (`Header`, `OrderBar`, `DishCard`, sello Waiter) y **Portada**.
3. ✅ **Carta** (categorías, búsqueda, tarjetas) y **Plato** (detalle, nota,
   cantidad, agregar).
4. ✅ **Pedido** (carrito compartido: la mesa / lo mío, editar, quitar,
   confirmar con manejo de "el restaurante no responde") y **Estado**
   (enviado → en cocina → listo → servido, sondeo; "pedir más").
5. ✅ **Llamar al mesero** y **Pedir la cuenta** (resumen todo / lo mío /
   dividir; "Pagar desde el celular · pronto"); estados en el POS de punta a
   punta.
6. ✅ Revisión adversarial por pantalla, E2E comensal ↔ POS, docs, PR.

Fuera: pasarela (decisión pendiente), Mesero IA (la línea del mesero es texto
del restaurante), modo offline, notificaciones push, varios idiomas.
