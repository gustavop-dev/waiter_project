# ADR — La marca del restaurante se edita desde el POS y vive en Odoo

**Fecha:** 2026-09-05 · **Estado:** aceptada · **Afecta a:** `projectapp_ops`
(nuevo `models/company.py`), `experience/`, `pos/` (Configuración › Marca),
`registry/` (sin cambios de modelo)

## Contexto

El sistema de diseño (`docs/diseno/waiter-design-system.dc.html`, sección
**06 · Comensal y white-label**) fija con precisión qué es del restaurante y
qué es de Waiter. Suyo: logo y nombre en el encabezado, **un** color de
acción validado a 4.5:1 automáticamente, la tipografía de títulos de una
lista curada de seis, las fotos, el saludo, el nombre del mesero IA y el
texto de bienvenida, y el redondeo (recto, suave o muy redondeado). Nuestro:
la estructura y el flujo de pedido, los tamaños de toque y la escala
tipográfica, los colores semánticos, la barra de pedido fija, la pantalla de
pago, toda la app de operación y el sello «Waiter by ProjectApp».

Hasta hoy esa marca la fija **ProjectApp** en el registro central
(`Restaurant.brand_*`, `tagline`, `greeting`, `waiter_name`, `logo_url`) al
hacer el onboarding, y llega al comensal como `contexto.marca` de la API del
bloque 3 (ADR [el comensal es una app aparte](2026-09-05-comensal-app-aparte.md),
punto 3). El restaurante no puede cambiarla: si quiere otro color o cambiar
el nombre del mesero tiene que pedírnoslo. El Plan F lo dejó anotado como
decisión pendiente del usuario: "quién edita la marca del restaurante".

## Decisión

1. **La marca vive en Odoo, en `res.company`**, extendida por el addon
   `projectapp_ops` (`models/company.py`) con campos `brand_*` y **sin
   vistas**, como manda la regla de Odoo headless. El nombre del restaurante
   es `res.company.name`, que ya se edita en Configuración › Restaurante.
   Todos los campos nacen vacíos.
2. **El registro conserva el valor inicial del onboarding y es el fallback
   campo a campo.** Un campo vacío en Odoo significa "usa lo del registro".
   Precedencia: valor no vacío en Odoo > registro. No hay sincronización de
   vuelta: el registro no se entera de lo que el restaurante cambió.
3. **`experience/` la sirve al comensal** en `contexto.marca`, leyendo Odoo
   por su adaptador, combinando con el registro y derivando el tema
   (`colorTexto`, `colorSuave`, `contraste`) del color final con las mismas
   reglas de `registry/registry_app/utils/brand.py`. La marca se cachea
   `BRAND_CACHE_SECONDS` (60 s por defecto): un cambio se ve en ≤ 1 minuto.
   El logo se sirve por `GET /api/v1/<rest>/<sede>/logo/?v=<versión>` con
   la versión en la URL (`write_date` de la compañía), igual que las fotos.
4. **El POS la edita en Configuración › Marca, solo para administradores,
   llamando `res.company.write_brand`** (addon `projectapp_ops`), nunca
   `write`. `write` sobre `res.company` exige `base.group_erp_manager`, que el
   rol `admin` del POS no tiene ni debe tener (abriría el resto de Odoo).
   `write_brand` exige `point_of_sale.group_pos_manager`, acepta solo la lista
   cerrada de campos `brand_*`, limpia y valida, y escribe con `sudo()` sobre
   la compañía del usuario. El POS valida lo mismo que el servidor: color
   `#RRGGBB` con contraste ≥ 4.5 contra su tinta, fuente de la lista de seis,
   radio 4 | 14 | 24, longitudes de los textos y logo PNG/JPEG de ≤ 2 MB.

## Alternativas descartadas

- **Editar el registro desde el POS.** El POS se autentica contra Odoo; el
  registro solo expone `/internal/v1` con clave de servicio a `experience/`.
  Dejar que el POS escriba en el registro exigiría una autenticación cruzada
  POS ↔ registro que no existe y que, además, haría al POS depender de un
  servicio que hoy no conoce. Va contra la arquitectura modular.
- **Guardarla solo en el registro** (como hasta ahora). El restaurante no
  podría cambiarla sin pasar por ProjectApp; contradice el §06 del diseño,
  que la declara "suya".
- **Guardarla solo en Odoo y quitar `brand_*` del registro.** Rompería el
  onboarding (el registro es donde ProjectApp deja la marca inicial antes de
  que exista un administrador en el POS) y perderíamos el fallback cuando
  la sede aún no tiene nada configurado.

## Consecuencias

- **Dos copias de la derivación de tema**, una en `registry/` y otra en
  `experience/`, ambas con las reglas de `utils/brand.py` (tinta blanca o
  `#1A1815` según contraste ≥ 4.5, suave = mezcla al 10 % sobre blanco, seis
  fuentes, radios 4 | 14 | 24). Se aceptan las dos copias porque los dos
  servicios no comparten código; un **test de paridad** en `experience/`
  compara la salida de ambas sobre la misma tabla de colores y falla si
  divergen.
- **Cambios visibles en ≤ 1 minuto** para el comensal, sin invalidación
  explícita: la caché de la marca es corta y el logo lleva la versión en la
  URL, así que el navegador lo vuelve a pedir cuando cambia.
- **El logo se sirve solo como ráster** (PNG/JPEG/GIF por *sniff* de bytes;
  cualquier otra cosa ⇒ 404), con las mismas defensas que `fotos/`:
  `X-Content-Type-Options: nosniff`, CSP `default-src 'none'; sandbox`,
  `Content-Disposition: inline`, `Cache-Control` inmutable si la versión
  coincide y `no-store` si no. **SVG rechazado** en el POS y en el servidor:
  un SVG servido como imagen desde el origen de la API permitiría XSS, como
  ya se encontró con las fotos en el Plan F.
- El registro sigue siendo la fuente de la marca **inicial**; sus docs y su
  `help_text` deben leerse así, no como "la marca del restaurante".
- Para saber si hay logo sin traer el base64, el POS y `experience/` usan
  `search_read` con `context={'bin_size': True}`: Odoo devuelve el tamaño en
  lugar del contenido.
