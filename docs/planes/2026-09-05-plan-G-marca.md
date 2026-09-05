# Plan G — Marca del restaurante editable desde el POS

> **Para agentes:** ejecutar tarea por tarea con el ciclo completo (test que
> falla → implementación mínima → test que pasa → commit). Reglas duras: el
> addon no lleva vistas; `diner/` no se toca (ya lee `contexto.marca`); el
> tema se deriva con las mismas reglas que `registry/registry_app/utils/brand.py`.

**Objetivo:** que un administrador del restaurante cambie desde el POS
(Configuración › Marca) lo que el diseño §06 declara suyo: logo, color de
acción, tipografía de títulos, redondeo, lema, saludo, nombre del mesero IA y
bienvenida; que quede guardado en Odoo; y que el comensal lo vea en ≤ 1
minuto. El registro conserva el valor inicial del onboarding como fallback.

**Arquitectura:** ver `docs/decisiones/2026-09-05-marca-desde-el-pos.md`.
`pos/` ↔ Odoo (`res.company` vía `projectapp_ops`) ← `experience/` (adaptador
de Odoo + registro) → `diner/`.

**Spec:** `docs/diseno/waiter-design-system.dc.html` sección **06 · Comensal
y white-label** ("Qué puede cambiar el restaurante" / "Cómo se implementa el
tema") · `docs/arquitectura/2026-09-04-bloque-3-experiencia.md` (endpoint
`logo/` y "Marca: precedencia Odoo > registro").

## Contrato entre bloques (fijo para todas las tareas)

**1. Odoo — addon `odoo/addons/projectapp_ops`, nuevo `models/company.py`,
`_inherit = 'res.company'`, SIN vistas:**

```python
FONTS = ['Instrument Serif', 'Playfair Display', 'Fraunces', 'DM Serif Display', 'Lora', 'Cormorant Garamond']

brand_color = fields.Char(size=7)            # '#RRGGBB' o vacío
brand_font = fields.Selection([(f, f) for f in FONTS])
brand_radius = fields.Selection([('4', 'Recto'), ('14', 'Suave'), ('24', 'Muy redondeado')])
brand_tagline = fields.Char(size=60)
brand_greeting = fields.Char(size=40)
brand_waiter_name = fields.Char(size=40)
brand_welcome = fields.Char(size=140)
brand_logo = fields.Binary(attachment=True)  # PNG/JPEG ráster; NUNCA SVG
```

- Todos vacíos por defecto. **Campo vacío en Odoo ⇒ se usa el valor del
  registro** (onboarding de ProjectApp). El nombre del restaurante es
  `res.company.name` (ya editable en Configuración › Restaurante).
- Escritura: solo administradores. Odoo ya restringe `write` en `res.company`
  al grupo *system*; el rol `admin` del POS es el que lo tiene.
- Lectura de la presencia del logo: `search_read` con
  `context={'bin_size': True}` devuelve el tamaño en vez del base64.

**2. `experience/`:**

```text
GET /api/v1/<rest>/<sede>/logo/?v=<versión>
```

- Sirve `brand_logo` como binario ráster (*sniff* PNG/JPEG/GIF; cualquier
  otra cosa ⇒ 404). Cabeceras iguales a `fotos/`: `nosniff`, CSP
  `default-src 'none'; sandbox`, `inline`, `Cache-Control` inmutable si `v`
  coincide y `no-store` si no.
- La versión = `write_date` de `res.company` compactado (`YYYYMMDDhhmmss`).
- En `contexto.marca`: `logo` = URL relativa
  `/api/v1/<rest>/<sede>/logo/?v=<versión>` si hay `brand_logo` en Odoo; si
  no, `logo_url` del registro o `null`.
- Caché de la marca: `settings.BRAND_CACHE_SECONDS` (env
  `BRAND_CACHE_SECONDS`, default 60). Los comensales ven un cambio en ≤ 1
  minuto.

