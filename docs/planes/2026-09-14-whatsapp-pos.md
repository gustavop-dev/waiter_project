# WhatsApp → POS y cocina

Primera entrega: puente interno de pedidos para recoger. La pasarela se deja para
después por decisión del usuario. Este corte no conecta Meta, no envía mensajes y
no invoca un modelo de IA; permite probar primero la operación que utilizará el agente.

## Recorrido implementado

WhatsApp (siguiente etapa) → Experience → Odoo → pantallas existentes de Pedidos y KDS.
El navegador del POS no necesita estar abierto. Sí debe existir una caja abierta;
el canal no abre cajas por su cuenta. Cada número de Meta deberá quedar vinculado
a una sede en el servidor: el modelo no podrá elegir restaurante ni credenciales.

- Carta desde Odoo; precio mostrado por catálogo orientativo. La cotización aplica
  lista de precios e impuestos reales del preset para recoger.
- Borrador persistente en Experience, con cliente, teléfono internacional,
  cantidades y notas. No crea mesa ni pedido en Odoo al cotizar.
- Resumen válido durante 10 minutos. Confirmación explícita del resumen exacto.
  Si cambian precios/impuestos/productos, se rechaza y hay que presentar otro resumen.
- Confirmación atómica en Odoo: pedido de origen IA y canal WhatsApp, nombre
  `WhatsApp · <cliente>`, tipo para recoger y una comanda al KDS.
- `state=draft`, sin pagos ni llamadas a una pasarela. El personal cobra con el POS.
- Reintentos conservan UUID. Odoo recupera incluso pedidos ya pagados o cancelados
  sin recrearlos; rechaza reutilizar la referencia con datos diferentes.
- Consulta del estado desde Odoo: enviado, en cocina, listo, entregado, pagado o cancelado.

## API interna

Todas las rutas requieren `X-Internal-Key` de `EXPERIENCE_INTERNAL_KEY`.
No exponer esa clave en el frontend, mensajes, prompts ni llamadas de herramientas del modelo.
La autenticación por cookie de comensal no concede acceso a estas rutas.

Base: `/internal/v1/<restaurante>/<sede>/whatsapp/`

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `catalogo/` | Leer catálogo; no abrir caja |
| POST | `pedidos/` | Cotizar y guardar borrador |
| GET | `pedidos/<uuid>/` | Consultar resumen y estado |
| POST | `pedidos/<uuid>/confirmar/` | Confirmar resumen y enviar a cocina |

Crear:

```json
{
  "idempotencia": "b509eb8e-f202-47d0-9a58-7546e080031a",
  "cliente": {"nombre": "Ana", "telefono": "+573001234567"},
  "lineas": [{"producto": 7, "cantidad": 1, "nota": "Sin cebolla"}]
}
```

Confirmar con `{"confirmado": true, "cotizacion": "<resumen.cotizacion>"}`.
La integración solo debe enviar `confirmado=true` después de aceptación del cliente.
La IA nunca proporciona precios, impuestos, descuentos o estados de pago.
Una nueva composición usa nueva idempotencia; repetir la anterior recupera el borrador
original. Ante timeout se reintenta la misma referencia, no se crea otra.

## Probar en desarrollo

Actualizar `projectapp_ops` en Odoo (ahora depende explícitamente de
`projectapp_kitchen`) y ejecutar `experience/venv/bin/python manage.py migrate`
desde `experience/`. Reiniciar los procesos de Odoo después de la actualización.

Desde `experience/`, cotizar con un producto real de la carta:

```bash
venv/bin/python manage.py demo_whatsapp_order burger-house poblado 7
```

Añadir `--confirmar` envía una comanda real de demostración sin cobrar.
Para repetir, usar `--referencia <idempotencia>` con los mismos datos.
El nombre predeterminado es `Demo WhatsApp`; no se contacta ningún teléfono.

## Límites de este corte y siguiente entrega

Productos simples y cantidades enteras: los combos y productos con atributos
requieren atención humana por ahora. Se validan existencia, venta, categoría de sede,
compañía y stock de productos almacenables. La validación de disponibilidad por
recetas compartidas y la reserva de ingredientes entre canales están pendientes.
No prometer tiempos de preparación automáticos.

Siguiente entrega: cuenta/número de WhatsApp por sede, verificación del webhook y
firma de Meta, bandeja persistente con deduplicación por mensaje, procesamiento en
segundo plano y cola de respuestas, conversación por cliente, adaptador OpenAI con
herramientas de catálogo/cotización/confirmación, consumo por local y relevo humano.
La autorización de confirmación deberá vivir fuera del modelo. Después: domicilios
con zonas y tarifa verificadas, estados por WhatsApp y finalmente pasarela de pago.

Pruebas: API interna (acceso, aislamiento, precios no aceptados del cliente,
confirmación y recuperación tras timeout); runner de Odoo en una copia aislada
(cotización sin escrituras, impuestos, precio cambiado, caducidad, stock,
idempotencia tras pago, caja cerrada y rollback si falla cocina).

## Verificación del 14 de septiembre

- 9 pruebas nuevas de Experience pasan; 8 de Odoo pasan en copia aislada.
- 8 pruebas de servicio/detalle del POS pasan; TypeScript sin errores.
- Suite general Experience: 174 pasan, 11 fallan en pruebas de plantillas que todavía
  esperan B1/galería aunque la implementación previa usa S1 (Smart Menu).
- Demostración local: pedido Odoo 508, referencia visible TA417, cliente
  `WhatsApp · Demo WhatsApp`, Bowl de salmón, COP 51.051 con impuestos y pago cero.
  Verificado en navegador en `/pedidos`, con teléfono y etiqueta WhatsApp, sin errores JS.
- API HTTP real: catálogo y estado responden 200 con clave; 401 sin clave.
- Respaldo de Odoo y Experience antes de actualizar en `/tmp/waiter-dev/backups/`.
  Evidencia visual: `/tmp/waiter-dev/whatsapp-pos.png`; runner Odoo:
  `/tmp/waiter-dev/whatsapp-odoo-tests.log`.

Continuación: [conexión Meta y planificador IA](2026-09-14-meta-agente.md).
