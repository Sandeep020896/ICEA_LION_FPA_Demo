import { NextResponse } from 'next/server';
import { addEvent } from '@/lib/store';
import { authorisedIngest } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  if (!authorisedIngest(req)) return NextResponse.json({ error: 'Missing or wrong x-ingest-secret' }, { status: 401 });
  const e = await addEvent(await req.json());
  return NextResponse.json({ ok: true, id: e.id }, { status: 201 });
}
