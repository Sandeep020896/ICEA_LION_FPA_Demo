'use client';
import { kes, num, perLabel, shortPlan } from '@/lib/format';
import { StepList, Spinner, progressOf } from './Steps';

const field = (rows, f) => (rows || []).find((r) => r.Field === f)?.Value;

function Status({ o, errors, httpError }) {
  if (httpError) return <div className="status bad"><div><b>The quote service could not be reached</b>{httpError}</div></div>;
  if (!o) return null;
  const s = o.QuoteStatus || '';
  const apiErrors = (errors || []).filter((e) => String(e.source_path || '').includes('Xvalidate'));
  const tone = s === 'QUOTED' ? 'ok' : s.startsWith('NOT') ? 'bad' : 'warn';
  const title = s === 'QUOTED' ? 'Cover available' : s === 'QUOTED - SUBJECT TO UNDERWRITING' ? 'Cover available, subject to underwriting' : s.startsWith('NOT') ? 'No quote issued' : s.toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return (
    <div className={'status ' + tone}>
      <div><b>{title}</b>{s === 'QUOTED' ? o.QuoteStatusReason : o.QuoteStatusReason}
        {apiErrors.map((e, i) => <div key={i} style={{ marginTop: 4, fontSize: 12.5 }}>API error ({String(e.source_path).replace('$.Input.', '')}): {e.message}</div>)}
      </div>
    </div>
  );
}

function Bars({ rows }) {
  const r = (rows || []).filter((x) => x.Annual_Premium);
  if (!r.length) return null;
  const max = Math.max(...r.map((x) => Number(x.Annual_Premium)));
  return (
    <>
      <div className="h4">Yearly premium as your family's ages change (current rates, not guaranteed)</div>
      <div className="bars" role="img" aria-label={`Annual premium rises from ${kes(r[0].Annual_Premium)} to ${kes(r[r.length - 1].Annual_Premium)} over ${r.length} years`}>
        {r.map((x) => <div key={x.Year} style={{ height: `${Math.max(8, (Number(x.Annual_Premium) / max) * 100)}%` }} title={`Year ${x.Year}: ${kes(x.Annual_Premium)}`}><span>{x.Year}</span></div>)}
      </div>
    </>
  );
}

