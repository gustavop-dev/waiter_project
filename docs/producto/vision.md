# ProjectApp Smart Restaurant
## Descripción del producto

> Documento fuente del producto, redactado por el equipo el 2026-09-04.
> Es la referencia de alcance para todas las decisiones técnicas posteriores.

### 1. Resumen

**ProjectApp Smart Restaurant** es una plataforma SaaS para restaurantes orientada a reducir la carga operativa del personal de mesa y aumentar las ventas por cliente mediante autoservicio, inteligencia artificial y automatización del proceso completo de atención.

El producto no busca competir únicamente como un POS tradicional. Su propuesta principal es permitir que el cliente pueda **sentarse, consultar el menú, recibir recomendaciones, realizar su pedido, pagar y recibir su factura electrónica sin depender permanentemente de un mesero**.

La interacción inicia principalmente mediante un **NFC instalado en cada mesa**, acompañado de un QR como mecanismo alternativo.

El objetivo económico central del producto es:

> **Permitir que un restaurante atienda más mesas con menos carga operativa de meseros, manteniendo o mejorando la experiencia del cliente y aumentando el ticket promedio mediante recomendaciones inteligentes.**

---

# 2. Problema

En un restaurante tradicional, una proporción importante del tiempo del personal de mesa se consume en tareas repetitivas:

- entregar o explicar la carta;
- responder preguntas frecuentes sobre productos;
- recomendar platos;
- tomar pedidos;
- registrar pedidos en el POS;
- modificar pedidos;
- consultar disponibilidad;
- llevar la cuenta;
- dividir cuentas;
- transportar el datáfono;
- esperar el pago;
- gestionar propinas;
- entregar comprobantes o facturas.

Estas tareas generan:

- mayores costos laborales;
- tiempos de espera;
- menor capacidad de atención en horas pico;
- errores de digitación;
- menor rotación de mesas;
- pérdida de ventas adicionales;
- dependencia directa del número de meseros disponibles.

ProjectApp Smart Restaurant busca automatizar la mayor cantidad posible de estas interacciones.

---

# 3. Propuesta de valor

## Propuesta principal

**Opera más mesas con menos carga operativa de personal.**

El cliente puede realizar autónomamente gran parte del proceso de atención:

**Tocar → consultar → pedir → pagar → facturar.**

El personal del restaurante puede concentrarse principalmente en:

- hospitalidad;
- preparación;
- entrega de productos;
- limpieza;
- resolución de excepciones;
- atención personalizada cuando realmente sea necesaria.

## Segunda propuesta de valor

**Aumentar el ticket promedio mediante un Mesero IA.**

La inteligencia artificial no será simplemente un chatbot de soporte. Funcionará como un vendedor digital capaz de:

- conocer toda la carta;
- entender lenguaje natural;
- escuchar al cliente;
- conversar por voz;
- conocer ingredientes;
- entender restricciones alimentarias;
- trabajar con presupuestos;
- recomendar productos;
- sugerir acompañamientos;
- hacer cross-selling;
- hacer upselling;
- construir el carrito del cliente;
- modificar el pedido;
- responder preguntas frecuentes.

---

# 4. Experiencia principal del cliente

## 4.1 Identificación de la mesa mediante NFC

Cada mesa tendrá un NFC asociado de forma única.

Ejemplo:

```text
Restaurante: Burger House
Sede: Poblado
Mesa: 14
Identificador: 8H2KQ7
```

El cliente acerca su celular al NFC.

El NFC abre una URL similar a:

```text
https://restaurant.projectapp.co/t/8H2KQ7
```

El identificador permite determinar automáticamente:

- restaurante;
- sede;
- mesa;
- sesión activa;
- menú disponible.

No es necesario que el cliente seleccione manualmente la mesa.

## 4.2 QR como respaldo

Cada placa física deberá incluir:

- NFC;
- QR;
- número visible de mesa;
- instrucción sencilla.

Ejemplo:

> **Toca o escanea para pedir**

Esto garantiza compatibilidad con dispositivos donde NFC no esté disponible o habilitado.

---

# 5. Sin obligación de instalar una aplicación

La experiencia principal funcionará desde una **web app / PWA**.

El cliente no deberá:

- descargar una aplicación;
- registrarse obligatoriamente;
- crear una cuenta;
- seleccionar manualmente el restaurante;
- buscar la sede;
- seleccionar la mesa.

