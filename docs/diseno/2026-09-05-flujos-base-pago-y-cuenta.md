# Flujos base de pago y cuenta (Waiter Pago · Waiter Cuenta)

> Contexto posterior (Plan H, 2026-09-05): `experience/` guarda las 30 plantillas y los
> ajustes por sede; `diner/` renderiza y el POS administra. Descuento real con reserva
> atómica; pago simulado después de confirmar; cuenta demo ligada al desafío de la
> misma cookie, sin recuperación de cuentas existentes y deshabilitada en producción.
> El diseño y los planes anteriores conservan su alcance histórico; el estado ejecutado
> y sus límites están en [la revisión de H](../revisiones/2026-09-05-cierre-H-pr14.md).

Fuente: Claude Design, archivos «Waiter Pago.dc.html» (3a El flujo completo, 3b Los estados que
sí ocurren) y «Waiter Cuenta.dc.html» (4a Entrar, 4b Mi cuenta e historial). Estas pantallas son
**iguales para las 30 plantillas** salvo la piel (tokens); las 30 variantes de carrito, pago,
registro, código e historial están en `plantillas/<codigo>/`. Marcos de 360 px; fuentes Ubuntu
(cuerpo) e IBM Plex Mono (cifras). Paleta base: tinta #1A1815, texto suave #6B6259 / #7A7166,
terciario #9A8F7E, borde #E4DED4 / #D6CEC1 / #EFE9E0, crema #FAF8F5, acento #C1873A con texto
#FFFFFF, acento suave #FDF6EA (borde #EFE4D2, texto #6B4A05), verde #2F7A4F / #216239 (suave
#E6F1EA), rojo #B4342F / #96241F / #7E1C18 (suave #FBEAE8, borde #EBC7C4), ámbar #C9820C /
#8A5A05 (suave #FDF2DC, borde #F0DDB2).

## Pago (3a) · «Cinco pantallas, seis toques desde ver pedido hasta pagado»

Principio: el menú es lo único que el restaurante configura; carrito, identificación, tarjeta y
confirmación son de Waiter (dinero, PCI, factura DIAN). Chips de la portada: Tarjeta crédito y
débito · 5 % primera compra · Registro en 2 campos · Factura DIAN automática.

