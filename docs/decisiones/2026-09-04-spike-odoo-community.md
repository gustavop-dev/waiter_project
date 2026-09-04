# Spike: ¿qué alcance real nos da Odoo Community?

- **Fecha:** 2026-09-04
- **Tipo:** spike (investigación; el código de prueba es desechable)
- **Pregunta:** ¿Odoo Community nos ahorra trabajo real como motor operativo de
  ProjectApp Smart Restaurant, o nos lo cobra en fricción?
- **Método:** Odoo 19 Community oficial en Docker (`odoo:19` + `postgres:16`),
  base inicializada con `point_of_sale, pos_restaurant, pos_self_order,
  pos_online_payment, pos_online_payment_self_order, pos_loyalty, l10n_co,
  l10n_co_pos, stock, sale_management` (86 módulos instalados). Inventario de
  manifiestos leído del contenedor y prueba end-to-end contra los endpoints HTTP.

> **Todo lo afirmado aquí está verificado contra la imagen o contra la instancia
> corriendo.** Las fuentes de terceros (blogs de partners) se contradicen entre
> sí y varias resultaron equivocadas.

---

## Veredicto

**Sí, adoptar Odoo Community como motor operativo.** Cubre completa la mitad
*commodity* del producto y —hallazgo inesperado— **ya trae construido el
mecanismo de identificación de mesa que describe la visión**. La mitad
diferenciadora (Mesero IA, NFC, analítica de ROI, DIAN) hay que construirla de
todos modos, con Odoo o sin él.

La forma recomendada es **Odoo headless**: usarlo como backend de datos y
operación, y construir nuestra propia PWA contra sus endpoints públicos, sin
adoptar su frontend.

---

## Hallazgo principal: el NFC ya existe

`pos_self_order` añade a `restaurant.table` un campo `identifier`:

```python
identifier = fields.Char(
    "Security Token", copy=False, required=True,
    default=lambda self: self._get_identifier(),
)

@staticmethod
def _get_identifier():
    return uuid.uuid4().hex[:8]
```

Son **8 caracteres**, exactamente el formato `8H2KQ7` de la sección 4.1 de la
visión. Y la ruta de entrada ya acepta `table_identifier` como parámetro:

```python
@http.route(["/pos-self/<config_id>", "/pos-self/<config_id>/<path:subpath>"],
            auth="public", website=True, sitemap=True)
def start_self_ordering(self, config_id=None, access_token=None,
                        table_identifier=None, subpath=None):
```

Lo único que falta de nuestro lado es el acortador
`restaurant.projectapp.co/t/<id>` → URL de Odoo.

---

## Prueba end-to-end (ejecutada, sin autenticación)

Simulando el celular de un comensal que acaba de tocar el NFC de la mesa 14:

```text
1. GET  /pos-self/4?table_identifier=3fb46005          -> HTTP 200
2. RPC  /pos-self/data/4                               -> carta completa
       37 modelos, 26 productos, 25 mesas, categorías,
       impuestos, combos, atributos, listas de precios
3. RPC  /pos-self-order/process-order/mobile/           -> pedido creado
```

Pedido resultante, verificado en base de datos:

```text
 id | pos_reference | tracking | state | total | source | mesa | piso
 13 | 260-4-000009  | S9       | draft | 35.65 | mobile |  14  | Main Floor

 línea: 2.00 | Bacon Burger | "Sin cebolla, termino medio" | 35.65
```

**Un dispositivo anónimo carga la carta y crea un pedido asociado a la mesa
correcta, con notas del comensal.** El servidor recalcula los precios
(`recompute_prices()`) e ignora los que manda el cliente, así que el frontend no
puede manipular importes.

---

## Qué trae Community (verificado)

**685 módulos, todos con licencia `LGPL-3`. Sin una sola excepción.**

Esto responde la pregunta de licencia: LGPLv3 —no AGPL— permite **operar un SaaS
sobre Odoo y mantener cerrados nuestros módulos propios**, siempre que no sean
obras derivadas del código GPL.