El objetivo es minimizar completamente la fricción.

Flujo:

```text
NFC / QR
   ↓
Web App
   ↓
Mesa identificada
   ↓
Menú / Mesero IA
   ↓
Carrito
   ↓
Pedido
   ↓
Pago
   ↓
Factura
```

---

# 6. Mesero IA

El Mesero IA será uno de los principales diferenciadores del producto.

## 6.1 Interacción por voz

El cliente podrá presionar un botón de micrófono y hablar directamente.

Ejemplo:

> "Tengo bastante hambre. Quiero algo con carne, que no sea picante y máximo de cincuenta mil pesos."

La IA podrá responder:

> "Te recomiendo la Burger Angus. Es una de las opciones más contundentes, no es picante y cuesta $36.900. Puedes acompañarla con papas trufadas por $8.900 y continúas dentro de tu presupuesto."

El usuario podrá responder:

> "Agrégala, pero sin cebolla."

Y la IA ejecutará la acción correspondiente sobre el carrito.

---

# 7. Capacidades del Mesero IA

El agente deberá poder consultar:

- productos;
- categorías;
- precios;
- ingredientes;
- modificadores;
- acompañamientos;
- promociones;
- disponibilidad;
- productos agotados;
- restricciones;
- alérgenos;
- productos populares;
- combos;
- historial del cliente cuando exista consentimiento;
- reglas comerciales configuradas por el restaurante.

El agente podrá responder preguntas como:

> "¿Qué tienen vegetariano?"

> "¿Qué tiene menos calorías?"

> "¿Qué hamburguesa me recomiendas?"

> "Somos cuatro y tenemos $180.000."

> "Quiero algo parecido a una carbonara pero sin cerdo."

> "¿Qué bebida combina con este plato?"

> "Quiero algo dulce pero no tan pesado."

---

# 8. IA orientada a ventas

La inteligencia artificial deberá contribuir al aumento del ticket promedio.

## Upselling

Ejemplo:

> "Por $6.000 adicionales puedes cambiar las papas tradicionales por papas trufadas."

## Cross-selling

Ejemplo:

> "La limonada de coco suele combinar muy bien con esta hamburguesa. ¿Quieres agregar una por $9.900?"

## Combos dinámicos

Ejemplo:

```text
Somos 3 personas
Presupuesto: $150.000

Recomendación:

2 pizzas              $76.800
1 entrada para compartir $29.900
3 bebidas             $38.700

Total                $145.400
```

El cliente podrá agregar toda la recomendación al carrito con una sola acción.

---

# 9. Menú tradicional

El uso de inteligencia artificial nunca será obligatorio.

La experiencia deberá permitir tres caminos:

```text
🎙️ Hablar con el Mesero IA

⌨️ Escribirle al Mesero IA

📖 Ver menú
```

Un cliente que ya sabe lo que desea podrá comprar sin interactuar con la IA.

---

# 10. Pedido autónomo

Cuando el cliente confirme el carrito:

```text
Mesa 14
   ↓
Pedido #1942
   ↓
Sistema operativo
   ↓
KDS / Cocina
```

Ejemplo:

```text
NUEVO PEDIDO

Mesa 14
Pedido #1942

2 × Classic Burger
    - Sin cebolla
    - Término medio

2 × Club Colombia

PAGADO ✓
```

El pedido deberá estar asociado automáticamente con la mesa que originó la sesión.

---

# 11. Varias personas en una misma mesa

Una misma mesa podrá tener múltiples clientes utilizando sus propios celulares.

Ejemplo:

```text
MESA 12

Cliente A
Hamburguesa       $34.000
Cerveza           $14.000

Cliente B
Pizza             $31.000
Coca-Cola          $6.000
```

El sistema deberá permitir:

- pedidos independientes;
- carrito compartido;
- consumo identificado por persona;
- pagar únicamente lo propio;
- dividir en partes iguales;
- pagar un monto personalizado;
- pagar toda la mesa.

---

# 12. Pago autónomo

El cliente deberá poder pagar directamente desde su dispositivo.

Métodos potenciales:

- tarjetas;
- PSE;
- Nequi;
- Google Pay;
- Apple Pay;
- Wompi;
- Mercado Pago;
- Bold;
- otros adquirentes disponibles.

La pasarela utilizada dependerá de integraciones y condiciones comerciales.

