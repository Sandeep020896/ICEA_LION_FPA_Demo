import { NextResponse } from 'next/server';
import { JOURNEYS } from '@/lib/channels';
import { bindPolicy } from '@/lib/server';

export const dynamic = 'force-dynamic';

// Accept: hand the quote to LitePAS. Personal data (the name) goes to the policy system, never to Spark.
export async function POST(req) {
  const b = await req.json();
  const journey = JOURNEYS[b.journey];
  if (!journey) return NextResponse.json({ error: 'Unknown journey' }, { status: 400 });
  const o = b.outputs || {};
  const payload = {
    event: 'quote.accepted', at: new Date().toISOString(), correlationId: b.correlationId,
    channel: journey.channel, partner: journey.partner, partnerLabel: journey.label, journey: journey.key,
    customer: { name: b.customerName, reference: b.customerRef },
    quote: {
      reference: o.QuoteReference, revision: o.QuoteRevision, status: o.QuoteStatus, product: o.ResolvedInputs?.find?.((r) => r.Field === 'ProductCode')?.Value,
      productVersion: o.ProductVersionQuoted, ratingVersion: o.RatingVersionQuoted, quoteVersion: o.ServiceVersionLabel,
      annualPremium: o.ResolvedInputs?.find?.((r) => r.Field === 'AnnualPremium')?.Value, instalment: o.Instalment, firstInstalment: o.FirstInstalment,
      plan: o.AppliedPlan, method: o.AppliedMethod, coverStart: o.CoverStartDate, renewal: o.RenewalDate, riders: o.RiderCodes,
      sparkCallId: b.callId, documents: b.documents || null
    },
    integrationPayload: o.IntegrationPayload || [], resolvedInputs: o.ResolvedInputs || [], schedule: o.InstalmentSchedule || [],
    benefits: (o.Illustration || [])[0] || null, serviceTrace: o.ServiceTrace || [], glPostings: o.GLPostings || []
  };
  const r = await bindPolicy(payload);
  return NextResponse.json({ payload, result: r });
}
