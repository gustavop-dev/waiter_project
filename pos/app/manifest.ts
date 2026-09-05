import type { MetadataRoute } from 'next'

// PWA instalable (tablet del mesero, caja). El aviso de instalación exige HTTPS en producción.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Waiter · POS', short_name: 'Waiter', description: 'Punto de venta del operador', start_url: '/salon', display: 'standalone',
    orientation: 'landscape', background_color: '#FAF8F5', theme_color: '#1A1815', lang: 'es',
    icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }
}
