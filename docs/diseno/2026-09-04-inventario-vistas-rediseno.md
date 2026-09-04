# Inventario de vistas para el rediseño

- **Fecha:** 2026-09-04
- **Base:** Odoo 19 Community, inventariado contra el código y la instancia real
- **Sistema de diseño:** *Operational Minimalism* (operador) y *Hospitality
  Skeuomorphism* (comensal)

## Resumen ejecutivo

Odoo aporta **el POS y el CRUD del catálogo**. Prácticamente **todo lo que tu
sistema de diseño describe para el operador no existe** y hay que construirlo:
el dashboard de ROI, la analítica de automatización, la analítica de IA, la
configuración del Mesero IA, el mapa de mesas con estados, las alertas por
excepción y el KDS de cocina.

| Superficie | Qué hay en Odoo | Qué hay que hacer |
|---|---|---|
| POS (mesero, cajero) | 10 pantallas + ~20 componentes | **Rediseñar** |
| Backoffice (administrador) | 5 secciones, "Configuración" desordenada | **Reorganizar y rediseñar** |
| Pantalla al cliente | Existe (`customer_display`) | Rediseñar |
| Dashboard de ROI | **No existe** | Construir |
| Analítica de automatización e IA | **No existe** | Construir |
| Configurar Mesero IA | **No existe** | Construir |
| Mapa de mesas con 9 estados | Existe con menos estados | Extender y rediseñar |
| Alertas por excepción | **No existe** | Construir |
| KDS de cocina | **No existe** (es Enterprise) | Construir |
| Facturación DIAN | **No existe** en Community | Construir (bloque 2) |
| Experiencia del comensal | **No existe** | Construir (bloque 3) |

---

## Cómo se rediseña Odoo (y por qué es viable)

El propio `pos_restaurant` rediseña las pantallas de `point_of_sale` con el
mismo mecanismo que usaríamos nosotros:

```xml
<t t-inherit="point_of_sale.ProductScreen" t-inherit-mode="extension">
<t t-inherit="point_of_sale.Navbar"        t-inherit-mode="primary">
```

```js
patch(ProductScreen.prototype, { ... })
```

Verificado en el código: 17 herencias en modo `extension` y una en modo
`primary`. **El modo `primary` reemplaza la plantilla completa**, así que se
puede rediseñar desde retocar el estilo hasta sustituir una pantalla entera.

Tres niveles de intervención, de menor a mayor coste:

1. **Solo CSS** (variables, tipografía, espaciado, color). Barato, sobrevive
   bien a las actualizaciones.
2. **`t-inherit` en modo `extension`**: mover, quitar o añadir elementos dentro
   de una pantalla existente.
3. **`t-inherit` en modo `primary` + `patch()`**: reemplazar la pantalla.
   Máximo control, máximo mantenimiento en cada actualización de Odoo.

---

## A. POS — mesero y cajero

Inventario real de `point_of_sale/static/src/app/screens/`:

| Pantalla | Quién la usa | Prioridad de rediseño |
|---|---|---|
| `floor_screen` | Mesero | **Alta.** Es la pantalla de entrada. Tu spec pide 9 estados de mesa; Odoo maneja menos. |
| `product_screen` | Mesero, cajero | **Máxima.** Es donde se pasa el 80% del turno. Contiene `action_pad`, `control_buttons`, `order_summary`. |
| `payment_screen` | Cajero | **Alta.** Incluye `payment_lines` y `payment_status`. |
| `receipt_screen` | Cajero | Media |
| `ticket_screen` | Cajero | Media. Historial de órdenes. |
| `split_bill_screen` | Mesero | **Alta.** Conecta con "Pagar lo mío / Dividir". |
| `tip_screen` | Cajero | Media. Propina. |
| `login_screen` | Todos | Baja |
| `partner_list` | Cajero | Baja |
| `feedback_screen`, `saver_screen`, `scale_screen`, `action_screen` | — | Baja |

### Componentes reutilizables

Rediseñar estos rinde más que rediseñar pantallas, porque se usan en todas:

| Componente | Por qué importa |
|---|---|
| `navbar` | Presente en todas las pantallas |
| `product_card` | Densidad, foto, precio. Núcleo visual del POS |
| `category_selector` | Navegación de la carta |
| `orderline` / `order_display` | La comanda en curso |
| `numpad` | Objetivo táctil: tu spec pide mínimo 44 px |
| `buttons`, `inputs` | Base de todo |
| `popups` | Diálogos y confirmaciones |
| `order_tabs` | Órdenes simultáneas |
| `payment_method_breakdown` | Desglose de pago |
| `price_formatter` | Números tabulares, según tu spec |
| `loader`, `validation_animation` | Movimiento y estados |

### Diagnóstico contra el sistema de diseño

- **Objetivos táctiles**: hay que auditar los 44 px mínimos en `numpad` y
  `product_card`.
