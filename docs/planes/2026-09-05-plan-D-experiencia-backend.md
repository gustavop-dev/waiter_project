# Plan D — Bloque 3 (backend del comensal) + registro central mínimo

> **Para agentes:** ejecutar tarea por tarea, en orden, con el ciclo de cada
> tarea completo (test que falla → implementación mínima → test que pasa →
> commit). Los pasos usan `- [x]`. Cada tarea deja software probado y
> commiteado por sí sola.

**Objetivo:** que una URL pública de mesa (`/burger-house/poblado/t/8H2KQ7`)
resuelva a un inquilino, sirva su carta desde caché, permita a varios
comensales sin registro armar un carrito compartido con atribución por
persona, confirme el pedido en Odoo de forma idempotente (y lo dispare a
cocina) y devuelva su estado. **Sin frontend**: la API es el contrato sobre
el que después se construyen la PWA y el Mesero IA.

**Arquitectura:** dos servicios Django con base propia (sqlite en dev, como
la plantilla): `registry/` resuelve URL → inquilino + credenciales por un
endpoint interno con clave compartida; `experience/` sirve la API pública y
solo conoce Odoo a través de `adaptadores/odoo` y al registro a través de
`adaptadores/registro`. Ver `docs/arquitectura/2026-09-04-bloque-3-experiencia.md`
y el ADR `docs/decisiones/2026-09-05-registro-minimo-tokens-y-credenciales.md`.

**Stack:** Python 3.12 (VM; plantilla 3.14.7, ver ADR) · Django 6.1 · DRF
3.18.0 · django-cors-headers 4.9.0 · python-dotenv · requests · cryptography
(solo registro) · pytest 9.1.1 + pytest-django 4.14.0 + freezegun · ruff.
Sin JWT, silk, huey, thumbnails ni MySQL: no hay usuarios ni tareas en esta
etapa.

**Spec:** bloque 3 (contrato de API, modelo de datos, errores) ·
arquitectura modular (reglas de dependencia) · mapeo de la API de Odoo
(`docs/arquitectura/2026-09-04-mapeo-api-pos.md`) · ADR cocina sobre cursos.

## Alcance y lo que queda fuera

Dentro: registro con restaurantes, sedes, tokens de mesa y credenciales
cifradas; comando de siembra que apunta al Odoo del compose; API pública del
bloque 3 completa según el contrato (contexto + carta, sesiones, carrito con
atribución, confirmación idempotente, estado del pedido); caché de carta con
TTL e invalidación; contratos contra Odoo real.

Fuera: pasarela de pago (`pagos/` queda como carpeta vacía con README: hoy
*confirmar* envía a Odoo; cuando exista pasarela, *confirmar* pasa a
"reservar" y el envío se hace al `pago aprobado`), Mesero IA, facturación,
PWA, rotación de clave Fernet, límite de tasa por token, bus en tiempo real,
Postgres/Redis en dev (sqlite + locmem; prod por variables de entorno).

## Restricciones globales

- **Regla de dependencia:** nada fuera de `experience/adaptadores/odoo`
  importa `requests` hacia Odoo ni conoce `call_kw`; nada fuera de
  `experience/adaptadores/registro` conoce la URL del registro. El registro no
  importa nada de `experience/`.
- **Las horas las pone el servidor**; los precios los pone Odoo
  (`recompute_prices`), nunca el cliente.
- **Idioma:** código e identificadores en inglés; rutas y JSON de la API
  pública en español (es el contrato con el frontend del comensal, en
  español); docs en español; commits Conventional Commits en inglés.
- **Tests:** ≤50 líneas, ≤7 asserts, sin condicionales, docstring de una
  línea que diga qué bug atrapa; `tests/` por carpeta (`models`, `services`,
  `views`, `adapters`). Contratos marcados `@pytest.mark.contract` y
  excluidos por defecto; corren con `-m contract` contra el Odoo del compose
  y **fallan** si no responde. Nunca la suite completa: por carpeta.
- **Puertos:** registro `192.168.56.10:8002`, experiencia `192.168.56.10:8001`.

## Interfaces

### Registro — `GET /internal/v1/resolve/<rest>/<sede>[/t/<token>]`

Cabecera `X-Internal-Key`. 401 sin clave, 404 si no existe o está inactivo.

```json
{
  "restaurant": {"slug": "burger-house", "name": "Burger House"},
  "venue": {"slug": "poblado", "name": "Poblado"},
  "table": {"token": "8H2KQ7", "number": 8, "odoo_table_id": 9},
  "odoo": {"url": "http://192.168.56.10:8069", "db": "projectapp", "login": "admin", "password": "…", "pos_config_id": 1}
}
```
`table` es `null` en la entrada de domicilio.

### Experiencia — API pública `/api/v1`

```text
GET  /api/v1/<rest>/<sede>                 contexto + carta (domicilio)
GET  /api/v1/<rest>/<sede>/t/<token>       contexto + carta (mesa)
POST /api/v1/sesiones                      {restaurante, sede, token?} → sesión + comensal; cookie waiter_diner
GET  /api/v1/sesiones/<id>/carrito         líneas abiertas con comensal; totales: total, por_comensal[], mio
POST /api/v1/sesiones/<id>/lineas          {producto_id, cantidad, nota?}
PATCH/DELETE /api/v1/sesiones/<id>/lineas/<lid>   solo el comensal dueño
POST /api/v1/sesiones/<id>/confirmar       → Odoo (uuid idempotente) → cocina; 503 conserva el carrito
GET  /api/v1/pedidos/<id>                  {estado: enviado|en_cocina|listo|servido|pagado|fallido, total}
POST /internal/v1/carta/<rest>/<sede>/invalidar   (clave interna) vacía la caché de esa sede
```

