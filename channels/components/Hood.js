'use client';
import { useState } from 'react';

function Call({ c }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('response');
  const ok = c.httpStatus === 200 && !c.error;
  const tone = !ok ? '#E5534B' : String(c.outputs?.QuoteStatus || '').startsWith('NOT') ? '#E0A230' : '#3FB97F';
  const apiErr = (c.errors || []).filter(Boolean);
  return (
    <div className="call">
      <button className="call-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="dot" style={{ background: tone }} />
        <span><b>{c.action}</b> <small>{c.journeyLabel} at {new Date(c.at).toLocaleTimeString('en-GB')}, HTTP {c.httpStatus || 'none'} in {c.durationMs} ms</small></span>
        <small style={{ textAlign: 'right' }}>{c.outputs?.QuoteStatus || c.error || ''}</small>
      </button>
      <div className="trace">
        {(c.outputs?.ServiceTrace || []).map((t) => {
          const bad = /No response|NOT|Not called/.test(String(t.Status));
          return <span key={t.Service} className={'tchip ' + (bad ? 'bad' : 'ok')}>{t.Service.replace('ILG_FPA_', '')} {t.Version || ''}: {t.Status}</span>;
        })}
        {c.callId && <span className="tchip">call {c.callId}</span>}
      </div>
      {apiErr.length > 0 && <div className="verr" style={{ padding: '0 12px 10px' }}>{apiErr.map((e, i) => <div key={i}>{e.source_path}: {e.message}</div>)}</div>}
      {open && (
        <div className="call-b">
          <div className="tabs">
            {['request', 'response'].map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'request' ? 'Request sent' : 'Response received'}</button>)}
          </div>
          <pre className="json">{JSON.stringify(tab === 'request' ? c.request : { outputs: c.outputs, errors: c.errors, meta: c.meta }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function csv(calls) {
  const head = ['time', 'journey', 'action', 'http', 'ms', 'call_id', 'correlation_id', 'quote_status', 'quote_reference', 'revision', 'instalment', 'plan', 'product_version', 'rating_version', 'quote_version', 'errors'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = calls.map((c) => [c.at, c.journeyLabel, c.action, c.httpStatus, c.durationMs, c.callId, c.correlationId, c.outputs?.QuoteStatus, c.outputs?.QuoteReference, c.outputs?.QuoteRevision, c.outputs?.Instalment, c.outputs?.AppliedPlan, c.outputs?.ProductVersionQuoted, c.outputs?.RatingVersionQuoted, c.outputs?.ServiceVersionLabel, (c.errors || []).map((e) => e.message).join(' | ')].map(esc).join(','));
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `icea-journey-log-${Date.now()}.csv`; a.click();
}

export default function Hood({ open, onClose, calls }) {
  return (
    <aside className="hood" data-open={open} aria-hidden={!open} aria-label="Under the hood">
      <div className="hood-h">
        <div><h2>Under the hood</h2><p>Every call this screen made to Coherent Spark, newest first</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" disabled={!calls.length} onClick={() => csv(calls)}>Download CSV</button>
          <button className="btn" onClick={onClose} aria-label="Close">Close</button>
        </div>
      </div>
      <div className="hood-list">
        {calls.length === 0 ? <div className="empty">Calls to the quotation service appear here as you quote.</div> : calls.map((c) => <Call key={c.id} c={c} />)}
      </div>
    </aside>
  );
}
