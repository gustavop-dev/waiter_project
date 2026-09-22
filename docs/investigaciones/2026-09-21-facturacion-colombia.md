# Facturación del POS en Colombia

Revisión del 21 de septiembre de 2026. Alcance: reglas generales, diagnóstico del proyecto y preparación del flujo. No determina el régimen particular del restaurante: las responsabilidades del RUT, excepciones, IVA/INC y numeración deben confirmarse con su contador antes de habilitar emisión fiscal.

## Reglas que afectan al producto

- **Cada operación debe quedar soportada cuando el vendedor está obligado a facturar.** El artículo 615 del Estatuto Tributario establece la obligación general y existen excepciones expresas. El efectivo no constituye por sí mismo una excepción. Filtrar ventas para consultarlas no modifica su tratamiento fiscal. [DIAN: obligados a facturar](https://www.dian.gov.co/impuestos/sociedades/Paginas/obligadosfacturar.aspx).
- **Factura electrónica y POS electrónico son documentos distintos.** Exigen generación, transmisión, validación y entrega, con reglas especiales de contingencia. La factura lleva CUFE; el equivalente electrónico, CUDE. Contabilizar un documento o imprimir un PDF no acredita validación DIAN. La normativa vigente está compilada en la Resolución 000227 de 2025, especialmente los artículos 1.5.1.2.2.1, 1.5.1.3.2.4 y 1.5.1.5.7.1. [Resolución compilada](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm).
- **El POS electrónico no tiene el antiguo límite de cinco UVT del POS tradicional.** No implementar aquel límite como regla actual del documento electrónico. [DIAN: comunicado 009 de 2024](https://www.dian.gov.co/Prensa/Paginas/NG-Comunicado-de-prensa-009-22-01-2024.aspx).
- **Identificación del comprador:** existe consumidor final cuando no suministra identificación. La Resolución 000202 de 2025 simplifica los datos y regula su consulta. No exigir copia del RUT. El correo no es obligatorio si el comprador opta por representación impresa. [Resolución 000202 de 2025](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0202_2025.htm), [DIAN: servicio de consulta de identificación](https://www.dian.gov.co/Prensa/Paginas/NG-Comunicado-de-Prensa-026-2025.aspx).

## Diagnóstico del proyecto

`lib/services/invoices.ts` consulta `pos.order` y `account.move`. `invoiceOrder` asigna un cliente y ejecuta `action_pos_order_invoice`. Esta ruta no implementa envío al motor fiscal, recepción de respuesta DIAN, CUFE/CUDE, XML firmado ni seguimiento de contingencias. La arquitectura del repositorio ya separaba el motor fiscal como un bloque pendiente.

La pantalla confundía esta capacidad contable con emisión y mostraba solo los últimos 60 registros. Además, el contenedor flex comprimía las tarjetas de ventas hasta convertirlas en líneas. La selección resultaba invisible.

## Cambios realizados

- Tabla con referencia, fecha en Bogotá, cliente, medio de pago, importe y acciones explícitas. El detalle aparece al elegir Revisar o Ver detalle.
- Búsqueda y paginación en servidor. El listado pendiente consulta ventas sin factura contable, antes de aplicar el límite.
- Filtros por medio de pago para consulta y conciliación. No existe exclusión fiscal ni escritura al cambiar un filtro. Los pagos combinados conservan todos sus medios y el valor íntegro de la venta; el cambio se netea dentro del mismo medio.
- Estados y acciones contables identificados como tales. La pantalla informa que no acredita validación DIAN.
- Manejo de carga y errores. Un fallo de consulta no se presenta como ausencia de pendientes.
- Reintentar una creación cuya factura ya existe devuelve esa factura sin reasignar su cliente.

## Trabajo necesario para emisión fiscal real

1. Confirmar responsabilidades tributarias y configuración por empresa; definir factura electrónica/POS electrónico y tratamiento de devoluciones, anticipos, impuestos y propinas.
2. Elegir y habilitar la solución fiscal, preparar numeración, certificado y pruebas con el proveedor/DIAN. [DIAN: requisitos para facturar electrónicamente](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/que-requieres-para-factura-electronicamente/).
3. Integrar emisión por operación con identificador estable, persistencia y reintentos sin duplicación. La búsqueda y los filtros visuales no determinan qué operaciones se emiten.
4. Guardar respuesta fiscal verificable y artefactos; diferenciar por documento pendiente, validado, rechazado y contingencia. Entrega y correcciones requieren trazabilidad; no simular validación a partir de un estado contable.
5. Integrar notas de crédito/ajuste y su referencia al documento original. Probar el circuito completo en habilitación antes de producción.

Esta entrega no emite documentos fiscales, no migra ventas históricas y no declara instalada una conexión DIAN. Las verificaciones en navegador fueron de lectura; la creación contable y sus reintentos se verificaron con servicios simulados.

## Etapa contable del POS — alcance acordado

La integración DIAN se implementará al terminar esta etapa. El circuito previsto por operación es **venta confirmada → revisión → asiento contable → transmisión/validación DIAN → entrega fiscal**. Es un orden de implementación y procesamiento; no habilita a posponer la obligación de facturar hasta el cierre mensual. Mientras la integración esté pendiente, ni el PDF de Odoo ni la etiqueta «Contabilizada» acreditan emisión fiscal.

### Referencias colombianas y decisiones de producto

1. **Marco contable según la empresa.** El DUR 2420 de 2015 y sus modificaciones compila los marcos aplicables a los grupos 1, 2 y 3. No se asigna un grupo NIIF ni una política contable por el solo hecho de ser restaurante. La aplicación conserva la contabilidad de Odoo; no crea un segundo libro paralelo. [DUR 2420](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=76745).
2. **Partida doble, soportes y trazabilidad.** Se consultan empresa, diario, fecha contable, venta de origen, cuentas y débitos/créditos del asiento real. El indicador «Asiento verificado» exige documento publicado, partidas existentes, cuentas presentes y balance a precisión de la moneda. Es un control técnico, no una certificación de todas las políticas o del régimen fiscal. Los soportes y comprobantes se conservan ligados a la venta. [Supersociedades: libros y soportes, apartados 1.1 y 1.9](https://www.supersociedades.gov.co/en/web/nuestra-entidad/cap-1-libros-de-contabilidad).
3. **Venta e impuesto por separado.** Se muestran valores netos, impuestos, propina y total. No se impone IVA 19 % o INC 8 % a todos los restaurantes: se respetan impuestos y posiciones fiscales configurados para cada empresa/producto, que requieren validación del responsable contable. La DIAN distingue el tratamiento de establecimientos bajo franquicia. [Concepto DIAN 002575 de 2025](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_2575_2025.htm).
4. **Propinas del personal.** La Ley 1935 de 2018 define su voluntariedad y destinación a la cadena de servicio. Como implementación contable de esa obligación, se exige cuenta de pasivo corriente para el producto de propinas y ausencia de impuestos de venta en sus líneas. El administrador puede escoger una cuenta existente de su empresa; no se inventa un código PUC universal ni se modifican asientos históricos. La distribución y pago al personal queda fuera del subflujo de facturación. [Ley 1935](https://www.funcionpublica.gov.co/eva/gestornormativo/norma_pdf.php?i=87873).
5. **Cobro y causación son distintos.** El ingreso no se vuelve a registrar al recibir dinero; se usa la conciliación nativa de pagos/facturas del POS de Odoo. Se conservan estados pagada, parcial, en proceso, pendiente y revertida, junto al saldo por cobrar. Los medios de pago son filtros de consulta. No se introduce exclusión de ventas por efectivo.
6. **Correcciones.** La consulta incluye notas crédito del POS y muestra el documento de origen cuando existe. No se añade un botón para borrar o alterar un asiento publicado. La devolución sigue el circuito nativo del POS y el registro conserva el vínculo al original. La nota contable tampoco se presenta como nota electrónica validada.
7. **La validación fiscal es una etapa distinta.** El circuito de validación previa de la DIAN concluye antes de la entrega de la factura fiscal, con las contingencias regladas que correspondan. [DIAN: validación previa](https://www.dian.gov.co/impuestos/factura-electronica/factura-electronica/Paginas/validacion-previa.aspx).

### Implementación de esta etapa

- `pos.order.waiter_billing_review`: consulta sin escrituras de cliente, empresa, diario, moneda, cuentas, propinas, suma de líneas/impuestos y pagos netos. Flujo inicial en COP. Las diferencias de redondeo se señalan para revisión, sin ajustes silenciosos.
- `pos.order.waiter_account_invoice`: permisos, bloqueo del pedido, recuperación de factura existente, revisión repetida en servidor y creación/conciliación en una transacción. Un error revierte la asignación del cliente y el asiento. Desactiva el envío automático de PDF en esta acción. Compara el total final del documento con la venta antes de confirmar el éxito.
- `account.move.waiter_accounting_detail`: lectura del asiento real y resultado técnico calculado; no almacena una bandera manual de aprobación ni un estado DIAN ficticio.
- Configuración contable en la pantalla: muestra empresa/diario/moneda y permite asignar el pasivo de propinas desde las cuentas existentes de la empresa. El cambio afecta nuevos asientos.
- Listado restringido a documentos asociados al POS, incluye facturas y notas crédito, y conserva búsqueda/paginación. Detalle con descuentos por línea, propina, estados de cobro, saldo, impuestos contabilizados y partidas desplegables.

### Límites para dar la contabilidad por terminada

La comprobación de un asiento no reemplaza la configuración inicial del restaurante. En los datos de desarrollo se encontró el producto de propinas asociado a una cuenta de ingreso; ahora la revisión bloquea la creación de documentos que usen esa configuración y permite corregirla explícitamente. No se cambiaron políticas tributarias, cuentas de productos o registros históricos de forma masiva. También deben revisarse los impuestos y las cuentas de ventas sembrados en la demo antes de operar un restaurante real.

Esta etapa cubre el registro de ventas del POS. No constituye la implementación de nómina, reparto de propinas, declaraciones tributarias, estados financieros ni todos los procesos del cierre contable. La futura salida fiscal deberá consumir documentos confirmados, preservar sus identificadores y gestionar reintentos, rechazos y contingencias; sigue pendiente de implementación.

### Verificación de la etapa contable

- 11 pruebas Jest de servicio/interfaz: consulta completa de ventas y pagos, filtros sin escrituras, paginación, errores de consulta, llamada contable atómica, inclusión de notas crédito y bloqueo de creación cuando falla la revisión.
- 7 pruebas de Odoo en base aislada con los datos/configuración de desarrollo: creación real y reintento, rollback del cliente cuando falla la creación, permisos, borrador sin verificar, discrepancias de importes, propina contabilizada en pasivo y devolución ligada a la factura original. Resultado: 0 fallos y 0 errores. La base de prueba tiene tareas programadas y servidor de correo desactivados.
- Typecheck y ESLint de los archivos del flujo pasan.
- Revisión de navegador en 1194×834, claro/oscuro: configuración, selección de cliente, habilitación de acción, detalle del asiento y partidas; sin desbordamiento horizontal. No se crearon facturas ni se cambiaron cuentas en la base compartida durante esta revisión.

## Venta general y separación del cobro

- La Resolución 000227 de 2025, artículo **1.5.1.2.2.1, numeral 3.3**, admite «consumidor final» y **222222222222** cuando el adquirente no proporciona su identificación. El número es genérico, no un NIT real al que debamos inventar un dígito de verificación. Para entregas fuera del establecimiento debe conservarse la dirección correspondiente a la operación. [Texto DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm).
- Para el equivalente electrónico POS, el artículo **1.5.1.3.2.4, parágrafo 1**, también contempla consumidor final, con límites para que el comprador lo use como soporte de costos, gastos e impuestos descontables. Si el comprador solicita identificación, se selecciona su contacto antes de emitir. No se exige un correo ficticio ni copia del RUT.
- «Venta general» no consolida las ventas del día ni elimina obligaciones fiscales: cada operación mantiene pedido, pagos, referencia e identificación del documento.
- El cobro existente (`orderStore.settle` / `action_pos_order_paid`) sigue siendo independiente de la pantalla administrativa. Se puede cobrar sin cliente identificado y entregar el comprobante de pago. Se rotuló expresamente ese comprobante para evitar confundirlo con una factura electrónica o un equivalente electrónico validado.
- La futura emisión fiscal debe invocarse automáticamente desde el flujo de venta y cumplir validación/entrega en el momento correspondiente. Administración es una herramienta de consulta, conciliación y atención de incidencias; no una aprobación humana obligatoria para cada venta. Hoy la integración DIAN sigue sin estar implementada.

### Cambios aplicados

- Asignación efectiva en la empresa Burger House / POS Salón del producto de propinas a **281500 — Ingresos recibidos para terceros**, cuenta existente de pasivo corriente. Sin modificaciones de asientos históricos. Script idempotente: `odoo/provisioning/configure-billing-colombia.py`.
- Opción explícita «Venta general · Consumidor final» en revisión de la venta, seleccionada inicialmente cuando no hay cliente asignado. Los clientes identificados se conservan y pueden seleccionarse en el mismo panel.
- El tercero genérico se crea o reutiliza por empresa dentro de la transacción de contabilización. Consultar la revisión no crea contactos. El bloqueo de empresa serializa su creación y el bloqueo de pedido preserva la recuperación de una factura ya creada, sin reasignarle el cliente al reintentar.
- En esta etapa el contacto guarda identificación genérica con el tipo de identificación personal de la localización colombiana; el futuro adaptador fiscal debe aplicar las reglas específicas de consumidor final del anexo DIAN, sin tratar ese número como una cédula real.

Verificación de esta ampliación: 15 pruebas de interfaz/servicios/cobro y 8 pruebas de Odoo aprobadas. La prueba nueva comprueba que cobrar no exige cliente ni factura contable, que la consulta no crea contactos, que consumidor final se reutiliza y que dos ventas generan documentos separados. Typecheck y ESLint correctos.
