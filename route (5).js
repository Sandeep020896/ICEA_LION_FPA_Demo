import { NextResponse } from 'next/server';
import { getPolicy, listEvents } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET(_req, { params }) {
  const p = await getPolicy(params.id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ policy: p, events: await listEvents({ correlationId: p.correlationId }) });
}
