# Imágenes para las 30 plantillas de menú

Fuente completa (tal cual la entregó producto): [`2026-09-05-imagenes-menu.json`](2026-09-05-imagenes-menu.json).
Este resumen recoge lo que el código y la herramienta de generación hacen cumplir.

**Principio.** La foto es dato, no decoración: si no ayuda a decidir, no va. Una foto mala
vende menos que ninguna foto. Sin fotografía consistente, el restaurante usa una plantilla
sin imagen (A1, A2, A3, A5, B4, B5, C1, C4, D1, E1, E3, E5, F3, F4).

## Especificación técnica

| Regla | Valor |
|---|---|
| Formato | JPG calidad 85 (WebP si el CDN lo soporta), sRGB, ≤ 180 KB, lado largo ≥ 1600 px |
| Fondo | Uno solo para toda la carta: madera oscura mate o piedra clara |
| Luz | Lateral suave, una sola fuente, misma dirección en todas |
| Ángulo | 45° si el plato tiene altura; cenital 90° si es plano (pizzas, tablas, bandejas) |
| Encuadre | Plato completo con 8 % de aire; sin manos, cubiertos de utilería, servilletas ni humo |
| Porción | La que llega a la mesa: requisito legal y primera fuente de queja |
| Nombre | `{sku}_{recorte}.jpg` (`HAMB-ANGUS_4x3.jpg`) |
| Fuente de verdad | La ficha `product.template` de Odoo, nunca una carpeta suelta |

## Recortes

| Id | Uso | Píxeles | Nota |
|---|---|---|---|
| 4x3 | Rejilla de dos columnas y tarjeta del POS | 1200×900 | Debe funcionar a 160×120 |
| 1x1 | Miniatura de lista y ranking | 600×600 | Se ve a 52–58 px |
| 3x4 | Foto a sangre vertical (C2) y portada del menú | 1200×1600 | Tercio inferior libre: va texto encima |
| 3x2 | Cabecera de ficha de plato (A4) | 1500×1000 | Plato algo descentrado a la izquierda |
| 16x9 | Portada de local y pantalla de entrada | 1920×1080 | Ambiente, no plato |

## Estados sin foto

- Placeholder: bloque `#F2EEE8` con la proporción escrita en 11 px mayúsculas `#9A8F7E`.
  Nunca un icono de cámara roto.
- Si faltan fotos en más del 20 % de los platos, el sistema recomienda una plantilla sin foto.
- Agotado: la foto al 55 % de opacidad con la insignia encima; el plato no se oculta.

## Generación con IA

Sirve para maquetas y demos de ProjectApp, placeholders mientras llega la sesión de fotos,
bebidas y productos genéricos, y ambientes. **No** sirve para platos de firma, platos con
alérgenos o composición declarada, sushi y tablas con conteo de piezas, ni menús en operación.

- Modelo `gpt-image-1`, calidad `low` para placeholders y `medium` para demos comerciales;
  la foto se ve a 160×120 y la calidad alta no se nota. Alternativa: `dall-e-3` estándar.
- Una toma por plato y de ella salen los recortes; tres variantes por toma y se elige a mano.
- El bloque de estilo se copia palabra por palabra en todas las llamadas; una sola vajilla y
  una sola superficie por lote; el lote completo en la misma corrida.
- Prohibido pedir texto, manos, conteos exactos, logos o marcas, humo y salpicaduras.
- Postproceso obligatorio: recorte y escala de la tabla, JPG 85 bajo 180 KB, nombre
  `{sku}_{recorte}.jpg`, carga en `product.template`, y marcar el origen de la imagen.

**Trazabilidad.** Campo `image_origin` en `product.template` (addon `projectapp_ops`, sin
vistas) con valores `real` (foto real), `ai` (generada) y `placeholder`. Permite listar qué
platos siguen con imagen generada y priorizar la sesión de fotos real.

**Límite legal.** Una imagen generada no representa la porción servida; en Colombia es
exposición a reclamo por publicidad engañosa. La app del comensal muestra «Imágenes de
referencia» automáticamente cuando algún plato visible tiene `image_origin = ai`.

La herramienta que aplica todo esto está en [`tools/imagenes/`](../../tools/imagenes/README.md).
