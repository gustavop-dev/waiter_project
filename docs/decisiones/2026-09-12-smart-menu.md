# Smart Menu: diseño Exporty y conexión al POS

El diseño activo es S1. La referencia es `exporty-light-mode.zip`: 99 pantallas,
80 imágenes y 253 vectores. El informe por pantalla conserva diferencias
observadas; una referencia revisada no equivale a una reproducción certificada
como idéntica. La aplicación usa contenido del restaurante, español y pesos
colombianos, y excluye el marco de teléfono, teclado y barras del sistema operativo.

## Composición y administración

Se mantienen DM Sans/Mulish, superficies blancas, fondo claro, destacados oscuros,
fotografías circulares, órbitas, ilustraciones originales, chips cálidos y acciones
moradas. Colores, fuente y logo se personalizan en Configuración del POS sin
reemplazar los layouts. Se conserva la edición y vista previa del menú existentes.

El detalle fue reconstruido específicamente frente a Exporty 44, 45 y 51:
hero lateral en carta, hero centrado en hoja de recomendaciones, precio, fotografía
de 230 px, nutrición, carrusel de ingredientes ilustrados, adicionales con casillas
y cantidad, acompañamientos con fotos, notas y barra inferior fija. La composición
responde a móvil, tablet y escritorio. Una fotografía ausente o fallida utiliza un
plato neutro; no se sustituye por la fotografía de otro producto.

El catálogo del POS edita `ingredientes`, `nutricion`, `extras` y `acompanamientos`
en `diner_attributes`. Las relaciones usan IDs de `product.product`, no de plantilla.
Valores numéricos e IDs se validan en ambos lados. La selección vacía de
acompañamientos desactiva las sugerencias; sin configuración se muestran hasta
tres productos disponibles. No se inventan datos nutricionales, ingredientes,
precios ni puntuaciones.

## Recorridos implementados

- Introducción y bienvenida, directorio del local, QR por cámara/foto y código
  manual validado contra la misma sede. Decodificación local con ZXing.
- Asistente de ocho pasos, selección nueva/anterior, tarjetas/lista, detalle en
  hoja y recordatorio tras cinco minutos; preferencias guardadas, consultables,
  editables y borrables por restaurante en el dispositivo.
- Menú, categorías, búsqueda y favoritos privados por cuenta. El filtro de
  precio/disponibilidad/valoraciones se retiró el 14 de septiembre (véase
  [cabecera y tarjeta de la carta](2026-09-14-carta-saludo-y-tarjeta.md)). Las puntuaciones son agregados de opiniones
  verificadas por posesión de líneas del pedido, sin publicar datos personales.
- Carrito, desplazamiento para eliminar, cantidad/notas, selección comer aquí o
  para llevar. `POST sesiones/<id>/platos/` valida todos los productos antes de
  añadirlos en una transacción. El precio procede del catálogo del servidor.
- Confirmación a Odoo, estados recibida/preparación/lista/entregada y resumen con
  líneas/impuestos/total. No se anuncia un ETA inexistente. Para llevar afecta
  exclusivamente a las líneas nuevas del comensal que confirma.
- Registro con contraseña y validación visual, código, elección de canal demo,
  éxito con ilustraciones originales, acceso/cambio/recuperación de contraseña.
  Perfil editable y preferencia de novedades persistente.
- Historial y recibo con datos reales, volver a pedir, opiniones generales y por
  plato con cinco emojis originales y comentario de hasta 250 caracteres.
- Tarjetas de prueba vacías/alta/única/carrusel, checkout simulado y recompensa de
  primera compra real según configuración del POS. Ayuda, artículos e introducción.

## Persistencia y seguridad del contrato

Se aplicaron migraciones Experience 0008–0013: favoritos, opiniones, hash de
contraseña, titular histórico de las líneas, tokens de restablecimiento y modalidad
para llevar. Respaldo previo de desarrollo en `/tmp/waiter-dev/backups/`.

Cerrar sesión conserva la propiedad de las líneas compradas; entrar en otra cookie
con contraseña recupera solo el historial de la cuenta. Las opiniones se limitan a
platos realmente pedidos por ese comensal. El restablecimiento usa token aleatorio,
hash, caducidad de 20 minutos, consumo único y revocación de sesiones anteriores.
Acceso y cambios tienen límites de intentos. El registro demo está ligado a la
cookie de origen y permanece deshabilitado en producción.