### Python (firmas que las tareas comparten)

```python
# experience/adaptadores/registro/client.py
@dataclass(frozen=True) class Tenant: restaurant_slug, restaurant_name, venue_slug, venue_name, table_token, table_number, odoo_table_id, odoo: OdooCredentials
def resolve(rest: str, venue: str, token: str | None) -> Tenant          # TenantNotFound
# experience/adaptadores/odoo/client.py
class OdooClient: __init__(creds); call_kw(model, method, args, kwargs=None)
def load_catalog(client, pos_session_id) -> Catalog                      # products, categories (misma forma que pos/)
def ensure_open_session(client, config_id) -> int
def create_order(client, *, pos_session_id, table_id, uuid, guests, lines) -> OdooOrder   # sync_from_ui + recompute_prices + read
def fire_course(client, order_id) -> int | None                           # kitchen_fire de projectapp_kitchen
def read_order_status(client, order_id) -> OrderStatus                    # state + fase de cocina por cursos
# experience/catalogo/services.py
def get_menu(tenant) -> dict   # caché 60 s por sede; invalidate_menu(rest, venue)
# experience/sesiones/services.py
def open_session(tenant, diner_key) -> (TableSession, Diner)
def cart_view(session, diner) -> dict    # total, por_comensal, mio
def add_line / update_line / remove_line
# experience/pedidos/services.py
def confirm(session) -> Order            # idempotente por Order.uuid; OdooUnavailable → Order.state='failed'
def order_status(order) -> dict
```

## Estado: ejecutado el 2026-09-05 (rama `feat/05092026-experience`)

Desvíos respecto al plan, todos menores:

- Rutas con barra final (`/api/v1/sesiones/<id>/carrito/`), convención del fleet.
- **Un `pos.order` por sesión de mesa**, no uno por confirmación: cada
  confirmación re-sincroniza todas las líneas bajo el mismo uuid (Odoo
  actualiza) y dispara un curso solo con lo nuevo. Así el salón ve una sola
  cuenta por mesa y "pedir más" es otra comanda, como pide el bloque 3.
- `Tenant` lleva `odoo_table_id` y `table_number`; la respuesta pública usa
  `mesa.numero`.
- Los contratos deben leer la carta real (`catalog.get_catalog`): un stub con
  ids de producto/impuesto inventados hace fallar `sync_from_ui`.
- `settings.py` de ambos servicios falla cerrado en producción sin secreto
  real o con DEBUG (hallazgo de la revisión de seguridad del commit).

## Tareas

### Tarea 1 — Andamiaje de los dos servicios
`registry/` y `experience/`: `manage.py`, `<proyecto>/settings.py` (recorte de la plantilla: DRF sin auth, CORS, sqlite por `DJANGO_DB_ENGINE`, caché locmem por `DJANGO_CACHE_URL`), `settings_dev.py`, `urls.py` con `api/health/`, `requirements.in` + `requirements.txt` congelado, `.env.example`, `.gitignore`, `pytest.ini`, `ruff.toml`, `README.md`. Venv en `<servicio>/venv` (ignorado). Test: `api/health/` responde `{"status":"ok","project":...}` en cada uno.

### Tarea 2 — Registro: modelos, cifrado, resolución y siembra
`registry/registry_app/models/{restaurant,venue,table_token}.py`, `utils/crypto.py` (Fernet), `utils/tokens.py` (alfabeto sin ambiguos), `views/resolve.py`, `urls/`, `management/commands/seed_demo.py` (crea `burger-house/poblado` sobre el Odoo del compose y un token por mesa leyendo `restaurant.table` por JSON-RPC; imprime las URLs). Tests: unicidad `(venue, token)`, ida y vuelta del cifrado, generador sin caracteres ambiguos, resolve 200/401/404.

### Tarea 3 — Experiencia: adaptadores
`adaptadores/registro/client.py` (caché de `Tenant` 120 s), `adaptadores/odoo/client.py` con las funciones de arriba, portadas del TypeScript que ya funciona (`pos/lib/services/*`). Tests unitarios con `requests` parcheado (forma del payload de `sync_from_ui`, `kitchen_fire` solo con líneas sin curso) y **contrato** `tests/contract/test_odoo.py`: cargar carta, abrir sesión, crear pedido con el mismo uuid dos veces → mismo id, disparar curso, leer estado.

### Tarea 4 — Catálogo y sesiones
`catalogo/services.py` (normaliza la carta: categorías con productos, precio, agotado; caché por sede), `sesiones/models/{table_session,diner,cart_line}.py`, `sesiones/services.py`, vistas y urls de contexto, sesiones, carrito y líneas; cookie `waiter_diner`. Tests: totales por comensal (todo / lo mío / división), reutilización de sesión por cookie, solo el dueño edita su línea, caché acierta y se invalida.

### Tarea 5 — Pedidos: confirmación idempotente y estado
`pedidos/models/order.py`, `pedidos/services.py`, vistas. Tests con el adaptador parcheado: primera confirmación crea Order + llama Odoo con el uuid; reintento tras fallo reutiliza el uuid; reintento tras éxito devuelve el mismo pedido sin llamar a Odoo; Odoo caído → 503 y las líneas siguen abiertas; mapa de estados.

### Tarea 6 — Recorrido completo, docs y PR
Script `scripts/demo-comensal.sh` con `curl` que recorre el flujo contra los dos servicios levantados; actualizar arquitectura (pendientes), README raíz (cómo levantar los tres servicios), este plan (checks) y PR apilado sobre #2.
