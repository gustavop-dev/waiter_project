# Comparación del menú con las 99 pantallas Exporty

98 referencias tienen una vista correspondiente capturada; 1 no tienen equivalente específico. No se certifica igualdad de píxeles: el contenido de producción es el del restaurante, los textos se adaptan al español y los precios a COP.

Se verificaron los 432 archivos del ZIP y 67 assets originales desplegados. Hay 106 escenarios de navegador con componentes reales y API interceptada.

El visor permite abrir cada referencia, su captura actual y los assets asociados. Las capturas no escriben cuentas, comandas ni pagos en los servicios. Los recorridos E2E contra el POS se verifican por separado.

[Abrir comparativa local](http://192.168.56.10:3002)

## Matriz por pantalla

| Nº | Referencia | Captura actual | Resultado |
|---|---|---|---|
| [1](http://192.168.56.10:3002/#screen-1) | 1. First Page | welcome-splash | Splash de la marca con platos del catálogo, órbitas y entrada a la introducción. La marca/fotos dependen del restaurante. |
| [2](http://192.168.56.10:3002/#screen-2) | 2. Onboarding - Step 1 | welcome-1 | Ilustración Phone 01 original, órbitas, paginación y navegación entre pasos; textos en español. |
| [3](http://192.168.56.10:3002/#screen-3) | 3. Onboarding - Step 2 | welcome-2 | Ilustración Phone 03 original, paginación y navegación; textos en español. |
| [4](http://192.168.56.10:3002/#screen-4) | 4. Onboarding - Step 3 | welcome-3 | Reloj de arena original, progreso y navegación; textos en español. |
| [5](http://192.168.56.10:3002/#screen-5) | 5. Onboarding - Step 4 | welcome-4 | Teléfono/favoritos original, progreso y navegación; textos en español. |
| [6](http://192.168.56.10:3002/#screen-6) | 6. Authentication page | welcome-5 | Entrada con correo, contraseña y acceso invitado. No se presentan botones de OAuth sin proveedor configurado. |
| [7](http://192.168.56.10:3002/#screen-7) | 7. Email Verification | email-entry | Paso independiente de correo que alimenta el registro; se preserva la mesa de origen. |
| [8](http://192.168.56.10:3002/#screen-8) | 8. Email Verification + keyboard | email-filled | Campo de correo editable. El teclado lo aporta el dispositivo; no se dibuja dentro de la página. |
| [9](http://192.168.56.10:3002/#screen-9) | 9. Email Verification | email-filled | Correo rellenado y check de formato. El contrato no revela si una cuenta existe antes de autenticarla. |
| [10](http://192.168.56.10:3002/#screen-10) | 10. Create account | signup | Nombre, correo, celular y contraseña con etiquetas internas; consentimiento y aviso de registro demo adaptados. |
| [11](http://192.168.56.10:3002/#screen-11) | 11. Create account | signup-invalid | Borde rojo y validación nativa de formato; controles conservan valores al fallar. |
| [12](http://192.168.56.10:3002/#screen-12) | 12. Create account | signup-filled | Cuatro campos completados, checks de formato y contraseña oculta con botón de visibilidad. |
| [13](http://192.168.56.10:3002/#screen-13) | ️13. Verify Code | verification-channel | Tarjetas de canal. Este entorno usa verificación demo; no se afirma haber enviado un SMS/correo. |
| [14](http://192.168.56.10:3002/#screen-14) | 1️4. Verify Code | code | Seis casillas visuales con un input accesible para pegado/autocompletado; se conserva el contrato de seis dígitos. |
| [15](http://192.168.56.10:3002/#screen-15) | ️15. Verify Code | code-filled | Casillas completadas con borde de selección y validación del servidor; seis dígitos en vez de cuatro. |
| [16](http://192.168.56.10:3002/#screen-16) | 16. Congratulation - create account | signup-success | Estrellas originales, órbitas, nombre del cliente y transición real al perfil. |
| [17](http://192.168.56.10:3002/#screen-17) | 17. Login | login | Acceso real con correo/contraseña, visibilidad y recuperación; errores de credenciales no revelan cuentas. |
| [18](http://192.168.56.10:3002/#screen-18) | 18. Forget Password | password-recover | Solicitud de enlace de recuperación; el envío requiere DINER_EMAIL_ENABLED y SMTP configurado. |
| [19](http://192.168.56.10:3002/#screen-19) | 19. Forget Password | password-recover-filled | Correo rellenado y validado. Un entorno sin SMTP no confirma un envío inexistente. |
| [20](http://192.168.56.10:3002/#screen-20) | 20. Forget Password | password-reset | Nueva contraseña y confirmación; token de un solo uso y caducidad de 20 minutos. |
| [21](http://192.168.56.10:3002/#screen-21) | 21. Congratulation - reset password | password-success | Candado 3D original y confirmación únicamente después de restablecer la contraseña. |
| [22](http://192.168.56.10:3002/#screen-22) | 22. Open Mobile Application  | location-choose | Dos tarjetas para QR/entrada de código y selección del local actual. |
| [23](http://192.168.56.10:3002/#screen-23) | 23. QR Code - Scan code | location-scan | Lector QR local por cámara/foto; funciona también en la red HTTP donde getUserMedia no está disponible. |
| [24](http://192.168.56.10:3002/#screen-24) | 24. QR Code - enter code | location-code | Código o URL del QR validado contra el restaurante y sede; no se redirige a enlaces externos. |
| [25](http://192.168.56.10:3002/#screen-25) | 25. Share your location | location-share | Pin 3D original, solicitud real de geolocalización, alternativa manual, dirección del POS y distancia local. Textos en español; GPS requiere HTTPS. |
| [26](http://192.168.56.10:3002/#screen-26) | 26. Use current location | location-list | Lista del local actual con búsqueda. No se inventan otros restaurantes ni distancias GPS. |
| [27](http://192.168.56.10:3002/#screen-27) | 27. Search your location | location-empty | Estado de búsqueda sin coincidencias del directorio actual. |
| [28](http://192.168.56.10:3002/#screen-28) | 28. Search results | location-list | Resultado del local actual; alcance de una sede, sin datos ficticios de otras ubicaciones. |
| [29](http://192.168.56.10:3002/#screen-29) | 29. Open Mobile Application  | home | Se usan las dos ilustraciones correctas. Cambian idioma, saltos de título, algunos espacios y colores de iconos. |
| [30](http://192.168.56.10:3002/#screen-30) | 30. Choose Digital Assistent | assistant | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [31](http://192.168.56.10:3002/#screen-31) | 31. Old customer screen | assistant-return | Selección entre preferencias nuevas y última selección guardada. |
| [32](http://192.168.56.10:3002/#screen-32) | 32. Virtual Assistant - Step 1 | assistant-step-1 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [33](http://192.168.56.10:3002/#screen-33) | 33. Virtual Assistant - Step 2 | assistant-step-2 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [34](http://192.168.56.10:3002/#screen-34) | 34. Virtual Assistant - Step 3 | assistant-step-3 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [35](http://192.168.56.10:3002/#screen-35) | 35. Virtual Assistant - Step 4 | assistant-step-4 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [36](http://192.168.56.10:3002/#screen-36) | 36. Virtual Assistant - Step 5 | assistant-step-5 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [37](http://192.168.56.10:3002/#screen-37) | 37. Virtual Assistant - Step 6 | assistant-step-6 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [38](http://192.168.56.10:3002/#screen-38) | 38. Virtual Assistant - Step 7 | assistant-step-7 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [39](http://192.168.56.10:3002/#screen-39) | 39. Virtual Assistant - Step 8 | assistant-step-8 | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [40](http://192.168.56.10:3002/#screen-40) | 40. Recommendations - grid | recommendations | Recomendaciones del catálogo en tarjetas con fotografías y valoraciones agregadas reales cuando existen. |
| [41](http://192.168.56.10:3002/#screen-41) | 41. Recommendations - list | recommendations-list | Cambio a filas con foto, precio y acceso al detalle en panel. |
| [42](http://192.168.56.10:3002/#screen-42) | 42. Recommendations - list | recommendation-detail | Hoja inferior real con foto centrada, órbitas, título/precio, nutrición e ingredientes configurados. |
| [43](http://192.168.56.10:3002/#screen-43) | 43. Recommendations - list | recommendation-detail | Panel desplazable con compra fija, cierre y navegación por teclado; tamaño depende del viewport. |
| [44](http://192.168.56.10:3002/#screen-44) | 44. View a selected dish | dish-detailed | Detalle completo: ingredientes ilustrados, casillas de adicionales, acompañamientos, notas y compra fija. Contenido y precios proceden del POS. |
| [45](http://192.168.56.10:3002/#screen-45) | 45. View a selected dish with extra toppings | dish-extras-selected | Selección y cantidades por adicional, acompañamientos y total calculado; envío en una operación atómica. |
| [46](http://192.168.56.10:3002/#screen-46) | 46. Full Menu | menu | Carruseles, destacados oscuros, fotos circulares, precio y valoraciones reales; contenido/textos del restaurante. |
| [47](http://192.168.56.10:3002/#screen-47) | 47. Full Menu | category | Corregido de cuadrícula a lista y recuperado el destacado. No hay rating ni recuento de reseñas. |
| [48](http://192.168.56.10:3002/#screen-48) | 48. Search in restaurant menu | search | Resultados en filas con foto, valoración real cuando existe, precio y botón de añadir directamente al pedido. |
| [49](http://192.168.56.10:3002/#screen-49) | 49. Filters | filters | Categorías, valoración mínima, precio mínimo/máximo y disponibilidad; sin valoraciones ficticias. |
| [50](http://192.168.56.10:3002/#screen-50) | 50. Notification | assistant-reminder | Recordatorio a los cinco minutos, una vez por visita, con ilustración original y acceso al asistente. |
| [51](http://192.168.56.10:3002/#screen-51) | 51. View a product from menu | dish-menu | Ficha específica del menú: foto lateral, órbitas, descripción, calorías, peso de porción y nutrientes opcionales, ingredientes ilustrados y acompañamientos. La captura usa datos del kit; el restaurante publica solo los campos completados. |
| [52](http://192.168.56.10:3002/#screen-52) | 52. View order | menu-cart | El destacado permanece visible al tener carrito; la barra del pedido muestra unidades y total real. |
| [53](http://192.168.56.10:3002/#screen-53) | 53. View order | cart | Filas compactas con fotografía, cantidad vertical, notas, eliminación y envío fijo inferior. |
| [54](http://192.168.56.10:3002/#screen-54) | 54. View order - remove a product | cart-swiped | Desplazamiento de una fila con acción de eliminar; conserva alternativa accesible por botón. |
| [55](http://192.168.56.10:3002/#screen-55) | 55. Take away or dine-in? | cart-mode | Comer aquí/para llevar, comunicado a cocina para las líneas nuevas del comensal. |
| [56](http://192.168.56.10:3002/#screen-56) | 56. Order status 1 - preparing | preparing | Tarjeta orbital e ilustración original implementadas; resumen desplegable con estado e importes reales. No se inventa un tiempo estimado de preparación. |
| [57](http://192.168.56.10:3002/#screen-57) | 57. Order status 1 - preparing | status-expanded | Resumen expandible con las líneas reales, impuestos, total y fases de preparación. |
| [58](http://192.168.56.10:3002/#screen-58) | 58. Order status 2 - almost ready | ready | Tarjeta orbital e ilustración original implementadas; resumen desplegable con estado e importes reales. No se inventa un tiempo estimado de preparación. |
| [59](http://192.168.56.10:3002/#screen-59) | 59. Order status 3 - done | served | Tarjeta orbital e ilustración original implementadas; resumen desplegable con estado e importes reales. No se inventa un tiempo estimado de preparación. |
| [60](http://192.168.56.10:3002/#screen-60) | 60. Add a new card | checkout-empty | Checkout con billetera vacía, resumen y cupón. No se confunde con Mis tarjetas; el pago online sigue en modo prueba. |
| [61](http://192.168.56.10:3002/#screen-61) | 61. Add a new card | checkout-add | Alta de tarjeta de prueba desde el checkout; datos de prueba y aviso explícito de simulación. |
| [62](http://192.168.56.10:3002/#screen-62) | 62. Checkout - 1 card | checkout-card | Checkout con una tarjeta de prueba, resumen de importes, cupón y acción de pago simulado. |
| [63](http://192.168.56.10:3002/#screen-63) | 63. Checkout - 3 cards | checkout-multiple | Checkout con tres tarjetas de prueba y selector. El número completo permanece oculto. |
| [64](http://192.168.56.10:3002/#screen-64) | 64. Checkout - discount applied | checkout-coupon | Cupón validado por el POS, código y check verde, tarjeta, resumen y total con descuento. Colores de la marca y moneda del restaurante; tarjetas/pago online siguen explícitamente de prueba. |
| [65](http://192.168.56.10:3002/#screen-65) | 65. After Checkout  | payment-success | Billetera/monedas original y resultado explícito de simulación; no se presenta como cobro real. |
| [66](http://192.168.56.10:3002/#screen-66) | 66. After Checkout  | points-earned | Hoja inferior con cerdito original, puntos acreditados al cobrar en POS, enlace a saldo real y cierre para una futura visita. Textos en español y cifra real del pedido. |
| [67](http://192.168.56.10:3002/#screen-67) | 67. Feedback | feedback-invite | Invitación en modal centrado con estrellas originales, cierre y acceso a reseña de un pedido propio. |
| [68](http://192.168.56.10:3002/#screen-68) | 68. Feedback - extremely disappointed | feedback-1 | Emoji original, escala única con control de estrella y números seleccionables; opinión persistida en el backend. Espaciado adaptado al navegador, textos en español. |
| [69](http://192.168.56.10:3002/#screen-69) | 69. Feedback - kind of disappointed | feedback-2 | Emoji original, escala única con control de estrella y números seleccionables; opinión persistida en el backend. Espaciado adaptado al navegador, textos en español. |
| [70](http://192.168.56.10:3002/#screen-70) | 70. Feedback - neutral | feedback-3 | Emoji original, escala única con control de estrella y números seleccionables; opinión persistida en el backend. Espaciado adaptado al navegador, textos en español. |
| [71](http://192.168.56.10:3002/#screen-71) | 71. Feedback - great | feedback-4 | Emoji original, escala única con control de estrella y números seleccionables; opinión persistida en el backend. Espaciado adaptado al navegador, textos en español. |
| [72](http://192.168.56.10:3002/#screen-72) | 72. Feedback - awesome | feedback-5 | Emoji original, escala única con control de estrella y números seleccionables; opinión persistida en el backend. Espaciado adaptado al navegador, textos en español. |
| [73](http://192.168.56.10:3002/#screen-73) | 73. Extra input for low feedback | feedback-comment | Emoji original de valoración baja, comentario opcional con contador integrado y conservación ante errores. |
| [74](http://192.168.56.10:3002/#screen-74) | 74. Dishes feedback | feedback-dishes | Tarjetas con foto recortada arriba a la izquierda, nombre lateral y cinco emojis originales; la selección se amplía y muestra su etiqueta. Volver a pulsar permite omitir ese plato. |
| [75](http://192.168.56.10:3002/#screen-75) | 75. Scan QR Code - when leaving the restaurant | location-rescan | Ilustración original y acceso al lector QR local después de valorar la visita. No cierra una cuenta pendiente de pago. |
| [76](http://192.168.56.10:3002/#screen-76) | 76. General Menu | navigation | El panel existe, pero usa iniciales, overlay oscuro, enlaces diferentes y no desplaza la vista anterior. |
| [77](http://192.168.56.10:3002/#screen-77) | 77. Home - Active order | home-active | Tarjeta oscura con plato recortado, pedido activo y dos carruseles de categorías reales. |
| [78](http://192.168.56.10:3002/#screen-78) | 78. My orders | history | Se muestran pedidos del restaurante actual con líneas y acciones; no tarjetas de locales ni composición original. |
| [79](http://192.168.56.10:3002/#screen-79) | 79. View order | receipt | Recibo con borde de papel, foto de platos, cantidades e importes del historial real. No se inventan impuestos desglosados ni una factura fiscal. |
| [80](http://192.168.56.10:3002/#screen-80) | 80. Locations | location-list | Directorio del local actual, respetando el alcance de una sede. |
| [81](http://192.168.56.10:3002/#screen-81) | 81. View location | location-detail | Detalle con identidad del restaurante y acceso al menú/mesa; sin mapa, dirección u horarios inventados. |
| [82](http://192.168.56.10:3002/#screen-82) | 82. My Rewards | rewards | Tarjeta oscura con medalla original y beneficio de primera compra configurado por el POS. |
| [83](http://192.168.56.10:3002/#screen-83) | 83. My Rewards - Claim Reward  | reward-detail | Hoja con copa original y acceso al beneficio automático; no inventa códigos, referidos ni puntos. |
| [84](http://192.168.56.10:3002/#screen-84) | 84. About | about | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [85](http://192.168.56.10:3002/#screen-85) | 85. Help | help | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [86](http://192.168.56.10:3002/#screen-86) | 86. Help | help-category | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [87](http://192.168.56.10:3002/#screen-87) | 87. Help | help-article | Implementado con navegación funcional, composición de Exporty y branding del restaurante. Textos en español y datos reales; no se certifica igualdad píxel a píxel. |
| [88](http://192.168.56.10:3002/#screen-88) | 88. My profile | profile | Perfil con órbitas, información, contraseña, tarjetas, preferencias, historial, favoritos y switch de novedades persistente. |
| [89](http://192.168.56.10:3002/#screen-89) | 89. Account Information | profile-edit | Formulario conectado: guarda nombre, celular y novedades; correo de identidad solo lectura mientras no exista servicio de nueva verificación. |
| [90](http://192.168.56.10:3002/#screen-90) | 90. Account Information | password-change | Contraseña actual/nueva/confirmación, botones de visibilidad y guardado real con hash. |
| [91](http://192.168.56.10:3002/#screen-91) | 91. My cards | wallet-empty | Billetera original y alta de tarjeta de prueba. |
| [92](http://192.168.56.10:3002/#screen-92) | 92. Choose a payment method | wallet-add | Selector Visa/Mastercard dentro de la hoja de alta; solo tarjetas de demostración. |
| [93](http://192.168.56.10:3002/#screen-93) | 93. My cards | wallet-add | Formulario de prueba con validación; se conserva únicamente metadata no sensible. |
| [94](http://192.168.56.10:3002/#screen-94) | 94. My cards | wallet-card | Tarjeta oscura, metadata, selección predeterminada y borrado local. |
| [95](http://192.168.56.10:3002/#screen-95) | 95. My cards | wallet-multiple | Carrusel con indicadores y selección de tarjeta de prueba. |
| [96](http://192.168.56.10:3002/#screen-96) | 96. My preferences - no preferences | preferences-empty | Robot lateral original, órbitas, estado sin preferencias y acceso al asistente. |
| [97](http://192.168.56.10:3002/#screen-97) | 97. My preferences - preferences configured | preferences-list | Selección guardada por restaurante con fecha y acceso al detalle. |
| [98](http://192.168.56.10:3002/#screen-98) | 98. My preferences - no preferences | preferences-configured | Grupos completos de preferencias con chips seleccionados y acceso a edición. |
| [99](http://192.168.56.10:3002/#screen-99) | 99. Language | Sin equivalente específico | No hay selector de idioma en Smart Menu; sus textos están en español. |