La recuperación por correo requiere `DINER_EMAIL_ENABLED`, `DINER_PUBLIC_URL` y
SMTP. La UI informa cuando el envío no está habilitado. No se enviaron correos
reales en las pruebas. No hay proveedor OAuth ni pasarela bancaria configurados.
Las tarjetas solo admiten números de sandbox y guardan metadata; PAN y CVV nunca
se persisten. No se fabrican cupones, puntos, ubicaciones, horarios ni cobros.

## Validación

El recorrido Playwright real pasó con registro/contraseña, favoritos persistentes,
edición y recarga de perfil, cantidad/notas, envío a cocina, historial, reseñas,
volver a pedir, cierre de sesión y nuevo acceso. La comprobación en 390, 768 y
1440 px y la prevención de escrituras desde vista previa también pasaron.
Las cuentas y comandas de prueba se retiraron después de comprobar que eran
borradores de prueba sin pagos.

Las pruebas de componentes y store comprueban errores, conservación de entradas,
extras atómicos, preferencias y metadata de tarjetas. Django cubre aislamiento,
validación, contraseñas, tokens, opiniones, valoraciones y modalidad de cocina.
El informe visual y su matriz documentan la cobertura exacta, sin convertir el
resultado funcional en una afirmación de igualdad de píxeles.


Resultado de la última ejecución: 99 pruebas Django de vistas, catálogo,
descuentos y adaptador Odoo aprobadas; después del ajuste de agrupación de platos
valorados y la prueba explícita de caducidad, las diez de Smart Menu volvieron a
pasar. 26 pruebas de componentes/store de diner y siete de dominio/servicio de
catálogo POS aprobadas. TypeScript/ESLint sin errores y compilación de producción
verificada. La auditoría final contiene 98 escenarios, 95 referencias con captura
correspondiente y 66 assets originales desplegados, sin errores JS ni overflow.

## Revisión de las vistas 46, 51 y 56–74 · 2026-09-13

Las reseñas ya se guardaban en Experience: una opinión por pedido y comensal,
con valoración general, comentario y calificación de los platos que pidió.
La media y cantidad públicas se calculan por plato y sede; editar una opinión
actualiza el agregado sin duplicarla. Sin opiniones no se muestran estrellas.

Las secciones del menú son categorías de Catálogo en el POS. El administrador
puede crear «Más populares», ordenar la categoría y asignarle platos. Eso es
una selección editorial, no un ranking automático de ventas. Los destacados
se eligen con el atributo Favorito del catálogo, independiente de los favoritos
personales del comensal.

Descripción e ingredientes ya existían y son independientes. Se añadió `peso`
a `nutricion` (gramos por porción) en el JSON `diner_attributes`, sin migración.
Calorías, peso, proteína, carbohidratos, grasa y fibra son opcionales; solo se
publican valores completados, incluido cero. La ficha 51 conserva la foto
lateral, órbitas, bloque nutricional, ingredientes con assets originales y
acompañamientos. No se inventaron datos para llenar los platos de la demo.

La invitación 67 ahora es un modal con las estrellas originales. Las vistas
68–72 usan una escala única con estrella deslizante; la 73 conserva el emoji y
el comentario con contador. La 74 recorta la foto en la esquina de cada tarjeta,
amplía el emoji elegido y muestra su etiqueta. Pulsarlo otra vez permite dejar
ese plato sin calificar. El guardado conserva los datos si falla la conexión.

Las vistas 60–63 se capturan desde el checkout; las capturas de «Mis tarjetas»
pertenecen a las vistas 91–95. Se compactó la billetera vacía y se colocaron
vencimiento/CVV en una fila. El estado entregado 59 permite continuar al pago.
Los pagos y tarjetas del menú siguen siendo de demostración.

Validación de esta revisión: 28 pruebas Django (adaptador y Smart Menu), 16 de
componentes del comensal, 4 de serialización de atributos y 3 del formulario POS.
TypeScript y ESLint sin errores en los archivos revisados. Capturas con API
interceptada de las vistas 46, 51 y 56–74; detalle también en tablet/escritorio.
