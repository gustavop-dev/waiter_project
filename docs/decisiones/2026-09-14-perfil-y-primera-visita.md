# Perfil, alergias y primera visita

El menú elimina los enlaces Ayuda, Mi cuenta, Acerca del menú y Conoce la experiencia. El perfil permanece accesible desde la cabecera de navegación. Las URLs antiguas abren la carta.

La introducción existente se muestra al entrar por primera vez a la carta, con opción de omitir. Al omitir o completar se guarda `waiter_intro_<restaurante>_v1=1`, cookie del navegador con duración de un año, Path=/ y SameSite=Lax (Secure en HTTPS). Es por restaurante, conserva la mesa del QR y no intercepta enlaces directos a cuenta, pedido o pago ni la vista previa. Borrar las cookies permite verla de nuevo.

El perfil admite `alergenos`, texto opcional de hasta 500 caracteres. Antes de pagar, el comensal revisa notas y alérgenos; el perfil precarga estos últimos y modificarlos en ese pedido no cambia el perfil. El servidor valida ambos textos y los guarda como instantánea en las líneas nuevas del comensal que confirma, dentro de la exclusión de confirmación de mesa. Los reintentos conservan la instantánea reservada y no alteran otros comensales.

Las notas se añaden a `customer_note` de cada línea del POS, conservando la nota original y la modalidad para llevar. Los alérgenos se distinguen con `ALERGIAS / ALÉRGENOS:` y aparecen en cocina, cuyo KDS ya muestra las notas de línea. No implica que el restaurante garantice ausencia de alérgenos; el formulario pide confirmar con el personal.

Migración Experience: 0022_account_allergens_order_notes. Validación: perfil privado/edición/borrado, transporte hacia Odoo y reintento sin duplicación, aislamiento entre comensales, cookie de introducción y precarga del pedido.
