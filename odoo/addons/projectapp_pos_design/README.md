# projectapp_pos_design

Aplica el **sistema de diseño Waiter v1.0** sobre el punto de venta de Odoo.

## Cómo se carga

Los archivos entran al bundle `point_of_sale._assets_pos`, que Odoo compone
cargando primero los assets del core y después los de los módulos. Por eso estas
reglas ganan a igualdad de especificidad sin necesidad de `!important` salvo
donde Odoo ya lo usa.

## Las tres capas

| Archivo | Qué hace | Riesgo en actualizaciones de Odoo |
|---|---|---|
| `01_tokens.css` | Solo variables. Transcripción fiel del sistema de diseño. | Ninguno |
| `02_base.css` | Tipografía, superficie plana, estados semánticos. | Bajo |
| `03_pos.css` | Mapeo sobre las clases reales del POS. | **Medio.** Odoo puede renombrar clases. |

Los selectores de `03_pos.css` están marcados `[verificado]` o `[por validar]`.
Los verificados se comprobaron contra la instancia real; los demás salen de
convenciones de Bootstrap y de Odoo y hay que confirmarlos en pantalla.

## Reglas del sistema que el CSS no puede imponer

Estas hay que respetarlas al componer cada pantalla:

- **Nunca dos botones Brasa en la misma vista.**
- **Todo estado lleva texto además del color.** Un 8% de los meseros no
  distingue rojo de verde.
- **La serif solo en ≥24px y frases cortas.** Nunca en botones, etiquetas ni
  tablas.
- **El color del restaurante nunca entra a la operación.** Aquí solo Brasa y
  semánticos; `--r-brand` pertenece a la experiencia del comensal.

## Tensión detectada en el sistema de diseño

La sección de tacto fija **48px como mínimo absoluto**, pero la densidad
«Compacta» define **44px**. Se implementó tal cual (44px en compacta), pero
conviene resolverlo: o el mínimo absoluto son 44, o «Compacta» sube a 48.

## Pendiente

- **Auto-hospedar las fuentes.** Hoy se cargan de Google Fonts. El POS debe
  funcionar con la red caída; sin fuentes, la tipografía cae a Georgia y
  system-ui y se rompe la escala vertical.
- Validar en pantalla los selectores `[por validar]`.
- Estados de mesa: las clases `.w-free`, `.w-busy`, etc. están definidas pero
  aún no las aplica nadie. Requiere `t-inherit` sobre la plantilla del plano.
