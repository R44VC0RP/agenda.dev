/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // For the desktop build we switch to static export mode
  output: process.env.TAURI_ENABLED === 'true' ? 'export' : undefined,

  // Use a different output directory for Tauri builds
  distDir: process.env.TAURI_ENABLED === 'true' ? 'out' : '.next',
  
  // Web-only features
  ...(process.env.TAURI_ENABLED !== 'true'
    ? {
        async rewrites() {
          return [
            {
              source: '/ingest/static/:path*',
              destination: 'https://us-assets.i.posthog.com/static/:path*',
            },
            {
              source: '/ingest/:path*',
              destination: 'https://us.i.posthog.com/:path*',
            },
            {
              source: '/ingest/decide',
              destination: 'https://us.i.posthog.com/decide',
            },
          ];
        },
      }
    : {
        // Desktop-only settings
        // For static export, exclude dynamic routes
        trailingSlash: true,
      
        // Exclude specific pages from the build
        pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
        
        // Configure webpack for desktop build
        webpack(config) {
          if (process.env.TAURI_ENABLED === 'true') {
            // Configure Node.js polyfills
            config.resolve.alias = {
              ...(config.resolve.alias || {}),
              'node:buffer': 'buffer',
              'node:crypto': 'crypto-browserify',
              'node:events': 'events',
              'node:http': 'stream-http',
              'node:https': 'https-browserify',
              'node:stream': 'stream-browserify',
            };
          }
          return config;
        },
      }),

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // PWA configuration
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control', 
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;