export default function Offer({ journey, q, onUpdate, onPlan, onDocs, onAccept, compact }) {
  const o = q.outputs;
  const issued = o && (o.QuoteStatus === 'QUOTED' || o.QuoteStatus === 'QUOTED - SUBJECT TO UNDERWRITING' || o.QuoteStatus === 'REQUOTED - PRODUCT VERSION CHANGED');
  const product = field(o?.ResolvedInputs, 'ProductCode');
  const year1 = (o?.Illustration || [])[0];
  const plans = o?.PaymentPlanOptions || [];
  const accept = q.accept;
  const ap = accept ? progressOf(accept.steps) : null;

  return (
    <div className="offer">
      {!o && !q.httpError && (
        <div className="skel">{q.loading ? <span className="pulse">Asking ICEA LION for a price…</span> : 'Your quote appears here'}</div>
      )}
      <Status o={o} errors={q.errors} httpError={q.httpError} />

      {issued && (
        <>
          <div className="prod">
            <span className={'tag' + (product === 'ILG-FPL' ? ' lite' : '')}>{product === 'ILG-FPL' ? 'Jamii Lite' : 'Jamii Protect'}</span>
            <span className="tag">{field(o.ResolvedInputs, 'CoverLevel')} cover</span>
            <span className="tag">Quote {o.QuoteReference} rev {o.QuoteRevision}</span>
          </div>
          <div className="price" aria-live="polite">
            <span className={'amt num' + (q.loading ? ' pulse' : '')}>{kes(o.Instalment)}</span>
            <span className="per">{perLabel(o.AppliedPlan)}</span>
          </div>
          <div className="sub">
            First payment {kes(o.FirstInstalment)} including stamp duty, by {o.AppliedMethod}. {kes(field(o.ResolvedInputs, 'AnnualPremium'))} a year before instalment loading.
            {o.FlexiDailyDrawdown > 0 && <> Flexi draws about {kes(o.FlexiDailyDrawdown)} a day when your wallet has funds.</>}
          </div>

          {!compact && <div className="h4">How you can pay</div>}
          <div className="plans">
            {plans.map((p) => {
              const avail = p.Available === 'Yes';
              if (compact && !avail) return null;
              return (
                <button key={p.Code} type="button" className="plan" aria-pressed={p.Plan === o.AppliedPlan} disabled={!avail || q.loading} onClick={() => onPlan(p.Plan)}>
                  <span>
                    <span className="p-name">{shortPlan(p.Plan)}</span>{p.Recommended === 'Yes' && <span className="rec">Recommended</span>}
                    {!avail && <span className="p-why" style={{ display: 'block' }}>{p.Reason}</span>}
                  </span>
                  <span className="p-amt">{avail ? kes(p.Instalment) : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="h4">What's covered</div>
          <div className="covers">
            <div className="cov"><b>{kes(year1?.Principal_Death_Benefit)}</b><span>Life cover for you</span></div>
            {Number(year1?.Spouse_Benefit) > 0 && <div className="cov"><b>{kes(year1.Spouse_Benefit)}</b><span>Life cover for your spouse</span></div>}
            {Number(year1?.Children_Covered) > 0 && <div className="cov"><b>{kes(year1.Child_Benefit)}</b><span>Each of {year1.Children_Covered} children</span></div>}
            {Number(year1?.Parents_Covered) > 0 && <div className="cov"><b>{kes(year1.Parent_Benefit)}</b><span>Each of {year1.Parents_Covered} parents</span></div>}
            {Number(year1?.PA_Accidental_Death) > 0 && <div className="cov"><b>{kes(year1.PA_Accidental_Death)}</b><span>Extra if death is accidental</span></div>}
            {Number(year1?.HC_Daily) > 0 && <div className="cov"><b>{kes(year1.HC_Daily)}</b><span>Per night in hospital</span></div>}
          </div>
          {!compact && <Bars rows={o.Illustration} />}
          {!compact && o.ValueForMoney && <div className="vfm">{o.ValueForMoney}</div>}
        </>
      )}

      {q.dirty && o && (
        <div className="actions">
          <div className="dirty">Details changed since this quote.</div>
          <button className="btn primary big" disabled={q.loading} onClick={onUpdate}>{q.loading && <Spinner light />}Update quote</button>
        </div>
      )}

      {issued && !q.dirty && !accept?.policy && (
        <div className="actions">
          {q.docs ? (
            <div className="docs">
              {q.docs.quote && <a className="btn" href={q.docs.quote} target="_blank" rel="noreferrer">Open quote PDF</a>}
              {q.docs.illustration && <a className="btn" href={q.docs.illustration} target="_blank" rel="noreferrer">Open benefit illustration</a>}
            </div>
          ) : (
            <button className="btn" disabled={q.loading || accept?.status === 'running'} onClick={onDocs}>{q.docsLoading && <Spinner />}Get quote documents</button>
          )}
          <button className="btn primary big" disabled={q.loading || accept?.status === 'running'} onClick={onAccept}>
            {accept?.status === 'running' && <Spinner light />}{journey.kind === 'phone' ? `Pay ${kes(o.FirstInstalment)} and start cover` : 'Accept and start cover'}
          </button>
        </div>
      )}

      {accept && (
        <div style={{ marginTop: 18 }}>
          {accept.policy ? (
            <div className="bound">
              <div className="sub">Policy created in LitePAS</div>
              <b className="num">{accept.policy.policyNumber}</b>
              <div className="sub" style={{ marginTop: 4 }}>Cover starts {o?.CoverStartDate}. Documents and history are in the policy record.</div>
              {accept.policy.url && <a className="btn" style={{ marginTop: 10 }} href={accept.policy.url} target="_blank" rel="noreferrer">Open in LitePAS</a>}
            </div>
          ) : (
            <div className="h4" style={{ marginTop: 0 }}>{accept.status === 'failed' ? 'Hand-off stopped' : 'Starting cover'}</div>
          )}
          <div className="bar"><div style={{ width: `${accept.status === 'running' ? Math.max(ap.pct, 6) : 100}%`, background: accept.status === 'failed' ? 'var(--bad)' : undefined }} /></div>
          <StepList steps={accept.steps} />
        </div>
      )}
    </div>
  );
}
