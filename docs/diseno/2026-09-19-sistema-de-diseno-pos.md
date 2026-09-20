# Sistema de diseño del POS: la vista `/kit` y cómo extenderlo

El sistema de diseño de Waiter está documentado en una vista viva dentro del POS:
**Administración → Configuración → Sistema de diseño**, ruta `/kit`
(<http://192.168.56.10:3000/kit> en desarrollo). Solo la ve un administrador.

Cada ejemplo es el componente real con los tokens reales. No hay capturas ni copias: si un
componente cambia, la vista cambia con él. El conmutador Claro / Oscuro del índice aplica el tema
solo a los ejemplos, sin tocar el tema del terminal.

## Qué documenta

| Sección | De dónde sale |
|---|---|
| Principios | Texto de la propia vista. Son las reglas para decidir lo que no esté escrito. |
| Color | `KIT_LIGHT` y `KIT_DARK` en `pos/lib/design/tokens.ts`. |
| Tipografía | `TYPE_SCALE` en el mismo archivo. |
| Forma y tamaño | `RADII` y `TAP_SIZES`, que reflejan `--radius-*` y `--spacing-tap*` de `globals.css`. |
| Acciones, Formularios, Estados, Contenedores | Componentes de `pos/components/ui` y `pos/components/kit`. |
| Iconos | El mapa `ICONS` de `pos/components/kit/Icon.tsx`, completo. |
| Patrón Aurora | `AURORA` en tokens y `pos/components/kit/Aurora.tsx`. Es el fondo del acceso. |
| Movimiento | Reglas de la vista; la única animación continua es la Aurora. |

## Cómo extenderlo

Cada sección de la vista termina con una nota «Para extender» que dice qué archivo tocar. En resumen:

1. **Un color nuevo.** Agrégalo a `KIT_LIGHT` y `KIT_DARK`, decláralo como `--kit-…` en `:root` y en
   `[data-theme=dark]` de `pos/app/globals.css`, expónlo en `@theme` y súmalo a un grupo de
   `TOKEN_GROUPS` en `pos/app/(pos)/kit/page.tsx`.
2. **Un estilo de letra, un radio o una altura táctil.** Agrégalo a `TYPE_SCALE`, `RADII` o
   `TAP_SIZES`. Los dos últimos también se declaran en el `@theme` de `globals.css`.
3. **Un componente nuevo.** Créalo en `components/kit` (piezas del kit CloudPos) o `components/ui`
   (piezas propias), usando tokens semánticos y nunca un hex. Añade un `<Example>` en la sección que
   le corresponda, con su nombre y una línea de código de uso.
4. **Una mancha de la Aurora.** Súmala a `AURORA.blobs` y crea su clase `.login-blob-<clave>` con su
   animación en `globals.css`. Para usar el fondo en otra pantalla, envuelve el contenido en `<Aurora>`.
5. **Una sección nueva.** Añádela a `SECTIONS` y escribe su `<DocSection>` con `intro` y `extend`.

## Qué lo mantiene honesto

- `pos/lib/design/__tests__/tokens.test.ts` lee `globals.css` y falla si la paleta, los radios, las
  alturas táctiles o los colores y duraciones de la Aurora dejan de coincidir con `tokens.ts`.
- `pos/app/(pos)/kit/__tests__/page.test.tsx` falla si un token, un estilo de letra, un radio, una
  altura táctil o una mancha existe en el sistema y no aparece en la vista; si una sección pierde su
  nota «Para extender» o su entrada en el índice; o si el conmutador de tema deja de ser local.

## Antecedentes

Las referencias visuales del kit CloudPos siguen en `docs/diseno/pos-kit/` y el inventario en
[2026-09-06-inventario-kit-cloudpos.md](2026-09-06-inventario-kit-cloudpos.md). El acceso en pantalla
partida con la Aurora reemplaza la columna única anterior; la tablet decorativa del kit sigue sin usarse.
