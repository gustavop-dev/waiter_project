# Banners del menú y combos fijos

## Administrador

- Configuración → Diseño del menú → Banners del menú. Hasta 8, ordenables, activables y eliminables. Guardar vacío oculta el carrusel; antes de configurarlos se conservan los destacados automáticos.
- Diseños: plato/combo, promoción, categoría, imagen completa y anuncio. Colores morado, amarillo y oscuro. Título, descripción, botón, imagen opcional y destino tomado del catálogo (producto/variante, categoría o solo información).
- Flyer recomendado: **1200 × 600 px, 2:1**. Foto de producto: **800 × 800 px**. PNG/JPG/WebP, máximo 500 KB. La imagen completa se contiene sin recortarla. El título se usa como texto alternativo. Validación del formato real de imagen en Odoo; no se admiten SVG ni destinos externos.
- Catálogo → Nuevo producto/Editar → Es un combo. Seleccionar 2–12 productos distintos, cantidades enteras 1–20, precio propio, foto e impuestos. Puede pertenecer a una categoría Combos o a cualquier otra categoría. No admite combos anidados ni elecciones variables de componentes en esta versión.

Un banner de promoción es contenido: su precio/descuento se configura en catálogo/beneficios. Un banner no altera el importe cobrado. El menú usa el precio final del producto y oculta destinos fuera de la carta o agotados. Al pulsar una categoría se filtra la carta; el producto abre su detalle conservando el token de mesa.

## Persistencia y operación

Odoo `pos.config.waiter_menu_banners`, `waiter_banners_configured`; escritura exclusiva a través de `waiter_banner_settings` validando sesión de empleado administrador y usuario administrador. La API pública solo obtiene banners activos con destinos presentes en su carta. Las imágenes están en el JSON como datos base64 acotados; no se usa un proveedor externo de almacenamiento.

El combo sigue siendo un producto `consu` a precio propio; `diner_attributes.combo` contiene componentes normalizados por el servidor. `waiter_combo_bom_id` referencia un kit phantom de MRP con productos del catálogo. Inventario calcula los ingredientes de las recetas de esos componentes recursivamente; POS/MRP descuenta el kit al registrar su salida. Productos sin receta ni control de existencias no producen existencias ficticias.

La línea del POS conserva una instantánea textual de «Incluye por combo», visible en cocina y resistente a reenvíos de notas. La composición no puede cambiar mientras hay pedidos pendientes del combo. Los componentes con receta se editan desde sus fichas; la receta del combo se administra desde Catálogo. No se sobrescribe una receta manual existente al convertir un producto: en ese caso debe crearse un producto para el combo.

`waiter_save_catalog_product` valida la sesión del empleado administrador y guarda producto, composición y kit en una transacción. La disponibilidad del combo consulta ingredientes y componentes activos. El catálogo público conserva su caché habitual (60 s por defecto).

## Verificación

- Pruebas Odoo en una copia aislada: permisos y validación de banners; precio, composición, rechazo de referencias inválidas, disponibilidad y descuento real de ingredientes al pagar dos combos. 4 pruebas, sin fallos.
- UI: formulario de banners, editor de combo, navegación conservando mesa y filtro de categoría; TypeScript en POS y Diner.
- Experience: filtrado de destinos, catálogo y disponibilidad de combos, regresiones del perfil; sin cobros externos.
- Navegador real: admin local con PIN; cinco diseños con datos interceptados de prueba a 320, 390 y 1440 px, sin desbordamiento ni errores JS. No se guardaron banners promocionales ni combos de prueba en el catálogo del restaurante.
- Respaldo antes de actualizar: `/tmp/waiter-dev/backups/projectapp-before-banners-combos-20260914.dump`.
