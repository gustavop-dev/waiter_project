# Meta + agente: conexión y límites

Actualización: el [chat del menú y núcleo compartido](2026-09-14-chat-menu.md) ya están activos con OpenAI y permiten añadir al carrito. La clave se configuró posteriormente por instrucción explícita del usuario. Los límites descritos abajo corresponden a la primera entrega local.

Estado de la primera entrega 2026-09-14: puente interno de cotización/confirmación al POS implementado;
planificador IA local implementado, todavía sin transporte Meta ni conversación persistente.
En esa primera entrega no se configuró la clave; ver actualización posterior arriba.

## Lo que necesitamos de Meta

1. Portafolio empresarial, app de desarrollador con WhatsApp, cuenta WhatsApp Business (WABA).
2. Número de prueba para el piloto; después registrar el número del restaurante.
3. WABA ID y Phone Number ID (este último no es el número telefónico).
4. Access token para la API. Para operación continua, token de usuario del sistema con
   `whatsapp_business_messaging` y `whatsapp_business_management`, según las operaciones.
5. App Secret para comprobar la firma de eventos y un Verify Token propio para el alta del webhook.
6. Endpoint HTTPS público, suscripción al campo `messages` y suscripción de la app a la WABA.
   La IP host-only 192.168.56.10 no es accesible desde Meta. Hace falta desplegar el receptor
   o configurar un túnel de desarrollo. No se ha expuesto ningún servicio automáticamente.
7. Para producción: completar los requisitos de cuenta, número, facturación y revisiones que
   Meta indique para esa cuenta. Para incorporar restaurantes ajenos, diseñar onboarding de
   proveedores/Embedded Signup; no asumir que el token del piloto habilita todos los clientes.

Fuente: [colección oficial de Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## Implementado en esta entrega

- Prompt versionado `experience/experience_app/prompts/waiter_v1.txt`.
- `services/waiter_agent.py`: una petición a Responses, sin herramientas, `store=false`,
  timeout y límite de salida. Modelo y clave exclusivamente en variables de entorno.
- Salida estricta: preguntar, recomendar, cotizar o humano. Validación local adicional:
  solo productos del catálogo recibido del servidor, disponibles, sin duplicados, cantidades 1–50.
- No acepta campos de precio, pagos, teléfonos, sede ni confirmación. No crea pedidos.
- Mensaje y descripciones van en un mensaje user separado del prompt developer fijo.
  Solo se envían campos permitidos del catálogo; no se adjuntan credenciales ni fichas de clientes.
  El texto que escriba el cliente sí viaja al proveedor; falta implementar política de retención
  y tratamiento de datos para el canal real. `store=false` no equivale a retención cero del proveedor.
- Errores/refusals/respuestas truncadas o inválidas fallan sin ejecutar acciones.
- Demo CLI carga catálogo del POS de la sede elegida, imprime propuesta y termina.
  No está expuesto por HTTP, no envía WhatsApp, no genera cotización ni confirma automáticamente.
- 17 pruebas del planificador y 9 del puente pasan con proveedor simulado. Verifican barreras
  del código, no constituyen una evaluación de resistencia del modelo a ataques reales.

Configurar en `experience/.env`, nunca en el navegador ni en el chat:

```dotenv
OPENAI_API_KEY=
WA_AGENT_MODEL=
```

Elegir un modelo disponible en el proyecto que soporte Responses + Structured Outputs.
Prueba manual desde `experience/` (consume API una vez configurada):

```bash
venv/bin/python manage.py demo_waiter_agent RESTAURANTE SEDE 'Quiero dos bowls de salmón'
```

La demo no tiene memoria: cada ejecución es independiente. Un resultado `cotizar` es una
propuesta que posteriormente deberá pasar al puente; `humano` no notifica aún a un empleado.
Los productos con variantes/combos siguen sujetos a rechazo seguro del puente existente.

## Siguiente implementación del canal

Meta → receptor firmado → bandeja persistente/deduplicación por message ID → trabajador →
conversación aislada por WABA/número/sede/remitente → planificador → validación → cotización POS →
resumen generado por el servidor → botón de confirmación → POS → respuesta WhatsApp.

- Verificar firma HMAC SHA256 del cuerpo original con App Secret antes de procesar POST.
  El Verify Token de GET no autentica los mensajes POST.
- Resolver sede y cliente desde el número receptor configurado y remitente verificado;
  nunca desde el texto ni la salida del modelo. Mantener la API interna fuera de Internet.
- Persistir evento antes de responder 200, procesar en cola y deduplicar reintentos.
  No esperar la respuesta del modelo dentro del webhook.
- Implementar topes por remitente/restaurante, presupuesto, historial acotado y salida de emergencia
  hacia operador; todavía no hay límites de gasto acumulado ni bandeja humana implementados.
- Confirmación explícita mediante botón ligado a remitente + sede + UUID + digest + caducidad.
  El modelo nunca obtiene la función confirmar. Un 'sí' interpretado por IA no autoriza el pedido.
- Generar resumen/precios/estado desde datos del servidor, no texto libre del modelo.
- Envíos sujetos a la ventana y políticas de WhatsApp; implementar plantillas donde correspondan.
- Evaluar conversaciones y ataques reales, alergias, ambigüedades, variantes, duplicados,
  caída del proveedor y aislamiento entre restaurantes antes del piloto con clientes.

Un prompt no garantiza inmunidad a prompt injection. El diseño limita sus consecuencias al
mantener permisos y operaciones críticas fuera del modelo.
Fuentes: [seguridad de agentes](https://developers.openai.com/api/docs/guides/agent-builder-safety),
[salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs).
