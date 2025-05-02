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
  
  // For desktop app, we need to use static export
  output: process.env.TAURI_ENABLED === 'true' ? 'export' : undefined,
  
  // Next will use a different output directory for Tauri builds
  distDir: process.env.TAURI_ENABLED === 'true' ? 'out' : '.next',
  
  // Web-only features
  ...(process.env.TAURI_ENABLED !== 'true' ? {
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
  } : {
    // Desktop-only settings
    // Turn off generating all API routes for the desktop build
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'].filter(ext => ext !== 'api'),
  }),
  
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
