# Sistema de diseño del POS: la vista `/kit` y cómo extenderlo

El sistema de diseño de Waiter está documentado en una vista viva dentro del POS:
La ruta `/kit` está disponible solo en desarrollo
(<http://192.168.56.10:3000/kit> en el entorno local) y requiere una sesión de administrador.
No aparece en la navegación de Administración y responde 404 en producción.

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
| Patrón Aurora | `AURORA` en tokens y `pos/components/kit/Aurora.tsx`. Variante intensa en el acceso y ambiental en el fondo compartido del POS, caja y cocina. |
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
   animación en `globals.css`. El acceso usa `<Aurora>`; las pantallas del POS heredan
   `<AuroraBackground />` de `KitShell`. Una pantalla independiente monta ese fondo dentro de
   `.pos-ambient`. El blur se aplica una vez al campo de manchas; la intensidad se adapta al tema.
   Los paneles grandes pueden usar `.ambient-panel`, mientras que controles y estados conservan
   superficies y colores semánticos. Evita añadir un filtro de blur por tarjeta.
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

## Jerarquía de las vistas del POS

- `PageTitle` y `PageHeader` usan un título de texto de 28 px, sin fondo, borde ni icono de botón.
  La navegación indica la sección; el título identifica el contenido y deja las superficies para acciones y filtros.
- Mesas y Reservas comparten `FloorSwitcher`: selector de ancho acotado, igual con dos o veinte pisos. En Mesas vive en un lateral con la información del piso, las zonas, el reparto de meseros y los ajustes. En vista dividida, cada plano conserva su propio lateral compacto. En Reservas se integra en la esquina fija de la columna Mesa y permanece disponible durante la carga, en pisos vacíos y ante errores.
  En pantalla partida se usa su versión compacta; con un solo piso se muestra una etiqueta informativa.
- La cuadrícula de Reservas conserva un fondo continuo. Las horas pasadas se distinguen en sus encabezados;
  el rayado se reserva para las franjas fuera del horario de atención.

### Controles de piso y zona

- Piso y zona usan `Select`: altura mínima de 48 px, radio `rounded-md` (12 px) y el mismo chevron hacia abajo. Los acordeones giran ese indicador hacia arriba al abrirse.
- Las acciones del lateral usan `Button` compacto; admiten dos líneas en vista dividida. El lateral y la cuadrícula usan `rounded-lg` (16 px), manteniendo la aurora visible.
