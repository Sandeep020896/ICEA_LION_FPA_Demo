// Storage: Upstash Redis over REST when configured, otherwise in memory (per server instance).
import seedQuotes from './seed-quotes.json';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const P = 'litepas:';
const mem = globalThis.__litepas || (globalThis.__litepas = { policies: [], events: [], seq: 0, seeded: false });

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('Redis: ' + j.error);
  return j.result;
}
export const storageKind = () => (URL_ && TOKEN ? 'Redis' : 'Memory');

async function nextSeq() { if (storageKind() === 'Redis') return Number(await redis(['INCR', P + 'seq'])); mem.seq += 1; return mem.seq; }
async function pushList(key, obj, cap) {
  if (storageKind() === 'Redis') { await redis(['LPUSH', P + key, JSON.stringify(obj)]); if (cap) await redis(['LTRIM', P + key, 0, cap - 1]); return; }
  mem[key].unshift(obj); if (cap && mem[key].length > cap) mem[key].length = cap;
}
async function readList(key) {
  if (storageKind() === 'Redis') { const r = await redis(['LRANGE', P + key, 0, -1]); return (r || []).map((x) => JSON.parse(x)); }
  return mem[key];
}
async function replaceList(key, arr) {
  if (storageKind() === 'Redis') { await redis(['DEL', P + key]); for (const o of [...arr].reverse()) await redis(['LPUSH', P + key, JSON.stringify(o)]); return; }
  mem[key] = arr;
}

export async function listPolicies() { await seedIfEmpty(); return readList('policies'); }
export async function getPolicy(id) { const all = await listPolicies(); return all.find((p) => p.policyNumber === id) || null; }
export async function listEvents({ correlationId } = {}) { await seedIfEmpty(); const e = await readList('events'); return correlationId ? e.filter((x) => x.correlationId === correlationId) : e; }
export async function addEvent(evt) { const e = { id: 'EV-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), receivedAt: new Date().toISOString(), ...evt }; await pushList('events', e, 1000); return e; }
export async function resetAll() {
  if (storageKind() === 'Redis') { await redis(['DEL', P + 'policies']); await redis(['DEL', P + 'events']); await redis(['DEL', P + 'seq']); await redis(['DEL', P + 'seeded']); }
  else { mem.policies = []; mem.events = []; mem.seq = 0; mem.seeded = false; }
}

const field = (rows, f) => (rows || []).find((r) => r.Field === f)?.Value;
const crmFrom = (o) => ({ segment: o.CRMSegment || field(o.IntegrationPayload, 'CRM_Segment'), nextBestAction: o.NextBestAction || field(o.IntegrationPayload, 'Next_Best_Action') });

// Create a bound policy from an accepted quote (the payload the Channels app sends).
export async function createPolicy(payload, { skipSeed } = {}) {
  if (!skipSeed) await seedIfEmpty();
  const n = await nextSeq();
  const policyNumber = 'POL-' + String(n).padStart(6, '0');
  const t0 = Date.now(); const at = new Date(t0).toISOString(); const at1 = new Date(t0 + 1).toISOString(); const at2 = new Date(t0 + 2).toISOString();
  const payloadMap = Object.fromEntries((payload.integrationPayload || []).map((r) => [r.Field, r.Value]));
  const crm = { reference: 'CRM-' + String(n).padStart(6, '0'), segment: payloadMap.CRM_Segment || null, nextBestAction: payloadMap.Next_Best_Action || null };
  const policy = { policyNumber, status: 'Bound', createdAt: at, ...payload, crm };
  await pushList('policies', policy);
  const base = { correlationId: payload.correlationId, channel: payload.channel, partner: payload.partner, journey: payload.journey, quoteReference: payload.quote?.reference, revision: payload.quote?.revision };
  await addEvent({ ...base, type: 'quote.accepted', at, from: payload.partnerLabel, to: 'LitePAS', httpStatus: 201, request: payload, response: { policyNumber } });
  await addEvent({ ...base, type: 'policy.bound', at: at1, from: 'LitePAS', to: 'LitePAS', policyNumber, response: { policyNumber, status: 'Bound', product: payload.quote?.product, productVersion: payload.quote?.productVersion, ratingVersion: payload.quote?.ratingVersion } });
  await addEvent({ ...base, type: 'crm.updated', at: at2, from: 'LitePAS', to: 'CRM', policyNumber, httpStatus: 200, request: { customerReference: payload.customer?.reference, policyNumber, segment: crm.segment, nextBestAction: crm.nextBestAction }, response: { crmReference: crm.reference } });
  return { policy: { policyNumber, status: 'Bound' }, crm };
}

// Demo seed: three bound policies built from real model outputs, so the list is not empty on first open.
async function seedIfEmpty() {
  if (process.env.SEED_DEMO !== '1') return;
  if (storageKind() === 'Redis') { const s = await redis(['SETNX', P + 'seeded', '1']); if (!s) return; }
  else { if (mem.seeded) return; mem.seeded = true; }
  const people = { direct: ['Wanjiru Kamau', 'Direct Digital', 'None (Direct)', 'ICEA LION direct'], bank: ['Otieno family', 'Bancassurance', 'Partner Bank - Tier 1', 'Pamoja Bank'], lender: ['Brian Ouma', 'Mobile Embedded', 'Digital Lender Partner', 'Haraka Loans'] };
  for (const [k, [name, channel, partner, label]] of Object.entries(people)) {
    const o = seedQuotes[k].outputs; const ref = 'C-SEED' + k.toUpperCase().slice(0, 3);
    await addEvent({ type: 'quote.requested', at: new Date(Date.now() - 60000).toISOString(), from: label, to: 'Spark: ILG FPA - Quotation', correlationId: 'J-SEED-' + k.toUpperCase(), channel, partner, journey: k,
      httpStatus: 200, durationMs: 412, callId: 'seed-' + k, quoteStatus: o.QuoteStatus, quoteReference: o.QuoteReference, revision: 1, serviceTrace: o.ServiceTrace,
      response: { QuoteStatus: o.QuoteStatus, QuoteStatusReason: o.QuoteStatusReason, Instalment: o.Instalment, AppliedPlan: o.AppliedPlan, JourneyResult: o.JourneyResult } });
    await createPolicy({
      event: 'quote.accepted', correlationId: 'J-SEED-' + k.toUpperCase(), channel, partner, partnerLabel: label, journey: k, seeded: true,
      customer: { name, reference: ref },
      quote: { reference: o.QuoteReference.replace('C-000123', ref), revision: o.QuoteRevision, status: o.QuoteStatus, product: field(o.ResolvedInputs, 'ProductCode'),
        productVersion: o.ProductVersionQuoted, ratingVersion: o.RatingVersionQuoted, quoteVersion: o.ServiceVersionLabel, annualPremium: field(o.ResolvedInputs, 'AnnualPremium'),
        instalment: o.Instalment, firstInstalment: o.FirstInstalment, plan: o.AppliedPlan, method: o.AppliedMethod, coverStart: o.CoverStartDate, renewal: o.RenewalDate, riders: o.RiderCodes, sparkCallId: 'seed', documents: null },
      integrationPayload: o.IntegrationPayload, resolvedInputs: o.ResolvedInputs, schedule: o.InstalmentSchedule, benefits: (o.Illustration || [])[0], serviceTrace: o.ServiceTrace, glPostings: o.GLPostings
    }, { skipSeed: true });
  }
}
