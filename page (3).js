'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kes, perLabel, productName, channelOf, when, time, BRANDS } from '@/lib/format';
import { describe, tone } from '@/lib/events';
import Path from '@/components/Path';

export default function PolicyPage({ params }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(null); const [raw, setRaw] = useState(false);
  useEffect(() => { fetch('/api/policies/' + params.id).then(async (r) => { if (!r.ok) throw new Error(r.status === 404 ? 'There is no policy with this number.' : 'Could not load the policy.'); return r.json(); }).then(setD).catch((e) => setErr(e.message)); }, [params.id]);
  if (err) return <main className="page"><div className="panel empty">{err} <Link href="/policies">Back to policies</Link></div></main>;
  if (!d) return <main className="page"><div className="panel empty">Loading {params.id}</div></main>;
  const p = d.policy; const q = p.quote || {}; const b = p.benefits || {}; const brand = BRANDS[p.journey];
  const events = [...d.events].reverse().sort((a, c) => new Date(a.at || a.receivedAt) - new Date(c.at || c.receivedAt));
  const sTrace = (s) => (p.serviceTrace || []).find((t) => String(t.Service).includes(s));
  return (
    <main className="page">
      <div style={{ marginBottom: 8 }}><Link href="/policies">Policies</Link></div>
      <div className="ph">
        <div>
          <h1 className="num">{p.policyNumber} <span className="badge ok" style={{ verticalAlign: 6 }}>{p.status}</span> <span className="badge ch" style={{ verticalAlign: 6 }}><span className="dotc" style={{ background: brand?.color }} />{channelOf(p)}</span></h1>
          <p>{p.customer?.name}, {productName(q.product)}, {q.plan} by {q.method}. Bound {when(p.createdAt)}{p.seeded ? ' (demo record)' : ''}.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={`/console?cid=${encodeURIComponent(p.correlationId)}`}>See this journey in the console</a>
          <a className="btn primary" href={`/customer/${p.policyNumber}`} target="_blank" rel="noreferrer">Customer view</a>
        </div>
      </div>

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
        <span className="mono">Spark call {q.sparkCallId}</span>
        <span className="sub">This policy keeps the versions it was priced on. Later approved versions apply to new business.</span>
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
            {q.documents?.quote || q.documents?.illustration ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.documents.quote && <a className="btn" href={q.documents.quote} target="_blank" rel="noreferrer">Quote PDF</a>}
                {q.documents.illustration && <a className="btn" href={q.documents.illustration} target="_blank" rel="noreferrer">Benefit illustration PDF</a>}
              </div>
            ) : <div className="sub">No documents were attached to this hand-off.</div>}
            <div className="sub" style={{ marginTop: 8 }}>Underwriters: {(p.integrationPayload || []).find((r) => r.Field === 'UW_Life_Entity')?.Value}, {(p.integrationPayload || []).find((r) => r.Field === 'UW_General_Entity')?.Value}</div>
          </div>
          <div className="panel pad" style={{ marginBottom: 16 }}>
            <div className="h3">First-year instalments</div>
            <table className="t"><tbody>{(p.schedule || []).map((s) => <tr key={s.No}><td>{s.No}</td><td>{s.Due_Date}</td><td className="r num">{kes(s.Amount)}</td></tr>)}</tbody></table>
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
