'use client';
import { time, kes, perLabel } from '@/lib/format';
export const LANES = [['Channels', 'Direct and partners'], ['Quotation', 'Spark service'], ['Product Build', 'Spark, by Xcall'], ['Rater', 'Spark, by Xcall'], ['LitePAS', 'Policy admin'], ['CRM', 'Customer record']];
const W = 100 / LANES.length; const cx = (i) => (i + 0.5) * W;
const tr = (e, s) => (e.serviceTrace || []).find((t) => String(t.Service).includes(s));

function rowsFor(e) {
  const at = time(e.at || e.receivedAt);
  const ok = e.httpStatus === 200 || e.httpStatus === 201 || (!e.httpStatus && e.type !== 'quote.rejected');
  const r = e.response || {};
  if (['quote.requested', 'quote.revised', 'documents.requested'].includes(e.type)) {
    const verb = e.type === 'quote.revised' ? `revise quote (rev ${e.revision || ''})` : e.type === 'documents.requested' ? 'produce documents' : 'request a quote';
    if (!ok) return [{ at, from: 0, to: 1, kind: 'bad', label: `${e.from}: ${verb}, HTTP ${e.httpStatus || 'no response'}` }];
    const p = tr(e, 'Product'), q = tr(e, 'Rating');
    return [
      { at, from: 0, to: 1, label: `${e.from}: ${verb}` },
      { from: 1, to: 2, kind: !p || p.Status === 'No response' ? 'bad' : '', label: p ? `Product ${p.Version || ''}: ${p.Status}` : 'Product: no trace' },
      { from: 1, to: 3, kind: !q || q.Status === 'Not called' ? 'skip' : q.Status !== 'RATED' ? 'bad' : '', label: q ? `Rating ${q.Version || ''}: ${q.Status}` : 'Rating: no trace' },
      { from: 1, to: 0, kind: 'ret', label: `${r.QuoteStatus || e.quoteStatus || ''}${r.Instalment ? `, ${kes(r.Instalment)} ${perLabel(r.AppliedPlan)}` : ''}${e.durationMs ? ` in ${e.durationMs} ms` : ''}` }
    ];
  }
  if (e.type === 'quote.accepted') return [{ at, from: 0, to: 4, label: `${e.from}: accepted ${e.quoteReference || ''}` }];
  if (e.type === 'quote.rejected') return [{ at, from: 0, to: 4, kind: 'bad', label: `rejected: ${r.error || 'HTTP ' + e.httpStatus}` }];
  if (e.type === 'policy.bound') return [{ at, self: 4, label: `${e.policyNumber} bound` }];
  if (e.type === 'crm.updated') return [{ at, from: 4, to: 5, label: `${r.crmReference || 'customer record'} updated` }];
  return [{ at, self: 0, label: e.type }];
}

export default function Sequence({ events, fresh }) {
  const asc = [...events].reverse().sort((a, b) => new Date(a.at || a.receivedAt) - new Date(b.at || b.receivedAt));
  return (
    <div className="seq">
      <div className="lanes"><div style={{ textAlign: 'left', paddingLeft: 14 }}>Time</div>{LANES.map(([n, s]) => <div key={n}>{n}<small>{s}</small></div>)}</div>
      <div className="rows">
        {asc.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#8FA3BC' }}>Quote in the channels app and the calls appear here as they happen.</div>}
        {asc.map((e, gi) => rowsFor(e).map((x, i) => (
          <div className={'srow' + (i === 0 && gi > 0 ? ' grp' : '')} key={e.id + i}>
            <div className="stime">{i === 0 ? x.at : ''}</div>
            <div className="lane-area">
              {LANES.map((_, li) => <span key={li} className="vline" style={{ left: cx(li) + '%' }} />)}
              {x.self !== undefined ? (
                <><span className="self" style={{ left: cx(x.self) + '%', animation: fresh.has(e.id) ? 'draw .5s ease both' : 'none' }} /><span className="alabel" style={{ left: `calc(${cx(x.self)}% + 30px)`, top: '50%', transform: 'translateY(-50%)' }}>{x.label}</span></>
              ) : (
                <>
                  <span className={`arrow ${x.kind || ''} ${x.to > x.from ? 'right' : 'left'}`} style={{ left: cx(Math.min(x.from, x.to)) + '%', width: Math.abs(x.to - x.from) * W + '%', animation: fresh.has(e.id) ? undefined : 'none', transformOrigin: x.to > x.from ? 'left' : 'right' }} />
                  <span className="alabel" style={{ left: `calc(${cx(Math.min(x.from, x.to))}% + 4px)`, color: x.kind === 'bad' ? '#F3A59F' : x.kind === 'skip' ? '#8FA3BC' : undefined }}>{x.label}</span>
                </>
              )}
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
