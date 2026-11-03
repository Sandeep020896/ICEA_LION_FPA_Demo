'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kes, perLabel, productName, channelOf, when, time, BRANDS } from '@/lib/format';
import { describe, tone } from '@/lib/events';
import Path from '@/components/Path';

function ledger(events, q) {
  const kes0 = (v, plan) => (v ? `${kes(v)} ${perLabel(plan)}` : '-');
  const quotes = events.filter((e) => ['quote.requested', 'quote.revised'].includes(e.type));
  const rows = [];
  let acc = -1; quotes.forEach((e, i) => { if (String(e.quoteReference) === String(q.reference) && Number(e.revision) === Number(q.revision)) acc = i; });
  if (acc < 0 && quotes.length) acc = quotes.length - 1;
  quotes.forEach((e, i) => {
    const tr = (s) => (e.serviceTrace || []).find((t) => String(t.Service).includes(s));
    const accepted = i === acc;
    rows.push({ type: e.type === 'quote.revised' ? `Quote, revision ${e.revision || ''}` : 'Quote', status: accepted ? 'Accepted' : String(e.quoteStatus || '').startsWith('NOT') ? 'Not quoted' : 'Superseded', tone: accepted ? 'ok' : String(e.quoteStatus || '').startsWith('NOT') ? 'warn' : '',
      premium: kes0(e.response?.Instalment, e.response?.AppliedPlan), versions: [tr('Product') && `P ${tr('Product').Version}`, tr('Rating') && `R ${tr('Rating').Version}`].filter(Boolean).join(', ') || '-', callId: e.callId, at: e.at || e.receivedAt });
  });
  const ac = events.filter((e) => e.type === 'quote.acceptance').pop();
  if (ac) rows.push({ type: 'Acceptance check', status: 'Confirmed', tone: 'ok', premium: kes0(ac.response?.Instalment, ac.response?.AppliedPlan), versions: (ac.serviceTrace || []).filter((t) => !String(t.Service).includes('Quote')).map((t) => (String(t.Service).includes('Product') ? 'P ' : 'R ') + t.Version).join(', ') || '-', callId: ac.callId, at: ac.at || ac.receivedAt });
  const bound = events.find((e) => e.type === 'policy.bound');
  const uw = events.find((e) => e.type === 'underwriting.approved');
  if (uw) rows.push({ type: 'Underwriting approval', status: 'Approved', tone: 'ok', premium: '-', versions: '-', callId: null, at: uw.at || uw.receivedAt });
  if (bound) rows.push({ type: 'New business', status: 'Bound', tone: 'ok', premium: `${kes(q.annualPremium)} a year`, versions: `P ${q.productVersion || '-'}, R ${q.ratingVersion || '-'}, Q ${q.quoteVersion || '-'}`, callId: q.acceptanceCallId || q.sparkCallId, at: bound.at || bound.receivedAt });
  return rows;
}