- **Números tabulares**: `price_formatter` es el punto único donde imponerlos.
- **Color semántico**: Odoo usa color decorativo; tu spec lo reserva para estado.
- **Densidad**: `product_screen` es densa; tu spec pide densidad media con
  jerarquía clara.

---

## B. Backoffice — administrador

Menú actual bajo *Punto de venta*:

```text
Tablero · Órdenes · Productos · Reportes · Configuración
```

**"Configuración" es un cajón de sastre** con unas veinte entradas, y hay
**"Órdenes" y "Productos" duplicados** en distintos niveles. Comprobado en la
instancia.

Tu spec pide esta agrupación de barra lateral:

```text
Operación · Ventas · Catálogo · Inventario · Clientes ·
Automatización · Facturación · Configuración
```

De esas ocho, Odoo cubre parcialmente cinco. **Automatización y Facturación no
existen**, y *Operación* (el tiempo real) tampoco.

### Vistas del backoffice a rediseñar

| Vista | Modelo | Prioridad |
|---|---|---|
| Lista y ficha de producto | `product.template` | **Alta.** Es donde se carga la carta. |
| Categorías de PdV | `pos.category` | Alta |
| Atributos y variantes (modificadores) | `product.attribute` | **Alta.** Son "sin cebolla", "término medio". |
| Combos | `product.combo` | Media |
| Mapas de piso y mesas | `restaurant.floor`, `restaurant.table` | **Alta** |
| Órdenes | `pos.order` | Media |
| Sesiones de caja | `pos.session` | Baja (la abre el sistema) |
| Métodos de pago | `pos.payment.method` | Media |
| Listas de precios | `product.pricelist` | Media |
| Ajustes del PdV | `pos.config` | **Alta.** Muy denso. |

---

## C. Lo que no existe y hay que construir

Esta es la parte grande, y es **producto propio, no rediseño**.

### Para el operador

| Vista | Qué es | Origen |
|---|---|---|
| **Dashboard de ROI** | Bento con ahorro laboral, ventas por IA, coste y valor neto | Tu spec, sección `dashboard` |
| **Analítica de automatización** | Tasa de pedidos y pagos autónomos, intervenciones evitadas, horas ahorradas | Tu spec |
| **Métrica norte** | Horas de atención por cada 100 pedidos, antes y después | Tu spec |
| **Analítica de IA** | Sesiones, recomendaciones aceptadas, conversión de upsell, ticket con y sin IA | Tu spec |
| **Operación en vivo** | Mesas, pedidos, cocina, pagos, solicitudes de asistencia | Tu spec |
| **Mapa de mesas con 9 estados** | libre, ocupada, pidiendo, enviado, preparando, servido, pago pendiente, pagado, necesita ayuda | Tu spec |
| **Alertas por excepción** | Mesa llama al mesero, pedido demorado, pago rechazado, DIAN rechazó, producto agotado | Tu spec |
| **Configurar Mesero IA** | Nombre, tono, productos recomendados, reglas de upsell, alérgenos, afirmaciones prohibidas | Tu spec |
| **Facturación DIAN** | Estado, CUFE, errores | Bloque 2 |
| **Gerente en móvil** | Ventas, alertas, estado, sin replicar el escritorio | Tu spec |

### Para la cocina

**El KDS no existe en Community** (`pos_preparation_display` es Enterprise).
Tu spec lo define con detalle: alto contraste, plano, sin glassmorphism, con
número de orden, mesa, tiempo transcurrido, productos, modificadores, estado de
pago y prioridad. **Se construye de cero.**

### Para el comensal

Nada existe. Es el bloque 3 completo: inicio, Mesero IA por voz, carta
editorial, pedido, la cuenta, propina, pago, estado. Ver
[spec del bloque 3](../arquitectura/2026-09-04-bloque-3-experiencia.md).

---

## Orden sugerido

El criterio es horas de uso por pantalla, no dificultad.

1. **Fundamentos del POS**: variables de diseño, tipografía, color semántico,
   objetivos táctiles de 44 px, números tabulares. Toca todas las pantallas de
   golpe y es solo CSS.
2. **`product_screen` y sus componentes**: es donde el mesero pasa el turno.
3. **`floor_screen` con los 9 estados**: la puerta de entrada del mesero.
4. **`payment_screen` y `split_bill_screen`**: cierran el ciclo del cajero.
5. **Backoffice: catálogo y mesas**: donde se configura el restaurante.
6. **Reorganizar el menú del backoffice** según tus ocho grupos.
7. **KDS de cocina**: producto nuevo.
8. **Dashboard de ROI y analítica**: producto nuevo, y el mayor diferenciador
   comercial.

## Decisiones pendientes

- **Profundidad del rediseño del POS**: ¿solo CSS, o reemplazo de pantallas?
  Determina el coste de cada actualización de Odoo.
- **Dónde viven las vistas nuevas**: ¿como módulos de Odoo, o como aplicación
  propia contra la API? La arquitectura apunta a lo segundo, pero el KDS podría
  ir en cualquiera de las dos.
- **Cocina**: comanda impresa con `pos.printer` o KDS en pantalla.
