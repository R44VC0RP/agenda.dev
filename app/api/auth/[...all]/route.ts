import { auth } from '@/lib/auth';

// Next.js does not allow static Route Handlers; remove this to avoid build errors.
export const dynamic = 'force-dynamic';

import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
