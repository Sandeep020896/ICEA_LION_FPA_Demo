import { NextResponse } from 'next/server';
export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next();
  const ok = req.cookies.get('icea_session')?.value === (process.env.SESSION_TOKEN || 'dev');
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = '/login'; url.searchParams.set('next', pathname); return NextResponse.redirect(url);
}
export const config = { matcher: ['/((?!.*\\.(?:png|svg|ico|jpg)$).*)'] };
