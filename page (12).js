'use client';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sequence from '@/components/Sequence';
import { StepList, freshSteps } from '@/components/Steps';
import { describe, tone } from '@/lib/events';
import { time } from '@/lib/format';

const LOGSTEPS = [{ key: 'start', label: 'Ask Spark for the call log of this journey' }, { key: 'wait', label: 'Spark prepares the CSV files' }, { key: 'ready', label: 'Download ready' }];

function Console() {
  const sp = useSearchParams();
  const [events, setEvents] = useState([]); const [storage, setStorage] = useState('');
  const [cid, setCid] = useState(sp.get('cid') || ''); const [auto, setAuto] = useState(true);
  const [open, setOpen] = useState(null); const [log, setLog] = useState(null);
  const seen = useRef(new Set()); const [fresh, setFresh] = useState(new Set()); const first = useRef(true);

  useEffect(() => {
    let on = true;
    const load = () => fetch('/api/events').then((r) => r.json()).then((d) => {
      if (!on) return;
      const nf = new Set((d.events || []).filter((e) => !seen.current.has(e.id)).map((e) => e.id));
      (d.events || []).forEach((e) => seen.current.add(e.id));
      setFresh(first.current ? new Set() : nf); first.current = false;
      setEvents(d.events || []); setStorage(d.storage);
    }).catch(() => {});
    load(); const t = auto ? setInterval(load, 2500) : null; return () => { on = false; if (t) clearInterval(t); };
  }, [auto]);

  const journeys = useMemo(() => {
    const m = new Map();
    [...events].reverse().forEach((e) => { if (!e.correlationId) return; const j = m.get(e.correlationId) || { id: e.correlationId, from: e.from, start: e.at || e.receivedAt, last: e.at || e.receivedAt, n: 0, policy: null };
      j.n += 1; j.last = e.at || e.receivedAt; if (e.policyNumber) j.policy = e.policyNumber; if (e.journey && e.from && e.type !== 'policy.bound' && e.type !== 'crm.updated') j.from = e.from; m.set(e.correlationId, j); });
    return [...m.values()].sort((a, b) => new Date(b.last) - new Date(a.last));
  }, [events]);
  const active = cid || journeys[0]?.id || '';
  const shown = active === '__all' ? events.slice(0, 40) : events.filter((e) => e.correlationId === active);

  function csv() {
    const head = ['received', 'event', 'from', 'to', 'http', 'ms', 'spark_call_id', 'correlation_id', 'quote_reference', 'revision', 'quote_status', 'policy'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = shown.map((e) => [e.at || e.receivedAt, e.type, e.from, e.to, e.httpStatus, e.durationMs, e.callId, e.correlationId, e.quoteReference, e.revision, e.quoteStatus || e.response?.QuoteStatus, e.policyNumber].map(esc).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' })); a.download = `integration-events-${active}.csv`; a.click();
  }

  async function sparkLog() {
    let steps = freshSteps(LOGSTEPS); const set = (k, state, detail) => { steps = steps.map((s) => (s.key === k ? { ...s, state, detail } : s)); setLog((l) => ({ ...l, steps })); };
    setLog({ steps, raw: null, url: null });
    set('start', 'running', `Filter: correlation ID ${active}`);
    const s = await fetch('/api/spark-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correlationId: active }) }).then((r) => r.json()).catch((e) => ({ error: e.message }));
    setLog((l) => ({ ...l, raw: s }));
    if (s.error || !s.jobId) { set('start', 'failed', s.error || (s.httpStatus === 401 || s.httpStatus === 403 ? `Spark refused (HTTP ${s.httpStatus}): the API key's group needs the DownloadCsvLog permission` : `No job ID returned (HTTP ${s.httpStatus})`)); return; }
    set('start', 'done', `Job ${s.jobId} started`);
    set('wait', 'running', 'Checking every 2 seconds');
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const p = await fetch('/api/spark-log/status?jobId=' + encodeURIComponent(s.jobId)).then((r) => r.json()).catch((e) => ({ error: e.message }));
      setLog((l) => ({ ...l, raw: p }));
      if (p.error) { set('wait', 'failed', p.error); return; }
      if (p.url) { set('wait', 'done', `Status ${p.status || 'complete'}`); set('ready', 'done', 'ZIP of CSV files from Spark'); setLog((l) => ({ ...l, url: p.url })); return; }
      if (/fail|error/i.test(String(p.status))) { set('wait', 'failed', `Status ${p.status}`); return; }
      set('wait', 'running', `Status ${p.status || 'in progress'} (check ${i + 1})`);
    }
    set('wait', 'failed', 'Spark did not finish within a minute. Try again, or download it from API Call History in Spark.');
  }

  return (
    <main className="page">
      <div className="ph">
        <div><h1>Integration console</h1><p>Every hop of a customer journey: channel to Spark, Spark's Xcalls to Product and Rating, the hand-off to LitePAS and the customer record.</p></div>
        <span className="live">{auto && <i />}{auto ? 'Live' : 'Paused'}, storage: {storage}</span>
      </div>
      <div className="cbar">
        <select value={active} onChange={(e) => setCid(e.target.value)} aria-label="Journey">
          {journeys.map((j) => <option key={j.id} value={j.id}>{j.from || 'Journey'}, {time(j.start)}{j.policy ? `, ${j.policy}` : ''} ({j.id})</option>)}
          <option value="__all">All journeys, latest 40 events</option>
        </select>
        <button className="btn" onClick={() => setAuto(!auto)}>{auto ? 'Pause' : 'Resume'}</button>
        <button className="btn" onClick={csv} disabled={!shown.length}>Download events CSV</button>
        <button className="btn primary" onClick={sparkLog} disabled={!active || active === '__all' || log?.steps?.some((s) => s.state === 'running')}>Get Spark's own log for this journey</button>
      </div>

      {log && (
        <div className="panel pad" style={{ marginBottom: 14 }}>
          <div className="h3">Spark API Call History for {active}</div>
          <StepList steps={log.steps} />
          {log.url && <a className="btn primary" href={log.url} target="_blank" rel="noreferrer">Download Spark's log (ZIP)</a>}
          {log.raw && <details style={{ marginTop: 10 }}><summary className="sub" style={{ cursor: 'pointer' }}>Spark's response</summary><pre className="json" style={{ marginTop: 8, maxHeight: 220 }}>{JSON.stringify(log.raw, null, 2)}</pre></details>}
        </div>
      )}

      <Sequence events={shown} fresh={fresh} />

      <div className="panel" style={{ marginTop: 16, overflowX: 'auto' }}>
        <table className="t">
          <thead><tr><th>Received</th><th>Event</th><th>From</th><th>To</th><th>Status</th><th className="hide-sm">Spark call</th><th className="hide-sm">Detail</th></tr></thead>
          <tbody>
            {shown.map((e) => { const t = tone(e); const x = describe(e); return (
              <tr key={e.id} className="click" onClick={() => setOpen(e)}>
                <td className="num">{time(e.at || e.receivedAt)}</td><td><b>{x.title}</b></td><td>{e.from}</td><td>{e.to}</td>
                <td><span className={'badge ' + t}>{e.httpStatus ? `HTTP ${e.httpStatus}` : t === 'ok' ? 'Done' : 'Check'}</span></td>
                <td className="mono hide-sm">{e.callId || '-'}</td><td className="sub hide-sm">{x.detail}</td>
              </tr>); })}
          </tbody>
        </table>
        {!shown.length && <div className="empty">No events for this journey yet.</div>}
      </div>

      {open && (
        <aside className="drawer" aria-label="Event detail">
          <div className="drawer-h"><div><b>{describe(open).title}</b><div style={{ fontSize: 12, color: '#8FA3BC' }}>{open.from} to {open.to}, {time(open.at || open.receivedAt)}</div></div><button className="btn" onClick={() => setOpen(null)}>Close</button></div>
          <div style={{ padding: 14, overflow: 'auto', flex: 1 }}>
            <div style={{ fontSize: 12, color: '#8FA3BC', margin: '0 0 6px' }}>Sent</div>
            <pre className="json" style={{ maxHeight: '38vh' }}>{JSON.stringify(open.request || {}, null, 2)}</pre>
            <div style={{ fontSize: 12, color: '#8FA3BC', margin: '12px 0 6px' }}>Received</div>
            <pre className="json" style={{ maxHeight: '30vh' }}>{JSON.stringify({ response: open.response, serviceTrace: open.serviceTrace, errors: open.errors, callId: open.callId, correlationId: open.correlationId }, null, 2)}</pre>
          </div>
        </aside>
      )}
    </main>
  );
}
export default function Page() { return <Suspense><Console /></Suspense>; }