| Necesidad (visión) | Módulo Community | Estado |
|---|---|---|
| Productos, categorías, precios | `point_of_sale` | ✅ |
| Modificadores ("sin cebolla") | `product.attribute` + `customer_note` | ✅ probado |
| Combos | `product.combo`, `product.combo.item` | ✅ |
| Mesas y pisos | `pos_restaurant` | ✅ 25 mesas en la demo |
| Identificador único por mesa | `restaurant.table.identifier` | ✅ 8 hex |
| Dividir cuenta | `pos_restaurant` → `SplitBillScreen` | ✅ (lado mesero) |
| Tiempos / courses | `restaurant.order.course` | ✅ |
| Self-order QR/móvil | `pos_self_order` | ✅ probado |
| API pública sin login | `auth="public"` JSON-RPC | ✅ probado |
| Fidelización | `pos_loyalty` | ✅ (los blogs dicen que no; sí está) |
| Inventario, multiempresa | `stock`, `base` | ✅ |

---

## Los huecos reales (confirmados por ausencia en el inventario)

| Falta | Módulo ausente | Consecuencia |
|---|---|---|
| **KDS de cocina** | `pos_preparation_display` | Es Enterprise. Comprar a terceros o construirlo. |
| **Facturación DIAN** | `l10n_co_dian`, `l10n_co_edi` | Community solo trae `l10n_co` (contable) y `l10n_co_pos`. Confirma la ruta de motor fiscal externo (FacturaLatam). |
| **Pasarelas Colombia** | — | Hay Stripe, Mercado Pago, PayU, Adyen. **No hay Wompi, Bold ni Nequi.** Integración propia. |
| **IoT / impresoras** | `pos_iot` | Es Enterprise. Impresión de comandas por otra vía. |

Y, evidentemente, **todo lo diferenciador es nuestro**: Mesero IA por voz, capa
NFC, dashboard de ROI, A/B testing, métrica de horas por 100 pedidos.

---

## Riesgo de seguridad detectado

`/pos-self/data/<config_id>` devuelve **las 25 mesas con sus `identifier`** a
cualquiera que tenga el `access_token` de la configuración del POS:

```text
mesas expuestas: 25
   - mesa 1 identifier=22ee9012
   - mesa 2 identifier=4033c06d
   ...
```

Como el `access_token` es el mismo para todo el restaurante, **quien escanee una
sola mesa obtiene el identificador de todas las demás** y puede pedir a cargo de
cualquiera. Para el modelo NFC-por-mesa de la visión esto hay que cerrarlo en
nuestra capa.

---

## Lo que quedó sin verificar

**El pago autónomo.** La ruta `/pos/pay/<order_id>` existe y es `auth="public"`,
pero devolvió **HTTP 403** en nuestra instancia. Confirmamos que no hay ningún
`payment.provider` habilitado (`[]`) ni método de pago self-order configurado,
pero **no aislamos si el 403 viene de eso o del control de acceso al token**.
Queda pendiente para el siguiente spike, con una pasarela real configurada.

---

## Decisiones que este spike NO resuelve

1. **Multi-tenant.** ¿Multiempresa de Odoo en una sola base, o una base por
   restaurante? Define el costo marginal por cliente y la velocidad de
   onboarding. Es la siguiente decisión cara.
2. **Costo organizacional.** El equipo trabaja en Django + Next.js. Adoptar Odoo
   introduce un segundo paradigma de backend (ORM de Odoo, OWL, ciclo de vida de
   módulos). El ahorro en funcionalidad es real; el costo en curva de aprendizaje
   y mantenimiento también. Hay que decidirlo con los ojos abiertos.
3. **Versión.** Probamos 19. Conviene revisar el calendario de soporte antes de
   fijarla.

---

## Cómo reproducir

El entorno es **desechable** y vive fuera del repo, en el scratchpad de la
sesión (`odoo-spike/`): `docker-compose.yml`, `audit_addons.py`, `setup.py`,
`e2e_test.py`, `e2e_order.py`.

```bash
docker compose up -d
# UI en http://localhost:8069  (usuario admin / clave admin, datos demo)
docker compose down -v          # destruir todo
```
