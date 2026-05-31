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
  experimental: {
    esmExternals: true,
  },
}

export default nextConfig
