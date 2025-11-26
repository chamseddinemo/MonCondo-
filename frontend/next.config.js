const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Optimisation de la mémoire pour éviter les erreurs OOM
  experimental: {
    optimizeCss: false,
  },
  // Optimisations de performance
  compress: true,
  poweredByHeader: false,
  // Désactiver le cache problématique pour éviter ERR_CONTENT_LENGTH_MISMATCH
  generateEtags: false,
  // Améliorer la gestion des erreurs de build
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Augmenter la limite de mémoire pour le build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Créer un chunk séparé pour Google Maps
            googleMaps: {
              name: 'google-maps',
              test: /[\\/]node_modules[\\/]@react-google-maps[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Chunk pour les composants lourds
            heavyComponents: {
              name: 'heavy-components',
              test: /[\\/]components[\\/](maps|documents|payments|chat)[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            // Chunk pour les librairies communes
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  },
  images: {
    domains: ['localhost', 'source.unsplash.com', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Désactiver complètement l'optimisation pour éviter les erreurs 400
    // Toutes les images seront servies directement sans optimisation Next.js
    unoptimized: true,
  },
  // Configuration du proxy pour rediriger /api vers le backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Backend sur port 5000 en interne
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*', // Images uploadées du backend
      },
    ]
  },
}

module.exports = nextConfig

