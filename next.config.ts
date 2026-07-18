import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  // Dockerfile.prod copies .next/standalone — keep this in sync with the kit's prod image.
  output: 'standalone',
  // The workspace package ships TypeScript source, not a build.
  transpilePackages: ['teachdown'],
}

export default withNextIntl(nextConfig)
