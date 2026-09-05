# Imágenes de demo del menú

Genera con la API de imágenes de OpenAI el lote mínimo de la
[especificación de imágenes](../../docs/diseno/2026-09-05-imagenes-menu.md), lo deja en el
formato que exige (recortes, JPG 85, < 180 KB, `{sku}_{recorte}.jpg`) y lo carga en Odoo.

Solo para demos, maquetas y placeholders. Una imagen generada no representa la porción
servida: en un local real va la sesión de fotos.

## Requisitos

- Python 3.12 con `requests` y `Pillow` (los del sistema sirven).
- `tools/imagenes/.env` con `OPENAI_API_KEY=...` (copiar de `.env.example`; `*.env` está
  ignorado por git y la clave nunca va en docs ni commits). Para `subir_odoo.py`, además
  `ODOO_URL`, `ODOO_DB`, `ODOO_LOGIN` y `ODOO_PASSWORD`.

## Uso

```bash
cd tools/imagenes
python3 generar.py generar                 # 24 tomas × 3 variantes = 72 llamadas, calidad low
python3 generar.py generar --solo HAMB-ANGUS --variantes 1   # prueba de humo
python3 generar.py hojas                   # rehace las hojas de contacto (salida/hojas/)
python3 generar.py finalizar --seleccion seleccion.json      # copia la variante elegida (JPG + WebP) a assets/demo/imagenes/
python3 subir_odoo.py                      # carga las finales en product.template y marca image_origin = ai
```

- `lote.json` define las tomas: sku, grupo, encuadre (`45`, `cenital`, `vertical_hero`),
  orientación de la imagen base (`paisaje`, `vertical`, `cuadrado`), recortes que salen de
  ella, descripción visual concreta y vajilla. Los ambientes llevan su prompt completo.
- El bloque de estilo es el de la especificación, palabra por palabra; solo cambia la
  superficie en el set de panadería (papel de horno sobre piedra clara), como en su ejemplo.
- Es reanudable: no repite una variante cuya imagen base ya está en `salida/base/`.
- Si `gpt-image-1` no está disponible para la organización, cae solo a `dall-e-3` estándar.
- `seleccion.json` es `{ "SKU": variante }`; sin entrada se usa la variante 1.
- `salida/` (bases PNG, variantes, hojas de contacto, log) está ignorada. Lo que se commitea
  es `assets/demo/imagenes/` con las finales y su `manifest.json` (prompt, modelo, calidad,
  peso y `origen: ia` por imagen).

## Costo y tiempo

Con `gpt-image-1` en calidad `low`, el lote de 72 llamadas cuesta del orden de 1 USD y tarda
unos 5 minutos con 4 hilos. Confirma el precio vigente antes de lotes más grandes.
