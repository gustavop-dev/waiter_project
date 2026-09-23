# Mesero en línea · siguiente etapa

Estado: propuesta de implementación después de las microanimaciones. No es una
funcionalidad entregada. El asistente actual es un cuestionario de ocho pasos
con recomendaciones calculadas en el navegador.

## Experiencia buscada

El comensal conversa sobre lo que le provoca. El mesero hace una pregunta corta
cuando necesita aclarar algo y recomienda hasta tres platos con foto, precio,
un motivo concreto y acceso a la ficha. Ejemplo: «Tengo hambre, quiero algo
con pollo y gastar menos de $35.000». Si después pide «algo más ligero», conserva
las preferencias anteriores. Puede cambiar de opinión o empezar de nuevo.

Se propone comenzar por texto; está pendiente la preferencia del usuario sobre
incluir voz desde el inicio. No se presupone aún proveedor, modelo ni credenciales.

## Encaje en el proyecto

- `diner/`: conversación, sugerencias para empezar, estado de respuesta, reintento
  y tarjetas que reutilizan los platos y las acciones del menú actual.
- `experience/`: conversación vinculada al comensal y su sesión, acceso al
  catálogo de la sede y adaptador del proveedor de IA. Las credenciales del
  proveedor permanecen en el servidor.
- El cliente envía mensajes; el servidor resuelve contexto y productos. Los
  IDs recomendados se validan contra el catálogo vigente antes de responder.
  Fotos, precios y disponibilidad los aporta Experience, no el texto del modelo.
- Añadir al carrito requiere la acción del comensal y usa el flujo existente.
  Recomendar no crea ni confirma pedidos, reservas o pagos.

## Primera entrega comprobable

1. Saludo con el nombre del mesero configurado por el restaurante y entrada de texto.
2. Conversación que conserva preferencias de comida, presupuesto e ingredientes
   que el comensal quiere o no quiere. Una pregunta cada vez, sin imponer el quiz.
3. Recomendaciones del catálogo disponible con explicación breve y alternativa
   cuando no hay coincidencias. No inventar platos ni completar nutrición ausente.
4. Tratar los datos demo como ejemplos. Una preferencia dietaria o una alergia
   no se convierte en una garantía de seguridad; cuando falta información se
   propone consultar al personal, usando el contacto que ya existe.
5. Conservar el texto al fallar la conexión, permitir cancelar la respuesta y
   reintentar sin duplicar mensajes. Limitar longitud e historial por conversación.
6. Verificar aislamiento entre comensales/sedes, respeto del presupuesto,
   exclusión de productos agotados y ausencia de escrituras desde vista previa.

La voz puede incorporarse a la misma conversación: entrada transcrita editable,
respuesta hablada opcional y controles visibles de inicio/detención del micrófono.
