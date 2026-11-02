import { NextResponse } from 'next/server';
import { listEvents, resetAll, storageKind } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const cid = new URL(req.url).searchParams.get('correlationId') || undefined;
  return NextResponse.json({ storage: storageKind(), events: await listEvents({ correlationId: cid }) });
}
export async function DELETE() { await resetAll(); return NextResponse.json({ ok: true }); }
