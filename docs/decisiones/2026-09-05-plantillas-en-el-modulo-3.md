# ADR · Las plantillas del menú viven en el módulo 3, no en el POS ni en la app del comensal

**Fecha:** 2026-09-05 · **Estado:** aceptada · **Plan:** `docs/planes/2026-09-05-plan-H-plantillas.md`

## Contexto

Producto entregó 30 plantillas de menú (seis familias por tipo de restaurante), cada una
con su carrito, su pago y sus tres pantallas de cuenta (`docs/diseno/waiter-*.dc.html`).
El propio diseño lo dice: «todas son el mismo motor: estructura, tamaños de toque y barra
de pedido son de Waiter; el color, la tipografía de títulos y las fotos las pone el
restaurante. Lo que cambia entre plantillas es la jerarquía». El usuario pidió un almacén
dedicado en el backend para plantillas y estilos, porque si vive pegado al POS o al módulo
del cliente, añadir plantillas después «va a ser tedioso»; y que el frontend solo cambie de
DOM o de estilo según la elegida, sin distinción en datos ni transacciones.

## Decisión

1. El **catálogo** (`MenuTemplate`) y los **ajustes por sede** (`VenueMenuSettings`) viven
   en `experience/` (módulo 3), sembrados desde JSON versionados en el repo. Añadir una
   plantilla es añadir un JSON y un layout en el motor del comensal.
2. La app del comensal es un **motor**: tokens → variables CSS; layouts registrados por
   código (menú) y por familia (carrito, pago) y por patrón (cuenta). Los datos son los
   mismos para las 30; los huecos para atributos opcionales se omiten si no hay dato.
3. El POS solo **elige y personaliza**: lee el catálogo público de experience y escribe por
   una pasarela del addon de Odoo (`/waiter/admin/menu_settings`) que reenvía con la clave
   interna. Ningún secreto en el navegador; la autorización es la del usuario de Odoo
   (gerente del POS).
4. El logo, el color de acción y la tipografía de marca del Plan G siguen en Odoo; la
   plantilla los toma como valores por defecto y la sede puede pisarlos por plantilla.

## Alternativas descartadas

- Guardar la plantilla en `res.company` como la marca: sirve para tres campos, no para un
  catálogo extensible con paletas y layouts; y ata el módulo 3 al POS.
- Que el POS escriba directo en experience: exigiría una autenticación cruzada POS↔módulo 3
  que no existe; la pasarela por Odoo reutiliza la sesión y el grupo del usuario.
- Un componente por plantilla y pantalla (180 componentes): el diseño mismo define seis
  carritos, seis pagos y nueve patrones de cuenta; el motor los comparte por familia.

## Consecuencias

- Pago y registro quedan **maquetados** (sin pasarela ni verificación externa) detrás de
  endpoints con la forma final: `pago/simulado/` se reemplaza por el adaptador de pasarela y
  `cuenta/verificar/` por el proveedor de códigos.
- El archivo «Waiter Cuenta 30» llegó cortado (F2–F5 sin cuenta): se reconstruyen con la
  rotación de patrones de la familia y quedan marcadas `reconstruido: true` hasta tener el
  diseño completo.
