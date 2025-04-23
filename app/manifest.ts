import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'exon todo',
    short_name: 'exon todo',
    description: 'the simplist todo app ever',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#09090B',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/maskable-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    // iOS specific additions
    orientation: 'portrait',
    display_override: ['standalone', 'browser'],
    categories: ['productivity'],
  }
} 