## Flujo

```text
Cuenta
   ↓
Todo / Lo mío / Dividir
   ↓
Propina
   ↓
Medio de pago
   ↓
Pago aprobado
   ↓
Mesa conciliada
```

---

# 13. Facturación electrónica DIAN

La facturación electrónica será una funcionalidad estándar del producto y no un sistema externo visible para el restaurante.

Después del pago:

```text
Pedido
   ↓
Pago aprobado
   ↓
ProjectApp Billing
   ↓
Motor de facturación electrónica
   ↓
DIAN
   ↓
CUFE + XML + representación gráfica
```

Inicialmente se contempla utilizar una solución como **FacturaLatam Enterprise** como motor fiscal, instalada dentro de infraestructura controlada por ProjectApp.

Cada restaurante asumirá los costos regulatorios o certificados digitales que correspondan a su empresa.

El objetivo comercial será ofrecer:

> **Facturación electrónica incluida en el SaaS.**

---

# 14. Odoo Community como infraestructura operativa

ProjectApp Smart Restaurant podrá utilizar **Odoo Community** como motor operativo para evitar desarrollar desde cero funcionalidades estándar de un ERP/POS.

Odoo funcionará principalmente como infraestructura interna.

Áreas potencialmente cubiertas:

- productos;
- variantes;
- categorías;
- inventario;
- bodegas;
- ventas;
- POS;
- sesiones de caja;
- usuarios;
- permisos;
- mesas;
- órdenes;
- cocina;
- clientes;
- devoluciones;
- movimientos;
- reportes;
- multiempresa.

La estrategia será evitar modificaciones innecesarias al core de Odoo.

ProjectApp desarrollará módulos propios alrededor del núcleo.

Ejemplo:

```text
Odoo Community
│
├── POS
├── Inventario
├── Productos
├── Usuarios
├── Clientes
│
└── ProjectApp Modules
    ├── projectapp_nfc
    ├── projectapp_self_order
    ├── projectapp_ai_waiter
    ├── projectapp_payments
    ├── projectapp_dian
    ├── projectapp_analytics
    ├── projectapp_loyalty
    └── projectapp_restaurant
```

---

# 15. Arquitectura funcional

```text
                        CLIENTE
                           │
                    NFC / QR mesa
                           │
                           ▼
                ┌────────────────────┐
                │ ProjectApp Web App │
                │                    │
                │ Menú               │
                │ Mesero IA          │
                │ Carrito            │
                │ Pago               │
                │ Estado pedido      │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ ProjectApp Backend │
                └─────────┬──────────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
    Odoo Community     Pagos        ProjectApp Billing
          │                                 │
          │                                 ▼
    POS / Inventario                  FacturaLatam
    Mesas / Cocina                         │
    Productos                              ▼
                                         DIAN
```

---

# 16. Dashboard orientado a ROI

El dashboard deberá diferenciarse de un POS tradicional.

No bastará con mostrar únicamente ventas.

El restaurante debe poder entender cuánto trabajo está automatizando ProjectApp.

Ejemplo:

```text
AUTOMATIZACIÓN HOY

Pedidos totales
184

Pedidos autónomos
147
79,9 %

Pagos autónomos
132
71,7 %

Interacciones de mesero evitadas
326

Horas operativas automatizadas
18,4 h

Ventas influenciadas por IA
$1.820.000

Upsells IA aceptados
31,8 %

Incremento de ticket por IA
+$6.340

Tiempo promedio para pedir
2m 14s

Tiempo promedio para pagar
38s
```

---

# 17. Métrica principal del producto

La métrica más importante deberá ser:

> **Horas de trabajo de atención necesarias por cada 100 pedidos.**

Ejemplo:

```text
Antes de ProjectApp:
18 horas / 100 pedidos

Después de ProjectApp:
11 horas / 100 pedidos
```

Resultado:

> **39 % menos carga operativa para procesar la misma cantidad de pedidos.**

Esta métrica conecta directamente el software con el ahorro económico del restaurante.

---

# 18. Otras métricas fundamentales

## Automatización

- porcentaje de pedidos autónomos;
- porcentaje de pagos autónomos;
- porcentaje de pedidos que requieren intervención humana;
- interacciones automatizadas;
- horas operativas estimadas ahorradas.

## Ventas

