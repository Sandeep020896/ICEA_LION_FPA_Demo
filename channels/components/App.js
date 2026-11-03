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
  { key: 'docs', label: 'Price confirmed by Spark at acceptance' },
  { key: 'send', label: 'Accepted quote sent to LitePAS' },
  { key: 'policy', label: 'Policy bound by LitePAS' },
  { key: 'crm', label: 'Customer record updated' }
];
const PARTNER_CARDS = [
  { key: 'bank', name: 'Pamoja Bank', what: 'Bancassurance, branch desk', mark: 'PB', color: '#0B5D4B' },
  { key: 'wallet', name: 'Tuma Wallet', what: 'Embedded in a mobile wallet', mark: 'TW', color: '#0A8F4E' },
  { key: 'lender', name: 'Haraka Loans', what: 'Embedded in a loan journey', mark: 'HL', color: '#4A35C8' }
];
const newSession = () => ({ asOf: null, customerRef: uid('C'), correlationId: uid('J'), q: { outputs: null, errors: null, meta: null, loading: false, dirty: false }, steps: freshSteps(QSTEPS) });
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
  const [editing, setEditing] = useState(false);
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
    const asOf = isRev && s.asOf ? s.asOf : new Date().toISOString();
    if (!isRev) patch(k, (x) => ({ ...x, asOf }));
    const extras = { asOf, customerRef: s.customerRef, correlationId: s.correlationId, ...(isRev ? { quoteId: prev.QuoteReference, priorRevision: prev.QuoteRevision, quotedProductVersion: prev.ProductVersionQuoted } : {}) };
    patch(k, (x) => ({ ...x, steps: freshSteps(QSTEPS).map((st, i) => (i === 0 ? { ...st, state: 'running', detail: 'Waiting for Spark' } : st)), q: { ...x.q, loading: true, httpError: null } }));
    const res = await post(k, extras, isRev ? 'Update quote' : 'Quote');
    patch(k, (x) => ({ ...x, steps: quoteSteps(res), q: { ...x.q, loading: false, dirty: false, docs: null, accept: null,
      outputs: res.outputs || x.q.outputs, errors: res.errors, meta: res.meta, httpError: res.error || (res.httpStatus && res.httpStatus !== 200 ? `HTTP ${res.httpStatus}` : null), lastExtras: extras } }));
  }

  async function getDocs(k) {
    const s = sref.current[k]; const o = s.q.outputs; if (!o) return null;
    patchQ(k, { docsLoading: true });
    const extras = { asOf: s.asOf, customerRef: s.customerRef, correlationId: s.correlationId, documents: true, quoteId: o.QuoteReference, priorRevision: Math.max(0, (o.QuoteRevision || 1) - 1), quotedProductVersion: o.ProductVersionQuoted };
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
      setStep('docs', 'running', 'Re-checking validity, versions and price with Spark');
      const ax = { asOf: s.asOf, customerRef: s.customerRef, correlationId: s.correlationId, documents: true, acceptance: true, quoteId: o.QuoteReference, priorRevision: Math.max(0, (o.QuoteRevision || 1) - 1), quotedProductVersion: o.ProductVersionQuoted };
      const chk = await post(k, ax, 'Acceptance check');
      const co = chk.outputs || {};
      if (!chk.outputs || chk.httpStatus !== 200) { setStep('docs', 'failed', chk.error || 'Spark did not answer the acceptance check'); upd((a) => ({ ...a, status: 'failed' })); return; }
      if (!['QUOTED', 'QUOTED - SUBJECT TO UNDERWRITING'].includes(co.QuoteStatus)) { setStep('docs', 'stopped', `${co.QuoteStatus}: ${co.QuoteStatusReason || ''}. Re-quote before accepting.`); upd((a) => ({ ...a, status: 'failed' })); return; }
      const d = { docs: { quote: co.QUOTE?.PDFUrl || s.q.docs?.quote || null, illustration: co.BENEFITILLUSTRATION?.PDFUrl || s.q.docs?.illustration || null } };
      setStep('docs', 'done', `${co.QuoteStatus}, ${kes(co.Instalment)} ${perLabel(co.AppliedPlan)}; Spark call ${chk.meta?.call_id || ''}`);
      setStep('send', 'running', 'POST to LitePAS with the integration payload');
      const r = await fetch('/api/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey: k, outputs: o, asOf: s.asOf, correlationId: s.correlationId, customerName: fref.current[k].name, customerRef: s.customerRef, callId: s.q.meta?.call_id, acceptanceCallId: chk.meta?.call_id || null, documents: d.docs }) }).then((x) => x.json());
      const res = r.result || {};
      if (res.skipped) { setStep('send', 'skipped', 'LitePAS is not connected yet (set LITEPAS_URL)'); setStep('policy', 'skipped', null); setStep('crm', 'skipped', null); upd((a) => ({ ...a, status: 'notsent' })); return; }
      if (!res.ok) { setStep('send', 'failed', res.error || `LitePAS answered HTTP ${res.status}`); upd((a) => ({ ...a, status: 'failed' })); return; }
      setStep('send', 'done', `HTTP ${res.status} in ${res.durationMs} ms`);
      const pol = res.data?.policy || {};
      const pending = pol.status === 'Pending underwriting';
      setStep('policy', pol.policyNumber ? (pending ? 'stopped' : 'done') : 'failed', pol.policyNumber ? (pending ? `${pol.policyNumber} pending underwriting: referred quotes are bound after approval` : `${pol.policyNumber} bound; certificate issued`) : 'LitePAS did not return a policy number');
      setStep('crm', res.data?.crm ? 'done' : 'skipped', res.data?.crm ? `${res.data.crm.reference}: ${res.data.crm.segment || ''}` : (pending ? 'Updated once the policy is bound' : 'No CRM update reported'));
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
          <a className="wordmark" href="/" aria-label="ICEA LION home"><b>ICEA <i>LION</i></b><span className="sep" /><span>Jamii Protect distribution</span></a>
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
              <div><p className="eyebrow">Jamii Protect, family protection</p><h1>{journey.headline}</h1><p>{journey.blurb}</p></div>
              <div className="hfacts">
                <div><b>Up to KES 10m</b><span>Life cover for you and your family</span></div>
                <div><b>Accident and hospital</b><span>Optional cover you can add</span></div>
                <div><b>Priced live</b><span>By ICEA LION's quotation service</span></div>
              </div>
            </section>
            <div className="grid">
              <div className="panel"><QuoteForm form={form} set={setForm} journey={journey} /></div>
              <div className="sticky"><div className="panel">{offer}</div>{how}</div>
            </div>
          </>
        )}

        {journey.key === 'bank' && (
          <div className="bankwrap">
            <div className="bankbar"><span className="bb"><span className="logo">PB</span><b>Pamoja Bank</b><small>Insurance desk, Westlands branch</small></span><small>Products and prices from ICEA LION</small></div>
            <div className="bankhead"><h2>{journey.headline}</h2><p className="sub" style={{ margin: '4px 0 0' }}>{journey.blurb}</p></div>
            <div className="grid">
              <div className="panel"><QuoteForm form={form} set={setForm} journey={journey} /></div>
              <div className="sticky"><div className="panel">{offer}</div>{how}</div>
            </div>
          </div>
        )}

        {journey.kind === 'phone' && (
          <div className="stage">
            <div className="phone"><div className="screen">
              <div className="island" />
              <div className="sbar"><span>9:41</span><i><svg width="17" height="11" viewBox="0 0 17 11" aria-hidden><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor"/><rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor"/><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor"/></svg><svg width="24" height="11" viewBox="0 0 24 11" aria-hidden><rect x=".5" y=".5" width="20" height="10" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="7" rx="1.5" fill="currentColor"/><rect x="21.5" y="3.5" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg></i></div>
              <div className="app-head">
                <div className="app-brand"><span className="logo">{journey.key === 'wallet' ? 'TW' : 'HL'}</span><b>{journey.label}</b><span>{journey.key === 'wallet' ? 'Balance KES 4,820' : 'Loan KES 25,000 approved'}</span></div>
                <h2>{journey.headline}</h2>
                <p>{journey.blurb}</p>
              </div>
              <div className="app-body">
                <div className="pdetails">
                  <button type="button" className="psum" onClick={() => setEditing(!editing)} aria-expanded={editing}>
                    <span><b>Your details</b><span className="sub">Age {form.applicantAge}{form.spouseCovered === 'Yes' ? ', spouse' : ''}{form.childAges.length ? `, ${form.childAges.length} ${form.childAges.length === 1 ? 'child' : 'children'}` : ''}, cover KES {Number(form.baseSumAssured || 0).toLocaleString('en-KE')}</span></span>
                    <span className="pedit">{editing ? 'Done' : 'Edit'}</span>
                  </button>
                  {editing && (
                    <>
                      <QuoteForm form={form} set={setForm} journey={journey} compact />
                      <div style={{ padding: '0 14px 14px' }}><button className="btn primary big" disabled={q.loading || !q.dirty} onClick={() => { runQuote(jkey, { revise: true }); setEditing(false); }}>{q.loading && <Spinner light />}{q.dirty ? 'Update my quote' : 'No changes yet'}</button></div>
                    </>
                  )}
                </div>
                {offer}
                <div className="powered">Cover provided by ICEA LION Life and ICEA LION General</div>
              </div>
            </div></div>
            <div className="explain">
              <p className="eyebrow">Embedded in {journey.label}</p>
              <h2>The partner's app, ICEA LION's product</h2>
              <p>The customer never leaves {journey.label}. The app sends the request to ICEA LION's quotation service, which applies the product rules and asks the rating service for a price.</p>
              <div className="facts">
                <div className="fact"><span>Channel sent</span><b>{journey.channel}</b></div>
                <div className="fact"><span>Partner</span><b>{journey.partner}</b></div>
                <div className="fact"><span>Product given</span><b>{q.outputs ? ((q.outputs.ResolvedInputs || []).find((x) => x.Field === 'ProductCode')?.Value === 'ILG-FPL' ? 'Jamii Lite (ILG-FPL)' : 'Jamii Protect (ILG-FPA)') : '-'}</b></div>
                <div className="fact"><span>Plan applied</span><b>{q.outputs?.AppliedPlan || '-'}{q.outputs?.PlanRationale ? `, ${q.outputs.PlanRationale.toLowerCase()}` : ''}</b></div>
                <div className="fact"><span>Priced as of</span><b>{sess.asOf ? new Date(sess.asOf).toLocaleString('en-GB') : '-'}</b></div>
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
            {jobs.some((j) => j.status === 'running') ? <Spinner /> : <span className="sicon done" aria-hidden>✓</span>}
            <span style={{ flex: 1 }}>{jobs.some((j) => j.status === 'running') ? 'Starting cover' : 'Hand-offs to LitePAS'}</span>
            <span>{tray ? 'Hide' : 'Show'}</span>
          </button>
          {tray && jobs.map((j) => {
            const { pct, current } = progressOf(j.steps);
            return (
              <div className="tray-item" key={j.id}>
                <div className="t1"><span>{j.label}</span><span style={{ color: j.status === 'failed' ? 'var(--bad)' : j.status === 'done' ? 'var(--ok)' : 'var(--muted)' }}>{j.status === 'running' ? 'Running' : j.status === 'failed' ? 'Stopped' : j.status === 'notsent' ? 'Not sent' : 'Done'}</span></div>
                <div className="bar" style={{ margin: '8px 0 4px' }}><div style={{ width: `${j.status === 'running' ? Math.max(pct, 6) : 100}%`, background: j.status === 'failed' ? 'var(--bad)' : 'var(--sky)' }} /></div>
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
