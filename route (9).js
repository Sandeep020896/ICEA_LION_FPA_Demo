import { NextResponse } from 'next/server';
import { createPolicy, addEvent } from '@/lib/store';
import { authorisedIngest } from '@/lib/auth';
export const dynamic = 'force-dynamic';
// Receives an accepted quote from a channel (in production this hop is carried by ICEA LION's ESB).
export async function POST(req) {
  if (!authorisedIngest(req)) return NextResponse.json({ error: 'Missing or wrong x-ingest-secret' }, { status: 401 });
  const p = await req.json();
  const missing = ['correlationId', 'quote', 'customer'].filter((k) => !p[k]);
  if (missing.length || !['QUOTED', 'QUOTED - SUBJECT TO UNDERWRITING', 'REQUOTED - PRODUCT VERSION CHANGED'].includes(p.quote?.status)) {
    await addEvent({ type: 'quote.rejected', at: new Date().toISOString(), from: p.partnerLabel || 'Channel', to: 'LitePAS', correlationId: p.correlationId, httpStatus: 422, request: p, response: { error: missing.length ? 'Missing ' + missing.join(', ') : `Quote status ${p.quote?.status} cannot be bound` } });
    return NextResponse.json({ error: missing.length ? 'Missing ' + missing.join(', ') : `Quote status ${p.quote?.status} cannot be bound` }, { status: 422 });
  }
  const r = await createPolicy(p);
  return NextResponse.json(r, { status: 201 });
}
