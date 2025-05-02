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
  // Required for Tauri static export
  output: process.env.TAURI_ENABLED === 'true' ? 'export' : undefined,
  // Prevent conflicts with Tauri
  distDir: process.env.TAURI_ENABLED === 'true' ? '.next' : 'out',
  async rewrites() {
    // Skip rewrites in Tauri build since they're not supported with static export
    if (process.env.TAURI_ENABLED === 'true') {
      return [];
    }
    
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
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