1. **Tu pedido** (alto 560): cabecera 16/20 «Tu pedido» 19px 700 + «Mesa 14» 14px #7A7166;
   líneas con miniatura 54×54 radio 10 (#E8E1D5), nombre 16px 500, precio mono 15px,
   modificadores 13px #7A7166, contador − / cantidad mono / ＋ en caja de 44 px con borde
   #E4DED4 radio 9, «Quitar» 14px #96241F; bloque de upsell fondo #FDF6EA con ＋ redondo de 34
   px en acento y «Alex lo sugiere para cerrar · 16.900» 13px #6B4A05; pie fondo #FAF8F5 con
   Subtotal / Descuento primera compra 5 % (verde #216239, «−4.680») / Propina sugerida 10 % /
   Total 18px 700 + cifra mono 26px «$ 97.812»; botón «Ir a pagar» 56 px radio 12 acento;
   «o pagar en la mesa con el mesero» 14px #6B6259 centrado.
2. **Identifícate · 5 %**: banda superior #FDF6EA con «5%» 34px 700 #A06E2C y «de descuento en
   tu primera compra por dejarnos tu correo.» 16px #6B4A05; campos Correo (56 px, borde
   #D6CEC1, radio 10, foco borde acento + sombra 0 0 0 3px #FDF6EA) y Celular con prefijo «+57»
   en caja #FAF8F5 mono; casilla 26 px radio 7 en acento con ✓ «Acepto la política de datos y
   que me escriban con novedades»; aviso #F2EEE8 «Guardamos tu correo, celular y tus pedidos
   anteriores. La tarjeta no se guarda aquí: la tokeniza la pasarela.»; botón «Aplicar 5% y
   continuar»; enlace «Seguir sin registrarme». Nota: dos campos, nada de contraseña; saltarlo
   siempre es posible y visible.
3. **Pagar con tarjeta**: cabecera «Pagar» 19px 700 + total mono 20px; fila de métodos como
   píldoras de 44 px (Tarjeta activa en #1A1815 blanco; PSE, Nequi, Efectivo con borde
   #E4DED4); Número de la tarjeta (56 px, mono 17px, insignia «VISA» 24 px #1A1F71), Vence y
   CVV en dos columnas; interruptor 52×30 acento «Guardar para la próxima visita»; aviso
   #F2EEE8 con ✓ verde «Pago cifrado y tokenizado. Waiter no ve ni almacena el número de tu
   tarjeta.»; botón «Pagar $ 97.812» 60 px verde #2F7A4F.
4. **Autorizando**: anillo 92 px borde 5 px #F2EEE8 con top acento (spinner); «Autorizando con
   tu banco» 22px 700; «No cierres esta pantalla. Si tu banco pide confirmación, te la mostrará
   aquí mismo.» 16px #6B6259; tarjeta #FAF8F5 con Comercio «La Provincia S.A.S.», Referencia
   mono «#127-14», Monto mono; pie «Si algo falla, tu mesero puede cobrarte en la mesa sin
   volver a empezar el pedido.» 14px #7A7166. Nunca dejar un spinner solo.
5. **Pagado**: cabecera verde #2F7A4F blanca con ✓ en círculo 62 px (blanco al 18 %), «Listo,
   quedó pagado» 24px 700, cifra mono 26px; filas Ahorraste (mono verde), Tarjeta «Visa ••••
   4242», Factura electrónica «enviada a tu correo» (verde); tarjeta #F2EEE8 «Tu pedido sigue
   en cocina» con tres barras de 6 px (dos verdes, una #E4DED4) y «Recibido · en preparación ·
   servido»; aviso #FDF6EA «Guardamos tus datos: la próxima vez pagas en dos toques…»; pie con
   «Ver recibo» (borde) y «Calificar» (#1A1815 blanco) 52 px.

## Pago (3b) · Los estados que sí ocurren

6. **Cliente reconocido** (alto 460): cabecera #1A1815 «HOLA DE NUEVO, CAMILA» 13px 0.12em
   #A8A096 + «Tu cuarta visita» 21px 700; tarjeta guardada seleccionada (borde 2 px acento,
   fondo #FDF6EA, VISA + «•••• 4242», ✓ redondo acento); «Usar otra tarjeta →»; aviso #F2EEE8
   «El 5% de primera compra ya lo usaste en agosto. Tienes 8 de 10 sellos.»; botón «Pagar $
   62.400» verde 60 px.
7. **Tarjeta rechazada**: banda #FBEAE8 borde #EBC7C4 con «!» en círculo #B4342F, «Tu banco no
   autorizó el pago» 18px 700 #7E1C18, «No se hizo ningún cobro. Tu pedido sigue guardado.»
   15px #96241F; «QUÉ PUEDES HACER» 13px 0.1em #9A8F7E; opciones con borde #E4DED4 radio 12
   y → : Intentar con otra tarjeta · Pagar con PSE o Nequi · Que el mesero cobre en la mesa;
   pie «Motivo del banco: fondos insuficientes. No lo decimos con código de error.»
8. **Variante oscura · bar**: fondo #14120F, borde #2C2823, texto #EDE7DD; cabecera «Mesa 6 ·
   ronda 3» + mono «268.000»; opciones «Pagar lo mío · 50.000», «Dividir en 4 · 67.000»
   (seleccionada: borde 2 px acento, fondo #1F1A14, ✓ acento con tinta #1A1815), «Pagar todo ·
   268.000» en tarjetas #1C1916 radio 12; tarjeta guardada abajo con «cambiar» en acento;
   botón «Pagar $ 67.000» acento con texto #1A1815.

Reglas del 5 %: una sola vez por cliente identificado por celular; sobre el subtotal de
productos, nunca sobre propina ni servicio; como línea propia en carrito, factura y
confirmación (el comensal ve el ahorro tres veces); lo valida el POS contra res.partner, no el
navegador; no se acumula con promociones; no se pide registro para pedir, solo para el
descuento; el restaurante puede apagarlo o cambiar el porcentaje, no dónde aparece.
Qué hace falta por debajo: una pasarela (Wompi, Mercado Pago o PayU), nada de PAN en Waiter
(iframe/SDK), 3DS, idempotencia por intento, conciliación por webhook (pos.payment),
factura DIAN al confirmar, Ley 1581.

## Cuenta (4a) · Entrar · «Sin contraseñas: código de seis dígitos al correo»

1. **Crear cuenta** (alto 624): banda #FDF6EA «5%» 32px 700 #A06E2C + «en tu primera compra.
   Después, pagas en dos toques.» 15px #6B4A05; campos Nombre / Correo (activo: borde acento +
   sombra 3 px #FDF6EA) / Celular (+57 mono) de 52 px radio 10; casilla ✓ acento «Acepto la
   política de datos.» y casilla vacía «Quiero novedades del restaurante.» (sin marcar por
   ley); botón «Crear cuenta y aplicar 5%» 56 px; «Ya tengo cuenta» 14px #6B6259.
2. **Código al correo**: cabecera con botón ← 40 px borde #E4DED4 radio 10 y «Verifica que
   eres tú» 18px 700; texto «Te enviamos un código de seis dígitos a camila@correo.com. Vence
   en 10 minutos.»; seis casillas de 62 px radio 10 mono 24px (activa: borde 2 px acento +
   sombra; vacías borde #E4DED4); «Reenviar en 0:38» (mono) y «Usar mi celular» en #A06E2C;
   aviso #F2EEE8 «Mientras verificas, tu pedido sigue guardado. Puedes cerrar esto y pagar sin
   cuenta.»; aviso con borde «¿No llega? Revisa spam…»; pie «El código sirve una sola vez y
   solo en este teléfono.»; botón «Confirmar código» apagado (#E4DED4 / #9A8F7E) hasta el
   sexto dígito.
3. **El correo no llegó**: banda ámbar #FDF2DC borde #F0DDB2 con «!» #C9820C, «Llevamos dos
   intentos» 17px 700 #6B4A05, «Revisa spam…» 14px #8A5A05; «OTRAS FORMAS DE ENTRAR»; opciones:
   «Código por SMS · al 310 555 4821» (destacada: borde 2 px acento fondo #FDF6EA), «Corregir
   mi correo», «Que el mesero me ayude»; aviso «Nunca bloqueamos el pago por esto: el 5% se
   puede aplicar después desde la caja con tu celular.»; botón «Seguir sin cuenta» con borde.

## Cuenta (4b) · Mi cuenta e historial (iguales para las 30)

4. **Mi cuenta** (alto 540): cabecera #1A1815 texto #F5F1EA con avatar 50 px acento «CR»,
   nombre 18px 700, correo 14px #A8A096; tres cifras mono 20px (14 pedidos · 8/10 sellos ·
   62.400 ahorrado) con rótulos 13px #A8A096; lista de filas 14/20 borde #F3EFE8: Mis pedidos
   «14 →», Tarjetas guardadas «•••• 4242», Alergias y preferencias (chip «maní» #FBEAE8 /
   #96241F), Datos de facturación «NIT →», Notificaciones «solo pedidos», Mis datos y
   privacidad «→»; pie «Cerrar sesión» #96241F y «Waiter 1.1» 13px #9A8F7E.
5. **Historial de pedidos**: cabecera «Mis pedidos» 18px 700 + «14 en 3 locales»; grupos por
   mes (banda #FAF8F5 12px 0.12em mayúsculas); cada pedido: local 16px 500 + total mono, «Sáb
   16 · mesa 14 · 3 ítems» 13px #7A7166, chips de 26 px radio 6: Pagado (#E6F1EA/#216239),
   Factura enviada (#F2EEE8/#575046), −5% (#FDF6EA/#6B4A05), Sello 8, Factura pendiente
   (#FDF2DC/#8A5A05); pie con «Filtrar local» y «Descargar facturas» 50 px con borde.
6. **Detalle de un pedido**: cabecera ← + «La Provincia» 17px 700 + «Sáb 16 nov · 9:41 p.m. ·
   mesa 14»; líneas en rejilla 26px/1fr/auto (cantidad mono #9A8F7E, nombre + nota 13px,
   precio mono); totales en #FAF8F5 (Subtotal, Descuento 5% en verde, Propina 10%, Total 16px
   700 + mono 20px); Pago «Visa •••• 4242», Factura DIAN «CUFE disponible» (verde), Atendió
   «Alejandra C.»; pie «Ver factura» (borde) y «Volver a pedir» (acento, flex 1.3).
7. **Mis datos y privacidad**: tarjeta #FAF8F5 «QUÉ GUARDAMOS» + texto; filas «Descargar mis
   datos · JSON», «Quitar mi tarjeta guardada →»; bloque rojo suave «Borrar mi cuenta» 15px
   700 #7E1C18 + «Se borran tus datos personales. Las facturas se conservan cinco años por
   ley…»; pie «Ley 1581 de 2012 · responsable: el restaurante · encargado: ProjectApp».
8. **Historial vacío**: cuadro 84 px radio 22 #F2EEE8 con «Wt.» 30px 700 #C9C0B2; «Todavía nada
   por aquí» 20px 700; «Cuando pidas por primera vez, tu pedido y tu factura quedan guardados
   acá.»; aviso #FDF6EA «Tu 5% de primera compra sigue disponible.»; botón «Ver la carta».

Lo que se olvida: el teléfono de la mesa es compartido (la sesión muere al cerrar la cuenta);
una cuenta, varios restaurantes (el comensal es de ProjectApp; cada restaurante ve solo sus
pedidos); facturación con NIT; anulación y reembolso con estado propio; alergias persistentes
que viajan a la comanda; notificaciones solo del pedido en curso; recuperar acceso por celular
verificado.
