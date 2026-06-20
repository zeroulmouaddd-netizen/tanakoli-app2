/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.usedExports = false
    }
    return config
  },
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.worf.replit.dev', '*.worf.replit.app'],
  turbopack: {},
}

export default nextConfig