- ticket promedio;
- ticket promedio usando IA;
- ticket promedio sin IA;
- upsells ofrecidos;
- upsells aceptados;
- cross-sells aceptados;
- ventas atribuibles a recomendaciones.

## Operación

- tiempo para realizar pedido;
- tiempo de preparación;
- tiempo hasta entrega;
- tiempo hasta pago;
- rotación de mesas;
- pedidos por mesa;
- pedidos por hora;
- utilización de mesas.

---

# 19. A/B testing del Mesero IA

Una parte esencial del producto será comprobar si la IA aumenta las ventas.

Ejemplo:

```text
Grupo A
Menú tradicional

Grupo B
Menú + Mesero IA
```

Comparar:

- ticket promedio;
- cantidad de productos por pedido;
- bebidas;
- entradas;
- postres;
- upgrades;
- tiempo de decisión;
- conversión;
- frecuencia de modificaciones.

El objetivo es cuantificar:

> **Cuánto ingreso adicional genera el Mesero IA.**

---

# 20. Público objetivo inicial

No todos los restaurantes son igualmente adecuados.

## Perfil ideal

Restaurantes con:

- 15 a 50+ mesas;
- alto volumen de clientes;
- horas pico;
- varios meseros por turno;
- menú relativamente amplio;
- necesidad de reducir tiempos de atención;
- alta rotación;
- operación casual o semi-casual.

## Segmentos potenciales

- hamburgueserías;
- pizzerías;
- comida mexicana;
- sushi;
- gastrobares;
- cervecerías;
- casual dining;
- restaurantes universitarios;
- patios de comida;
- restaurantes de centros comerciales;
- cafés con servicio en mesa.

## Menos prioritarios inicialmente

Restaurantes de lujo donde gran parte del valor de la experiencia depende de un servicio humano intensivo.

---

# 21. Diferenciadores principales

El producto no deberá intentar diferenciarse únicamente por tener un POS.

Los principales diferenciadores serán:

## 1. NFC por mesa

Entrada inmediata al contexto de la mesa con una interacción física simple.

## 2. Mesero IA por voz

El cliente podrá conversar naturalmente con un agente que conoce la carta.

## 3. IA transaccional

La IA no solamente responderá preguntas.

Podrá:

- recomendar;
- modificar;
- agregar;
- quitar;
- construir carrito;
- confirmar pedido.

## 4. IA de ventas

Upselling y cross-selling automatizados.

## 5. Pago autónomo

Eliminar gran parte de la fricción de solicitar la cuenta y esperar datáfono.

## 6. Facturación electrónica incluida

Una única plataforma para operar y facturar.

## 7. Medición del ahorro laboral

El software debe demostrar económicamente el valor entregado.

---

# 22. Competencia conceptual

## POS tradicional

Compite en:

- caja;
- inventario;
- productos;
- ventas;
- reportes.

Estas funciones serán consideradas commodity.

## Sistemas self-order

Compiten mediante:

```text
QR
 ↓
Menú
 ↓
Pedido
 ↓
KDS
 ↓
Pago
```

## ProjectApp Smart Restaurant

La propuesta será:

```text
NFC / QR
   ↓
Mesero IA por voz
   ↓
Recomendaciones
   ↓
Pedido autónomo
   ↓
Upselling IA
   ↓
Pago autónomo
   ↓
KDS
   ↓
Facturación electrónica DIAN
   ↓
Analítica de ROI
```

---

# 23. Ventaja estructural de ProjectApp

ProjectApp cuenta con capacidad interna de desarrollo de software e infraestructura propia.

Esto permite:

- iterar rápidamente;
- reducir dependencia de terceros;
- operar infraestructura centralizada;
- mantener bajo el costo marginal por restaurante;
- experimentar con nuevas funcionalidades;
- competir inicialmente con precios agresivos;
- integrar herramientas open source;
- desarrollar módulos propios;
- aprovechar economías de escala.

Los costos variables principales deberán concentrarse en:

- IA;
- procesamiento de pagos;
- certificados o elementos regulatorios;
- soporte;
- onboarding;
- hardware NFC;
- infraestructura incremental.

---

# 24. Hipótesis de precio

Durante validación:

## Piloto

**$149.000 – $199.000 COP / mes / sede**

Objetivo:

- adquirir primeros clientes;
- obtener datos;
- medir ROI;
- desarrollar casos de éxito;
- validar adopción.

## Early adopter