export default function PolicyPage({ params }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(null); const [raw, setRaw] = useState(false); const [busy, setBusy] = useState(false);
  const load = () => fetch('/api/policies/' + params.id).then(async (r) => { if (!r.ok) throw new Error('Could not load the policy.'); return r.json(); }).then(setD).catch((e) => setErr(e.message));
  const approve = async () => { setBusy(true); await fetch(`/api/policies/${params.id}/bind`, { method: 'POST' }); setBusy(false); load(); };
  useEffect(() => { fetch('/api/policies/' + params.id).then(async (r) => { if (!r.ok) throw new Error(r.status === 404 ? 'There is no policy with this number.' : 'Could not load the policy.'); return r.json(); }).then(setD).catch((e) => setErr(e.message)); }, [params.id]);
  if (err) return <main className="page"><div className="panel empty">{err} <Link href="/policies">Back to policies</Link></div></main>;
  if (!d) return <main className="page"><div className="panel empty">Loading {params.id}</div></main>;
  const p = d.policy; const q = p.quote || {}; const b = p.benefits || {}; const brand = BRANDS[p.journey];
  const events = [...d.events].reverse().sort((a, c) => new Date(a.at || a.receivedAt) - new Date(c.at || c.receivedAt));
  const sTrace = (s) => (p.serviceTrace || []).find((t) => String(t.Service).includes(s));
  return (
    <main className="page">
      <div className="crumb"><Link href="/policies">Policies</Link> / <span className="mono">{p.policyNumber}</span></div>
      <div className="ph">
        <div>
          <h1><span className="mono" style={{ fontSize: 24, fontWeight: 500 }}>{p.policyNumber}</span><span className={"badge " + (p.status === "Bound" ? "ok" : "warn")}>{p.status}</span><span className="badge ch"><span className="dotc" style={{ background: brand?.color }} />{channelOf(p)}</span></h1>
          <p>{p.customer?.name}, {productName(q.product)}, {q.plan} by {q.method}. Bound {when(p.createdAt)}{p.seeded ? ' (demo record)' : ''}.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={`/console?cid=${encodeURIComponent(p.correlationId)}`}>See this journey in the console</a>
          <a className="btn primary" href={`/customer/${p.policyNumber}`} target="_blank" rel="noreferrer">Customer view</a>
        </div>
      </div>

      {p.status === 'Pending underwriting' && (
        <div className="panel pad" style={{ marginBottom: 16, borderColor: '#F6DDB4', background: '#FFF9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div><b>Pending underwriting.</b> <span className="sub">The quote was issued subject to underwriting ({q.status}). The policy is not bound, and no certificate is issued, until an underwriter approves it.</span></div>
          <button className="btn primary" disabled={busy} onClick={approve}>{busy ? 'Binding' : 'Approve and bind'}</button>
        </div>
      )}
      <div className="panel pad"><div className="h3">Lifecycle</div><Path events={d.events} /></div>

      <div className="tiles">
        <div className="tile"><span>Instalment</span><b className="num">{kes(q.instalment)}</b><small>{perLabel(q.plan)}, first {kes(q.firstInstalment)}</small></div>
        <div className="tile"><span>Annual premium</span><b className="num">{kes(q.annualPremium)}</b><small>Riders {q.riders || 'none'}</small></div>
        <div className="tile"><span>Lives covered</span><b className="num">{b.Lives_Covered ?? '-'}</b><small>{Number(b.Children_Covered) ? `${b.Children_Covered} children` : 'No children'}{Number(b.Parents_Covered) ? `, ${b.Parents_Covered} parents` : ''}</small></div>
        <div className="tile"><span>Term</span><b>{q.coverStart}</b><small>renews {q.renewal}</small></div>
      </div>

      <div className="basis">
        <b>Rating basis</b>
        <span>Product {q.productVersion}</span><span>Rating {q.ratingVersion}</span><span>Quote {q.quoteVersion}</span>
        {q.asOf && <span>as of <span className="mono">{when(q.asOf)}</span></span>}
        <span className="mono">Accepted via Spark call {q.acceptanceCallId || q.sparkCallId}</span>
        <span className="sub">This policy keeps the versions it was priced on. Later approved versions apply to new business only.</span>
      </div>

      <div className="panel pad" style={{ marginTop: 16, overflowX: 'auto' }}>
        <div className="h3">Transactions</div>
        <table className="t">
          <thead><tr><th>Seq</th><th>Transaction</th><th>Status</th><th className="r">Premium</th><th>Versions</th><th className="hide-sm">Spark call</th><th className="hide-sm">When</th></tr></thead>
          <tbody>{ledger(events, q).map((t, i) => (
            <tr key={i}><td className="num">{i + 1}</td><td><b>{t.type}</b></td><td><span className={'badge ' + t.tone}>{t.status}</span></td>
              <td className="r num">{t.premium}</td><td className="sub">{t.versions}</td><td className="mono hide-sm">{t.callId || '-'}</td><td className="sub hide-sm">{time(t.at)}</td></tr>))}
          </tbody>
        </table>
      </div>

      <div className="two">
        <div className="panel pad">
          <div className="h3">Journey history</div>
          <ul className="tl">
            {events.map((e) => { const x = describe(e); const t = tone(e); return (
              <li key={e.id}>
                <div className="when">{time(e.at || e.receivedAt)}</div>
                <div><b>{x.title}</b> {t !== 'ok' && <span className={'badge ' + t}>{t === 'bad' ? 'Failed' : 'Not quoted'}</span>}
                  <div className="sub">{x.detail}</div>
                  {e.callId && <div className="mono sub">Spark call {e.callId}</div>}
                </div>
              </li>); })}
          </ul>
        </div>
        <div>
          <div className="panel pad" style={{ marginBottom: 16 }}>
            <div className="h3">Cover</div>
            <table className="t"><tbody>
              <tr><td>Life cover, policyholder</td><td className="r num">{kes(b.Principal_Death_Benefit)}</td></tr>
              {Number(b.Spouse_Benefit) > 0 && <tr><td>Life cover, spouse</td><td className="r num">{kes(b.Spouse_Benefit)}</td></tr>}
              {Number(b.Children_Covered) > 0 && <tr><td>Each child ({b.Children_Covered})</td><td className="r num">{kes(b.Child_Benefit)}</td></tr>}
              {Number(b.Parents_Covered) > 0 && <tr><td>Each parent ({b.Parents_Covered})</td><td className="r num">{kes(b.Parent_Benefit)}</td></tr>}
              {Number(b.PA_Accidental_Death) > 0 && <tr><td>Accidental death, extra</td><td className="r num">{kes(b.PA_Accidental_Death)}</td></tr>}
              {Number(b.HC_Daily) > 0 && <tr><td>Hospital cash per night</td><td className="r num">{kes(b.HC_Daily)}</td></tr>}
            </tbody></table>
          </div>
          <div className="panel pad" style={{ marginBottom: 16 }}>
            <div className="h3">Documents</div>
            <div className="sub" style={{ marginBottom: 6 }}>Issued by LitePAS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {p.status === 'Bound' ? <a className="btn primary" href={`/api/policies/${p.policyNumber}/certificate`} target="_blank" rel="noreferrer">Certificate of insurance</a> : <span className="sub">Issued once the policy is bound.</span>}
              <a className="btn" href={`/api/policies/${p.policyNumber}/certificate?dl=1`}>Download</a>
            </div>
            <div className="sub" style={{ marginBottom: 6 }}>Produced by Spark at quote stage</div>
            {q.documents?.quote || q.documents?.illustration ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.documents.quote && <a className="btn" href={q.documents.quote} target="_blank" rel="noreferrer">Quote PDF</a>}
                {q.documents.illustration && <a className="btn" href={q.documents.illustration} target="_blank" rel="noreferrer">Benefit illustration PDF</a>}
              </div>
            ) : <div className="sub">No quote documents were attached to this hand-off.</div>}
            <div className="sub" style={{ marginTop: 8 }}>Underwriters: {(p.integrationPayload || []).find((r) => r.Field === 'UW_Life_Entity')?.Value}, {(p.integrationPayload || []).find((r) => r.Field === 'UW_General_Entity')?.Value}</div>
          </div>
          <div className="panel pad" style={{ marginBottom: 16 }}>
            <div className="h3">First-year instalments</div>
            <table className="t"><tbody>{(p.schedule || []).slice(0, 6).map((s) => <tr key={s.No}><td className="num">{s.No}</td><td className="mono">{s.Due_Date}</td><td className="r num">{kes(s.Amount)}</td></tr>)}</tbody></table>
            {(p.schedule || []).length > 6 && <div className="sub" style={{ marginTop: 8 }}>and {(p.schedule || []).length - 6} more in the first year, {kes((p.schedule || []).reduce((a, x) => a + (Number(x.Amount) || 0), 0))} in total</div>}
          </div>
          <div className="panel pad">
            <div className="h3">Customer record</div>
            <div className="sub">{p.crm?.reference}: {p.crm?.segment || '-'}</div>
            <div className="sub">Next best action: {p.crm?.nextBestAction || '-'}</div>
            <button className="btn" style={{ marginTop: 12 }} onClick={() => setRaw(!raw)}>{raw ? 'Hide' : 'Show'} the payload received</button>
            {raw && <pre className="json" style={{ marginTop: 10, maxHeight: 360 }}>{JSON.stringify({ integrationPayload: p.integrationPayload, glPostings: p.glPostings, serviceTrace: p.serviceTrace }, null, 2)}</pre>}
          </div>
        </div>
      </div>
    </main>
  );
}
