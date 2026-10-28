'use client';
import { useEffect, useState } from 'react';
import { kes, perLabel, productName, BRANDS, time } from '@/lib/format';
import { journeyPath } from '@/components/Path';

export default function Customer({ params }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => { fetch('/api/policies/' + params.id).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Policy not found')))).then(setD).catch((e) => setErr(e.message)); }, [params.id]);
  if (err) return <div className="empty">{err}</div>;
  if (!d) return <div className="empty">Loading your policy</div>;
  const p = d.policy; const q = p.quote || {}; const b = p.benefits || {}; const brand = BRANDS[p.journey] || BRANDS.direct;
  const first = (p.customer?.name || '').split(' ')[0];
  const covers = [
    `Life cover of ${kes(b.Principal_Death_Benefit)} for you`,
    Number(b.Spouse_Benefit) > 0 && `${kes(b.Spouse_Benefit)} for your spouse`,
    Number(b.Children_Covered) > 0 && `${kes(b.Child_Benefit)} for each of your ${b.Children_Covered} children`,
    Number(b.Parents_Covered) > 0 && `${kes(b.Parent_Benefit)} for each of your ${b.Parents_Covered} parents`,
    Number(b.PA_Accidental_Death) > 0 && `An extra ${kes(b.PA_Accidental_Death)} if death is accidental`,
    Number(b.HC_Daily) > 0 && `${kes(b.HC_Daily)} for each night in hospital`
  ].filter(Boolean);
  const NAMES = { Quoted: 'Quote given', Documents: 'Documents issued', Accepted: 'You accepted the quote', Bound: 'Cover started' };
  const hist = journeyPath(d.events).filter((n) => n.e && n.label !== 'CRM updated').map((n) => ({ ...n, label: NAMES[n.label] || (n.label.startsWith('Revised') ? 'Quote updated' : n.label) }));
  return (
    <div className="cv">
      <div className="cv-h" style={{ background: brand.color }}><b>{brand.name}</b><small>{brand.tagline}</small></div>
      <div className="cv-in">
        <div className="sub">Policy {p.policyNumber}</div>
        <h1>Hello {first || 'there'}</h1>
        <div className="covered" style={{ background: brand.color }}>You're covered. {productName(q.product)} starts on {q.coverStart}.</div>
        <div className="grid2">
          <div className="card"><div className="sub" style={{ marginBottom: 8 }}>What you're covered for</div><ul className="ck">{covers.map((c) => <li key={c} style={{ color: 'var(--ink)' }}>{c}</li>)}</ul></div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="sub">You pay</div>
            <div className="big num" style={{ color: brand.color, margin: '6px 0' }}>{kes(q.instalment)}</div>
            <div className="sub">{perLabel(q.plan)} by {q.method}</div>
            <div className="sub" style={{ marginTop: 8 }}>First payment {kes(q.firstInstalment)} including stamp duty</div>
          </div>
        </div>
        <div className="card">
          <div className="sub" style={{ marginBottom: 8 }}>Your documents</div>
          {q.documents?.quote || q.documents?.illustration ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {q.documents.quote && <a className="btn" href={q.documents.quote} target="_blank" rel="noreferrer">Your quote</a>}
              {q.documents.illustration && <a className="btn" href={q.documents.illustration} target="_blank" rel="noreferrer">Your benefit illustration</a>}
            </div>
          ) : <div className="sub">Your documents will be sent to you shortly.</div>}
        </div>
        <div className="card">
          <div className="sub" style={{ marginBottom: 8 }}>Your cover history</div>
          {hist.map((n) => <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}><span>{n.label}</span><span className="sub">{time(n.e.at || n.e.receivedAt)}</span></div>)}
        </div>
        <div className="help" style={{ background: brand.color }}>Need help with your cover? Contact {brand.helpline}. Cover is provided by ICEA LION Life and ICEA LION General.</div>
      </div>
    </div>
  );
}
