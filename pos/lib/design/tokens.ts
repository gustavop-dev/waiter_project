// Paleta medida en el .fig del kit CloudPos (Plan I). Única fuente: CSS la lee vía globals.css, las pruebas y las gráficas vía este módulo.
export const KIT_LIGHT = {
  primary: '#447DFC', primarySoft: '#EEF4FF', primaryInk: '#FFFFFF',
  canvas: '#F8FAFC', surface: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0',
  ink: '#0F172A', soft: '#475569', dim: '#94A3B8', overlay: '#131316',
  progress: '#F59E0B', progressSoft: '#FFFBEB', progressInk: '#B45309',
  success: '#22C55E', successSoft: '#F0FDF4', successInk: '#15803D',
  danger: '#EF4444', dangerSoft: '#FEF3F2', dangerInk: '#B91C1C',
  info: '#6172F3', infoSoft: '#EEF4FF', infoInk: '#3538CD',
  reserved: '#0F172A', reservedInk: '#FFFFFF',
} as const
export type KitToken = keyof typeof KIT_LIGHT

export const KIT_DARK: Record<KitToken, string> = {
  primary: '#447DFC', primarySoft: '#1E2A44', primaryInk: '#FFFFFF',
  canvas: '#131316', surface: '#1A1A1E', muted: '#26272B', border: '#51525C',
  ink: '#F7F7F7', soft: '#A0A0AB', dim: '#70707B', overlay: '#000000',
  progress: '#F59E0B', progressSoft: '#78350F', progressInk: '#FDE68A',
  success: '#22C55E', successSoft: '#14532D', successInk: '#BBF7D0',
  danger: '#EF4444', dangerSoft: '#7F1D1D', dangerInk: '#FECACA',
  info: '#6172F3', infoSoft: '#1E2A44', infoInk: '#C7D2FE',
  reserved: '#F7F7F7', reservedInk: '#131316',
}

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

// Convierte camelCase a kebab-case para el nombre de la variable CSS (--kit-primary-soft).
export const cssVar = (token: KitToken): string => `--kit-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