**$249.000 – $299.000 COP / mes / sede**

## Precio objetivo posterior

Una vez comprobado el ROI:

**$399.000 – $599.000 COP / mes / sede**

El precio definitivo deberá estar relacionado con el valor económico demostrado.

---

# 25. Hardware / onboarding

La instalación podrá incluir:

- placa NFC por mesa;
- QR de respaldo;
- identificación visual;
- configuración de mesas;
- importación de menú;
- parametrización de productos;
- configuración de métodos de pago;
- configuración de facturación;
- capacitación;
- configuración de KDS/POS.

Podrá existir una tarifa única de implementación independiente de la mensualidad.

---

# 26. MVP

El MVP no deberá intentar cubrir todo el ERP.

La primera versión deberá demostrar el flujo completo:

```text
Cliente toca NFC
       ↓
Mesa reconocida
       ↓
Menú
       ↓
Habla con Mesero IA
       ↓
IA recomienda
       ↓
Agrega productos
       ↓
Confirma pedido
       ↓
Cocina recibe pedido
       ↓
Cliente paga
       ↓
Factura electrónica
```

## Funcionalidades esenciales

- administración de restaurantes;
- sedes;
- mesas;
- NFC;
- QR;
- menú;
- productos;
- modificadores;
- carrito;
- Mesero IA;
- voz;
- pedidos;
- KDS;
- pagos;
- facturación electrónica;
- dashboard básico;
- cálculo inicial de automatización.

---

# 27. Funcionalidades que no son prioritarias para el MVP

Inicialmente no es necesario construir desde cero:

- nómina;
- contabilidad completa;
- CRM avanzado;
- reservas complejas;
- domicilios;
- marketplace;
- Rappi;
- programa de puntos avanzado;
- marketing automation;
- BI avanzado.

Estas funcionalidades podrán incorporarse posteriormente o aprovechar infraestructura existente de Odoo.

---

# 28. Experimento inicial

El objetivo inicial será desplegar el sistema en **2 o 3 restaurantes reales en Medellín**.

Duración sugerida:

**60 días.**

## Objetivos del experimento

Validar:

1. adopción del NFC;
2. porcentaje de clientes que utilizan autoservicio;
3. porcentaje que utiliza IA;
4. porcentaje que utiliza voz;
5. porcentaje de pedidos autónomos;
6. porcentaje de pagos autónomos;
7. reducción de interacciones del mesero;
8. reducción de horas operativas;
9. aumento del ticket promedio;
10. aceptación de recomendaciones;
11. disposición a pagar;
12. intención de continuar utilizando el sistema.

---

# 29. Hipótesis a validar

## Hipótesis principal

> Un restaurante puede atender la misma cantidad de clientes utilizando menos tiempo de personal de mesa cuando pedido y pago se automatizan.

## Hipótesis secundaria

> Una IA entrenada sobre el menú puede aumentar el ticket promedio mediante recomendaciones personalizadas.

## Hipótesis de UX

> NFC genera menos fricción que QR como mecanismo principal para iniciar la experiencia.

## Hipótesis comercial

> Restaurantes medianos están dispuestos a pagar entre $250.000 y $500.000 mensuales cuando el software demuestra un ROI claramente superior a su costo.

---

# 30. Visión de producto

A largo plazo, ProjectApp Smart Restaurant puede evolucionar desde una herramienta de self-service hacia un **sistema operativo inteligente para restaurantes**.

La plataforma deberá conectar:

```text
Clientes
Mesas
Pedidos
Cocina
Pagos
Facturación
Inventario
IA
Datos
Personal
```

La visión no es reemplazar completamente al personal de un restaurante.

La visión es:

> **automatizar las tareas operativas repetitivas para que menos personas puedan administrar una mayor cantidad de mesas y dedicar su tiempo a actividades donde la intervención humana realmente genera valor.**

---

# 31. Mensaje comercial

## Propuesta corta

> **Opera más mesas con menos carga operativa.**

## Explicación

> Tus clientes consultan, piden y pagan por sí mismos. Nuestro Mesero IA recomienda y vende mientras tu equipo se concentra en preparar, entregar y atender.

## Experiencia

> **Toca. Pide. Paga.**

## Versión orientada a ROI

> **ProjectApp automatiza la atención repetitiva de tu restaurante y te muestra exactamente cuánto tiempo y dinero estás ahorrando.**
