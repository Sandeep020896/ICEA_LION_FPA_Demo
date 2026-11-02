import { NextResponse } from 'next/server';
export function middleware(req) {
  const { pathname } = req.nextUrl;
  // Open: login, and the ingest endpoints (protected by their own shared secret).
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/ingest') || pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next();
  if (req.cookies.get('litepas_session')?.value === (process.env.SESSION_TOKEN || 'dev')) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = '/login'; url.searchParams.set('next', pathname); return NextResponse.redirect(url);
}
export const config = { matcher: ['/((?!.*\\.(?:png|svg|ico|jpg)$).*)'] };
