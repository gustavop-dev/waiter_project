# ADR — Registro central mínimo: resolución interna, tokens propios y credenciales cifradas

**Fecha:** 2026-09-05 · **Estado:** aceptada · **Afecta a:** `registry/`, `experience/` (Plan D)

## Contexto

El bloque 3 no puede consultar ninguna base de Odoo sin saber antes **a qué
inquilino** pertenece la URL pública (`/burger-house/poblado/t/8H2KQ7`). Eso
es el registro central. La arquitectura lo define como servicio Django aparte
con su propia base, sin lógica de negocio, y como el activo más sensible del
sistema porque guarda las credenciales de todos los inquilinos.

Construirlo entero (suscripciones, métricas de ROI, rotación) antes de tener
un solo comensal pidiendo sería invertir el orden. Hace falta lo mínimo que
desbloquea el bloque 3 sin comprometer lo que después no se puede cambiar: el
esquema de tokens y cómo se guardan las credenciales.

## Decisión

1. **Contrato interno, no público.** El registro expone una sola operación,
   `GET /internal/v1/resolve/<restaurante>/<sede>[/t/<token>]`, protegida con
   una clave compartida en cabecera (`X-Internal-Key`). Solo la llama el
   bloque 3 (y mañana facturación). Nunca se expone a Internet.
2. **El token de mesa es nuestro.** Se emite en el registro con la constraint
   `UNIQUE (sede, token)` que Odoo no tiene, sobre un alfabeto sin caracteres
   ambiguos (sin 0/O/1/I) y 6 posiciones: legible en una placa, ~1.000
   millones de combinaciones por sede. Se puede revocar (`active=False`) sin
   reimprimir nada: la placa apunta al registro, no a Odoo.
3. **Credenciales cifradas en reposo** con Fernet (`cryptography`), clave en
   variable de entorno separada del `SECRET_KEY` de Django. El registro
   descifra solo al resolver; nunca las lista ni las expone en admin.
4. **Un usuario de servicio por inquilino** en Odoo. En la demo es `admin`;
   el aprovisionamiento real crea uno con permisos de POS solamente.
5. **Python 3.12 en la VM de desarrollo.** La plantilla fija 3.14.7; no está
   instalable sin privilegios. Se aplica la misma regla de respaldo que con
   Node: se documenta, no se baja el pin de la plantilla, y las dependencias
   se eligen compatibles con ambos (Django 6.1 soporta 3.12 a 3.14).

## Alternativas descartadas

- **Registro dentro de `experience/`** como una app más. Rompe la regla de
  dependencia (el bloque 3 tendría acceso directo a credenciales de todos
  los inquilinos) y hace imposible desplegarlos con distinta superficie de
  ataque.
- **Usar `restaurant.table.identifier` de Odoo como token público.** 32 bits
  sin unicidad, sin revocación y visible por el endpoint de autoservicio de
  Odoo (hallazgo del spike).
- **JWT firmados como token de mesa.** No caben en una placa NFC legible y no
  aportan nada que la constraint no dé.

## Consecuencias

- El bloque 3 depende del registro en cada resolución de URL; se cachea por
  minutos en el bloque 3 para no golpearlo en cada petición del comensal.
- Rotar la clave Fernet exige un comando de re-cifrado (pendiente, documentado
  en el plan).
- Las métricas de ROI y suscripciones entran en el registro cuando el Plan C
  las necesite; el esquema de hoy no las bloquea.