**3. Precedencia por campo:** valor no vacío en Odoo > registro. El tema
(`colorTexto`, `colorSuave`, `contraste`) se deriva del color final con las
MISMAS reglas de `registry/registry_app/utils/brand.py` (tinta blanca o
`#1A1815` según contraste ≥ 4.5, suave = mezcla al 10 % sobre blanco, seis
fuentes, radios 4 | 14 | 24).

La forma de `contexto.marca` no cambia (`diner/lib/types.ts`, interfaz
`Brand`): `nombre`, `lema`, `logo`, `saludo`, `mesero`, `bienvenida`,
`color`, `colorTexto`, `colorSuave`, `fuente`, `radio`.

## Tareas

1. [x] **Addon + `experience/`.** `projectapp_ops/models/company.py` con los
   campos del contrato (sin vistas; test de que el manifiesto no declara
   vistas). Adaptador de Odoo: leer `brand_*` y `write_date` de la compañía,
   `bin_size` para la presencia del logo, lectura del binario para `logo/`.
   Servicio de marca: combinación campo a campo Odoo > registro, derivación
   del tema con las reglas de `utils/brand.py`, caché `BRAND_CACHE_SECONDS`.
   Endpoint `logo/` con las defensas de `fotos/` (test: un SVG devuelve 404).
   Test de paridad de la derivación contra `registry/registry_app/utils/brand.py`.
2. [x] **POS — Configuración › Marca** (solo `admin`; los demás roles no ven
   la entrada). Formulario con logo (PNG/JPEG, vista previa, quitar), color
   con contraste calculado y aviso si < 4.5, tipografía de la lista de seis
   con muestra, redondeo (recto / suave / muy redondeado), lema, saludo,
   nombre del mesero IA y bienvenida con contadores de longitud; "Usar el
   valor de ProjectApp" por campo (vacía el campo en Odoo). Guardar escribe
   en `res.company`; leer usa `bin_size`. Heroicons, next-intl, Zustand; copy
   según §07 (Voz). Tests unitarios de validación y del formulario.
3. [x] **Docs.** ADR `2026-09-05-marca-desde-el-pos.md`, este plan, bloque 3
   (endpoint `logo/`, precedencia, `BRAND_CACHE_SECONDS`), README raíz,
   aclaración en el ADR del comensal de que el registro guarda el valor
   inicial.
4. [ ] **Integración.** Actualizar el addon en Odoo (`-u projectapp_ops`),
   contrato de `experience/` contra Odoo real (`@pytest.mark.contract`), E2E
   Playwright de marca (un admin cambia color y nombre del mesero en el POS y
   el comensal lo ve en `diner/`; un mesero no ve Configuración › Marca),
   capturas para el inventario de vistas, PR.

## Notas de ejecución (2026-09-05)

- Se parte de la rama del comensal (`feat/05092026-comensal`, PR #11): el
  comensal ya pinta `contexto.marca`, así que el Plan G no toca `diner/`.
- Las tareas 1 a 3 corren en paralelo por agentes en worktrees con el
  contrato de arriba fijado de antemano; la 4 la hace el orquestador tras
  integrar (los servicios de desarrollo son compartidos: nadie reinicia Odoo
  ni actualiza el addon desde un worktree).
- La derivación del tema queda duplicada a propósito en `registry/` y
  `experience/` (no comparten código); el test de paridad es lo que impide
  que se separen.
- El logo se guarda como `Binary(attachment=True)` para que viva en
  `ir.attachment` (filestore) y no infle la fila de `res.company`; la versión
  sale de `write_date`, que Odoo actualiza al escribir cualquier campo de la
  compañía, así que un cambio de color también renueva la URL del logo. Es
  un sobrecoste aceptable: una descarga de más por cambio.

## Fuera

- Fotos de portada del restaurante: el diseño §06 las menciona entre lo
  "suyo"; se dejan para después (hoy solo hay fotos de platos).
- Varios idiomas del comensal (el saludo y la bienvenida son un solo texto).
- Sincronizar de vuelta al registro lo que el restaurante cambia.
