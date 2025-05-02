import { auth } from '@/lib/auth';

export const dynamic = 'force-static';
export const revalidate = false;

import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);

// This is needed for static export with dynamic routes
export function generateStaticParams() {
  return [];
}
