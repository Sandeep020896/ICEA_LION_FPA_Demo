'use client';
import { useEffect, useRef, useState } from 'react';
import { JOURNEYS } from '@/lib/channels';
import { kes, perLabel, uid } from '@/lib/format';
import QuoteForm from './QuoteForm';
import Offer from './Offer';
import Hood from './Hood';
import { StepList, Spinner, freshSteps, progressOf } from './Steps';

const QSTEPS = [
  { key: 'send', label: 'Request sent to the ICEA LION quotation service' },
  { key: 'product', label: 'Product rules: eligibility, product and cover' },
  { key: 'rating', label: 'Priced by the rating service' },
  { key: 'quote', label: 'Payment plans applied and quote issued' }
];
const ASTEPS = [
  { key: 'docs', label: 'Quote documents produced by Spark' },
  { key: 'send', label: 'Accepted quote sent to LitePAS' },
  { key: 'policy', label: 'Policy created' },
  { key: 'crm', label: 'Customer record updated' }
];
const PARTNER_CARDS = [
  { key: 'bank', name: 'Pamoja Bank', what: 'Branch and relationship managers', mark: 'P', color: '#0E5446' },
  { key: 'wallet', name: 'Tuma Wallet', what: 'Mobile money app', mark: 'T', color: '#0E9F55' },
  { key: 'lender', name: 'Haraka Loans', what: 'Digital lending app', mark: 'H', color: '#4B2FC9' }
];
const newSession = () => ({ customerRef: uid('C'), correlationId: uid('J'), q: { outputs: null, errors: null, meta: null, loading: false, dirty: false }, steps: freshSteps(QSTEPS) });
const trace = (o, s) => (o?.ServiceTrace || []).find((t) => String(t.Service).includes(s));

function quoteSteps(res) {
  const st = freshSteps(QSTEPS); const set = (k, state, detail) => { const s = st.find((x) => x.key === k); s.state = state; s.detail = detail; };
  if (res.error || res.httpStatus !== 200 || !res.outputs) { set('send', 'failed', res.error || `HTTP ${res.httpStatus}`); return st; }
  const o = res.outputs;
  set('send', 'done', `HTTP 200 in ${res.durationMs} ms, Spark call ${res.meta?.call_id || ''}`);
  const p = trace(o, 'Product'), r = trace(o, 'Rating');
  const dec = o.ProductDecisionUsed;
  if (!p || p.Status === 'No response') set('product', 'failed', 'The product service did not answer, so no quote was issued');
  else if (dec === 'DECLINED' || dec === 'INVALID INPUT') set('product', 'stopped', `${dec === 'DECLINED' ? 'Declined' : 'Invalid request'} (Product ${p.Version}): ${o.ProductPrimaryReason}`);
  else set('product', 'done', `${dec === 'ACCEPTED' ? 'Accepted' : dec.charAt(0) + dec.slice(1).toLowerCase()} on Product ${p.Version}${o.ProductPrimaryReason && o.ProductPrimaryReason !== 'All rules passed' ? ': ' + o.ProductPrimaryReason : ''}`);
  if (!r || r.Status === 'Not called') set('rating', 'skipped', 'Not called, because the product rules stopped the request');
  else if (r.Status !== 'RATED') set('rating', 'failed', `Not rated (Rating ${r.Version || ''})`);
  else set('rating', 'done', `Rated on Rating ${r.Version}: ${kes((o.ResolvedInputs || []).find((x) => x.Field === 'AnnualPremium')?.Value)} a year`);
  if (String(o.QuoteStatus).startsWith('NOT')) set('quote', 'stopped', o.QuoteStatusReason);
  else set('quote', 'done', `${o.QuoteStatus.charAt(0) + o.QuoteStatus.slice(1).toLowerCase()}: ${kes(o.Instalment)} ${perLabel(o.AppliedPlan)} on Quote ${o.ServiceVersionLabel}`);
  return st;
}

