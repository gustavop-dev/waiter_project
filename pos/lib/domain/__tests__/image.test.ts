import { LOGO_MAX, fitWithin, imageDataUrl, resizeImage, validateLogoFile, type ResizeDeps } from '@/lib/domain/image'

const source = {} as CanvasImageSource
function fakeDeps(width: number, height: number) {
  const drawn: number[][] = []
  const sizes: { width: number; height: number }[] = []
  const release = jest.fn()
  const deps: ResizeDeps = {
    decode: async () => ({ width, height, source, release }),
    canvas: (size) => { sizes.push(size); return { getContext: () => ({ drawImage: (_s: CanvasImageSource, ...args: number[]) => { drawn.push(args) } }), toDataURL: (type: string) => `data:${type};base64,QUJD` } },
  }
  return { deps, drawn, sizes, release }
}

// Falla si el logo se deforma, se agranda o se pasa del máximo 1024 × 512 del contrato.
it('fits inside 1024 × 512 keeping the aspect ratio and never upscales', () => {
  expect(fitWithin({ width: 3000, height: 1000 }, LOGO_MAX)).toEqual({ width: 1024, height: 341 })
  expect(fitWithin({ width: 800, height: 2000 }, LOGO_MAX)).toEqual({ width: 205, height: 512 })
  expect(fitWithin({ width: 300, height: 120 }, LOGO_MAX)).toEqual({ width: 300, height: 120 })
})

// Falla si el canvas no se crea al tamaño ajustado, si se exporta algo distinto de PNG o si el prefijo data: llega a Odoo.
it('draws the decoded image at the fitted size and returns bare PNG base64', async () => {
  const { deps, drawn, sizes, release } = fakeDeps(2048, 2048)
  await expect(resizeImage(new Blob(), LOGO_MAX, deps)).resolves.toBe('QUJD')
  expect(sizes).toEqual([{ width: 512, height: 512 }])
  expect(drawn).toEqual([[0, 0, 512, 512]])
  expect(release).toHaveBeenCalled()
})

// Falla si un SVG o un archivo de más de 1 MB pasa el filtro (el bloque 3 solo sirve ráster).
it('rejects non-raster types and files over 1 MB', () => {
  expect(validateLogoFile({ type: 'image/svg+xml', size: 10 })).toBe('type')
  expect(validateLogoFile({ type: 'image/png', size: 1024 * 1024 + 1 })).toBe('size')
  expect(validateLogoFile({ type: 'image/jpeg', size: 1024 * 1024 })).toBeNull()
})

// Falla si la vista del logo guardado toma un JPEG por PNG (el navegador lo mostraría en blanco).
it('sniffs the mime type from the base64 head', () => {
  expect(imageDataUrl('/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ')
  expect(imageDataUrl('iVBORw0KGgo')).toBe('data:image/png;base64,iVBORw0KGgo')
  expect(imageDataUrl('R0lGODlh')).toBe('data:image/gif;base64,R0lGODlh')
})
