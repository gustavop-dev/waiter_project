import type { NextConfig } from 'next'

const odooOrigin = (process.env.ODOO_ORIGIN || 'http://192.168.56.10:8069').replace(/\/$/, '')

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/odoo/:path*', destination: `${odooOrigin}/:path*` }]
  },
}

export default nextConfig