export default function App() {
  const [mode, setMode] = useState('direct');
  const [partner, setPartner] = useState('bank');
  const jkey = mode === 'direct' ? 'direct' : partner;
  const journey = JOURNEYS[jkey];
  const [forms, setForms] = useState(() => Object.fromEntries(Object.entries(JOURNEYS).map(([k, j]) => [k, { ...j.defaults, childAges: [...j.defaults.childAges] }])));
  const [sessions, setSessions] = useState(() => Object.fromEntries(Object.keys(JOURNEYS).map((k) => [k, newSession()])));
  const [calls, setCalls] = useState([]);
  const [hood, setHood] = useState(false);
  const [tray, setTray] = useState(true);
  const sref = useRef(sessions); sref.current = sessions;
  const fref = useRef(forms); fref.current = forms;

  const patch = (k, fn) => setSessions((s) => ({ ...s, [k]: fn(s[k]) }));
  const patchQ = (k, p) => patch(k, (s) => ({ ...s, q: { ...s.q, ...(typeof p === 'function' ? p(s.q) : p) } }));

  async function post(k, extras, action) {
    const res = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journey: k, form: fref.current[k], extras }) })
      .then((r) => r.json()).catch((e) => ({ error: 'Network error: ' + e.message, httpStatus: 0 }));
    setCalls((c) => [{ id: uid('call'), at: new Date().toISOString(), action, journeyLabel: JOURNEYS[k].label, correlationId: extras.correlationId, callId: res.meta?.call_id, ...res }, ...c]);
    return res;
  }

  async function runQuote(k, { plan, revise } = {}) {
    if (plan) setForms((f) => ({ ...f, [k]: { ...f[k], plan } }));
    if (plan) fref.current = { ...fref.current, [k]: { ...fref.current[k], plan } };
    const s = sref.current[k]; const prev = s.q.outputs;
    const isRev = revise && prev && prev.QuoteReference && !String(prev.QuoteStatus).startsWith('NOT');
    const extras = { customerRef: s.customerRef, correlationId: s.correlationId, ...(isRev ? { quoteId: prev.QuoteReference, priorRevision: prev.QuoteRevision, quotedProductVersion: prev.ProductVersionQuoted } : {}) };
    patch(k, (x) => ({ ...x, steps: freshSteps(QSTEPS).map((st, i) => (i === 0 ? { ...st, state: 'running', detail: 'Waiting for Spark' } : st)), q: { ...x.q, loading: true, httpError: null } }));
    const res = await post(k, extras, isRev ? 'Update quote' : 'Quote');
    patch(k, (x) => ({ ...x, steps: quoteSteps(res), q: { ...x.q, loading: false, dirty: false, docs: null, accept: null,
      outputs: res.outputs || x.q.outputs, errors: res.errors, meta: res.meta, httpError: res.error || (res.httpStatus && res.httpStatus !== 200 ? `HTTP ${res.httpStatus}` : null), lastExtras: extras } }));
  }

  async function getDocs(k) {
    const s = sref.current[k]; const o = s.q.outputs; if (!o) return null;
    patchQ(k, { docsLoading: true });
    const extras = { customerRef: s.customerRef, correlationId: s.correlationId, documents: true, quoteId: o.QuoteReference, priorRevision: Math.max(0, (o.QuoteRevision || 1) - 1), quotedProductVersion: o.ProductVersionQuoted };
    const res = await post(k, extras, 'Quote documents');
    const docs = res.outputs ? { quote: res.outputs.QUOTE?.PDFUrl, illustration: res.outputs.BENEFITILLUSTRATION?.PDFUrl } : null;
    patchQ(k, { docsLoading: false, docs: docs && (docs.quote || docs.illustration) ? docs : { quote: null, illustration: null, none: true } });
    return { res, docs };
  }

  async function accept(k) {
    const s = sref.current[k]; const o = s.q.outputs;
    const steps = freshSteps(ASTEPS);
    const job = { id: uid('job'), journey: k, label: `${JOURNEYS[k].label}: ${o.QuoteReference}`, status: 'running', steps };
    const upd = (fn) => patchQ(k, (q) => ({ accept: fn(q.accept || job) }));
    const setStep = (key, state, detail) => upd((a) => ({ ...a, steps: a.steps.map((x) => (x.key === key ? { ...x, state, detail } : x)) }));
    patchQ(k, { accept: job }); setTray(true);
    try {
      setStep('docs', 'running', 'Rendering the quote and benefit illustration');
      const d = s.q.docs && !s.q.docs.none ? { docs: s.q.docs } : await getDocs(k);
      const n = [d.docs?.quote, d.docs?.illustration].filter(Boolean).length;
      setStep('docs', n ? 'done' : 'skipped', n ? `${n} PDFs ready` : 'Spark returned no documents');
      setStep('send', 'running', 'POST to LitePAS with the integration payload');
      const r = await fetch('/api/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey: k, outputs: o, correlationId: s.correlationId, customerName: fref.current[k].name, customerRef: s.customerRef, callId: s.q.meta?.call_id, documents: d.docs }) }).then((x) => x.json());
      const res = r.result || {};
      if (res.skipped) { setStep('send', 'skipped', 'LitePAS is not connected yet (set LITEPAS_URL)'); setStep('policy', 'skipped', null); setStep('crm', 'skipped', null); upd((a) => ({ ...a, status: 'notsent' })); return; }
      if (!res.ok) { setStep('send', 'failed', res.error || `LitePAS answered HTTP ${res.status}`); upd((a) => ({ ...a, status: 'failed' })); return; }
      setStep('send', 'done', `HTTP ${res.status} in ${res.durationMs} ms`);
      const pol = res.data?.policy || {};
      setStep('policy', pol.policyNumber ? 'done' : 'failed', pol.policyNumber ? `${pol.policyNumber}, status ${pol.status || 'Bound'}` : 'LitePAS did not return a policy number');
      setStep('crm', res.data?.crm ? 'done' : 'skipped', res.data?.crm ? `${res.data.crm.reference}: ${res.data.crm.segment || ''}` : 'No CRM update reported');
      upd((a) => ({ ...a, status: 'done', policy: { ...pol, url: pol.policyNumber ? `${res.litepasUrl}/policies/${pol.policyNumber}` : null } }));
    } catch (e) {
      upd((a) => ({ ...a, status: 'failed', steps: a.steps.map((x) => (x.state === 'running' ? { ...x, state: 'failed', detail: e.message } : x)) }));
    }
  }

  useEffect(() => { const s = sessions[jkey]; if (!s.q.outputs && !s.q.loading && !s.q.httpError) runQuote(jkey); }, [jkey]); // eslint-disable-line

  const setForm = (f) => { setForms((x) => ({ ...x, [jkey]: f })); patchQ(jkey, { dirty: true }); };
  const newCustomer = () => { setForms((x) => ({ ...x, [jkey]: { ...JOURNEYS[jkey].defaults, childAges: [...JOURNEYS[jkey].defaults.childAges] } })); setSessions((s) => ({ ...s, [jkey]: newSession() })); setTimeout(() => runQuote(jkey), 0); };

  const sess = sessions[jkey]; const q = sess.q; const form = forms[jkey];
  const offer = <Offer journey={journey} q={q} compact={journey.kind === 'phone'} onUpdate={() => runQuote(jkey, { revise: true })} onPlan={(p) => runQuote(jkey, { plan: p, revise: true })} onDocs={() => getDocs(jkey)} onAccept={() => accept(jkey)} />;
  const how = (
    <div className="panel" style={{ padding: '18px 20px', marginTop: 16 }}>
      <div className="h4" style={{ marginTop: 0 }}>How this price was made</div>
      <StepList steps={sess.steps} />
      <button className="btn ghost" style={{ padding: '4px 0' }} onClick={() => setHood(true)}>See the request and response</button>
    </div>
  );
  const jobs = Object.entries(sessions).map(([k, s]) => s.q.accept && { ...s.q.accept, k }).filter(Boolean);

  return (
    <div data-brand={journey.brand}>
      <header className="top" data-brand="icea">
        <div className="top-in">
          <div className="wordmark"><Mark /> <span>ICEA LION<small>Jamii Protect distribution</small></span></div>
          <div className="seg" role="group" aria-label="Channel">
            <button aria-pressed={mode === 'direct'} onClick={() => setMode('direct')}>Direct</button>
            <button aria-pressed={mode === 'partner'} onClick={() => setMode('partner')}>Partners and embedded</button>
          </div>
          <div className="top-right">
            <span className="chip" title="Customer reference sent to Spark instead of the name">Customer {sess.customerRef}</span>
            <button className="btn" onClick={newCustomer}>New customer</button>
            <button className="btn" onClick={() => setHood(true)}>Under the hood {calls.length > 0 && <span className="count">{calls.length}</span>}</button>
          </div>
        </div>
      </header>

      {mode === 'partner' && (
        <div className="partners" role="group" aria-label="Partner">
          {PARTNER_CARDS.map((p) => (
            <button key={p.key} className="pcard" aria-pressed={partner === p.key} onClick={() => setPartner(p.key)}>
              <span className="logo" style={{ background: p.color }}>{p.mark}</span>
              <span><b>{p.name}</b><span>{p.what}</span></span>
            </button>
          ))}
        </div>
      )}

      <main className="page">
        {journey.key === 'direct' && (
          <>
            <section className="hero">
              <div><h1>{journey.headline}</h1><p>{journey.blurb}</p></div>
              <div className="who">Sold direct on icealion.co.ke<br />Channel: {journey.channel}</div>
            </section>
            <div className="grid">
              <div className="panel"><QuoteForm form={form} set={setForm} journey={journey} /></div>
              <div className="sticky"><div className="panel">{offer}</div>{how}</div>
            </div>
          </>
        )}

        {journey.key === 'bank' && (
          <div className="bankwrap">
            <div className="bankbar"><span><b>Pamoja Bank</b> <small>Insurance desk</small></span><small>Products and prices from ICEA LION</small></div>
            <div style={{ padding: '18px 20px 0' }}><h2 style={{ margin: 0, fontStretch: '112%' }}>{journey.headline}</h2><p className="sub" style={{ margin: '4px 0 0' }}>{journey.blurb}</p></div>
            <div className="grid">
              <div className="panel"><QuoteForm form={form} set={setForm} journey={journey} /></div>
              <div className="sticky"><div className="panel">{offer}</div>{how}</div>
            </div>
          </div>
        )}

        {journey.kind === 'phone' && (
          <div className="stage">
            <div className="phone"><div className="screen">
              <div className="notch" />
              <div className="app-head">
                <div className="bal">{journey.key === 'wallet' ? 'Tuma Wallet balance KES 4,820' : 'Haraka loan of KES 25,000 approved'}</div>
                <h2>{journey.headline}</h2>
                <div className="bal" style={{ marginTop: 4 }}>{journey.blurb}</div>
              </div>
              <div className="app-body">
                {offer}
                <details className="pdetails" open={!q.outputs}>
                  <summary>Change your details</summary>
                  <QuoteForm form={form} set={setForm} journey={journey} compact />
                  {q.dirty && <div style={{ padding: '0 18px 8px' }}><button className="btn primary big" disabled={q.loading} onClick={() => runQuote(jkey, { revise: true })}>{q.loading && <Spinner light />}Update quote</button></div>}
                </details>
                <div className="powered">Cover provided by ICEA LION Life and ICEA LION General</div>
              </div>
            </div></div>
            <div className="explain">
              <div className="sub">{journey.label}, embedded journey</div>
              <h2>The partner's app, ICEA LION's product</h2>
              <p>The customer never leaves {journey.label}. The app sends the request to ICEA LION's quotation service, which applies the product rules and asks the rating service for a price.</p>
              <div className="facts">
                <div className="fact"><span>Channel sent</span><b>{journey.channel}</b></div>
                <div className="fact"><span>Partner</span><b>{journey.partner}</b></div>
                <div className="fact"><span>Product given</span><b>{q.outputs ? ((q.outputs.ResolvedInputs || []).find((x) => x.Field === 'ProductCode')?.Value === 'ILG-FPL' ? 'Jamii Lite (ILG-FPL)' : 'Jamii Protect (ILG-FPA)') : '-'}</b></div>
                <div className="fact"><span>Plan applied</span><b>{q.outputs?.AppliedPlan || '-'}{q.outputs?.PlanRationale ? `, ${q.outputs.PlanRationale.toLowerCase()}` : ''}</b></div>
                <div className="fact"><span>Versions used</span><b>{q.outputs ? `Product ${q.outputs.ProductVersionQuoted || '-'}, Rating ${q.outputs.RatingVersionQuoted || '-'}, Quote ${q.outputs.ServiceVersionLabel || '-'}` : '-'}</b></div>
              </div>
              {how}
            </div>
          </div>
        )}
      </main>

      {jobs.length > 0 && (
        <div className="tray" role="status">
          <button className="tray-h" onClick={() => setTray(!tray)} aria-expanded={tray}>
            {jobs.some((j) => j.status === 'running') ? <Spinner light /> : <span>✓</span>}
            <span style={{ flex: 1 }}>{jobs.some((j) => j.status === 'running') ? 'Starting cover' : 'Hand-offs to LitePAS'}</span>
            <span>{tray ? 'Hide' : 'Show'}</span>
          </button>
          {tray && jobs.map((j) => {
            const { pct, current } = progressOf(j.steps);
            return (
              <div className="tray-item" key={j.id}>
                <div className="t1"><span>{j.label}</span><span style={{ color: j.status === 'failed' ? 'var(--bad)' : j.status === 'done' ? 'var(--ok)' : 'var(--muted)' }}>{j.status === 'running' ? 'Running' : j.status === 'failed' ? 'Stopped' : j.status === 'notsent' ? 'Not sent' : 'Done'}</span></div>
                <div className="bar" style={{ margin: '8px 0 4px' }}><div style={{ width: `${j.status === 'running' ? Math.max(pct, 6) : 100}%`, background: j.status === 'failed' ? 'var(--bad)' : 'var(--navy)' }} /></div>
                <div className="t2">{j.status === 'running' ? current?.detail || current?.label : j.policy?.policyNumber ? `Policy ${j.policy.policyNumber}` : j.steps.find((x) => x.state === 'failed')?.detail || j.steps.find((x) => x.state === 'skipped')?.detail || ''}</div>
              </div>
            );
          })}
        </div>
      )}

      <Hood open={hood} onClose={() => setHood(false)} calls={calls} />
    </div>
  );
}

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <rect width="30" height="30" rx="8" fill="#003C7A" />
      <path d="M8 21V9h3v12H8zm5 0V9h3v9h5v3h-8z" fill="#fff" />
      <circle cx="23" cy="10" r="2.4" fill="#27AAE1" />
    </svg>
  );
}
