import { NextResponse } from 'next/server';
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.DEMO_PASSWORD || password !== process.env.DEMO_PASSWORD) return NextResponse.json({ ok: false }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('icea_session', process.env.SESSION_TOKEN || 'dev', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
  return res;
}
export async function DELETE() { const res = NextResponse.json({ ok: true }); res.cookies.delete('icea_session'); return res; }
