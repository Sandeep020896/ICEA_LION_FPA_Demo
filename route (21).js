import { NextResponse } from 'next/server';
import { JOURNEYS } from '@/lib/channels';
import { buildRequest } from '@/lib/spark';
import { callQuote, sendEvent } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const b = await req.json();
  const journey = JOURNEYS[b.journey];
  if (!journey) return NextResponse.json({ error: 'Unknown journey' }, { status: 400 });
  const body = buildRequest(journey, b.form, b.extras || {});
  const r = await callQuote(body, journey.key);
  const outputs = r.data?.response_data?.outputs || null;
  const errors = r.data?.response_data?.errors || null;
  const meta = r.data?.response_meta || null;
  sendEvent({
    type: b.extras?.documents ? 'documents.requested' : (b.extras?.quoteId ? 'quote.revised' : 'quote.requested'),
    at: new Date().toISOString(), from: journey.label, to: 'Spark: ILG FPA - Quotation',
    correlationId: b.extras?.correlationId, channel: journey.channel, partner: journey.partner, journey: journey.key,
    httpStatus: r.httpStatus, durationMs: r.durationMs, callId: meta?.call_id || null,
    quoteStatus: outputs?.QuoteStatus || null, quoteReference: outputs?.QuoteReference || null, revision: outputs?.QuoteRevision || null,
    serviceTrace: outputs?.ServiceTrace || null, errors, request: body,
    response: outputs ? { QuoteStatus: outputs.QuoteStatus, QuoteStatusReason: outputs.QuoteStatusReason, Instalment: outputs.Instalment, AppliedPlan: outputs.AppliedPlan, JourneyResult: outputs.JourneyResult } : null
  }).catch(() => {});
  return NextResponse.json({ request: body, httpStatus: r.httpStatus, durationMs: r.durationMs, error: r.error || null, outputs, errors, meta });
}
