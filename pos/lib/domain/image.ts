// Logo del restaurante: se ajusta en el navegador antes de subirlo a Odoo para que res.company no guarde
// originales de varios megas y el bloque 3 sirva siempre un PNG pequeño. Las dependencias del DOM se
// inyectan para poder probar la lógica sin un canvas real.
export interface Size { width: number; height: number }
export const LOGO_MAX: Size = { width: 1024, height: 512 }
export const LOGO_MAX_BYTES = 1024 * 1024
export const LOGO_TYPES = ['image/png', 'image/jpeg'] as const
export type LogoFileError = 'type' | 'size'

export interface DecodedImage { width: number; height: number; source: CanvasImageSource; release?: () => void }
export interface DrawingCanvas { getContext(kind: '2d'): { drawImage(source: CanvasImageSource, x: number, y: number, w: number, h: number): void } | null; toDataURL(type: string): string }
export interface ResizeDeps { decode(file: Blob): Promise<DecodedImage>; canvas(size: Size): DrawingCanvas }

export function validateLogoFile(file: { type: string; size: number }): LogoFileError | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > LOGO_MAX_BYTES) return 'size'
  return null
}

// Encaja sin deformar y sin agrandar: un logo pequeño se queda como está.
export function fitWithin(size: Size, max: Size): Size {
  const scale = Math.min(1, max.width / size.width, max.height / size.height)
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

// Odoo guarda el binario sin tipo: se reconoce por los primeros bytes (en base64) para armar la data URL.
export function imageDataUrl(base64: string): string {
  const mime = base64.startsWith('/9j/') ? 'image/jpeg' : base64.startsWith('R0lGOD') ? 'image/gif' : 'image/png'
  return `data:${mime};base64,${base64}`
}

const browserDeps: ResizeDeps = {
  decode: (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, source: img, release: () => URL.revokeObjectURL(url) })
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image-decode')) }
    img.src = url
  }),
  canvas: (size) => { const c = document.createElement('canvas'); c.width = size.width; c.height = size.height; return c },
}

// Devuelve el PNG en base64 sin el prefijo data:, que es lo que espera el campo Binary de Odoo.
export async function resizeImage(file: Blob, max: Size = LOGO_MAX, deps: ResizeDeps = browserDeps): Promise<string> {
  const image = await deps.decode(file)
  try {
    const target = fitWithin(image, max)
    const canvas = deps.canvas(target)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas-2d')
    ctx.drawImage(image.source, 0, 0, target.width, target.height)
    return canvas.toDataURL('image/png').split(',')[1] ?? ''
  } finally {
    image.release?.()
  }
}
