import { time } from '@/lib/format';
// Lifecycle path for one customer journey, built from the stored events.
export function journeyPath(events) {
  const asc = [...events].reverse().sort((a, b) => new Date(a.at || a.receivedAt) - new Date(b.at || b.receivedAt));
  const first = (t) => asc.find((e) => e.type === t);
  const revs = asc.filter((e) => e.type === 'quote.revised');
  return [
    { label: 'Quoted', e: first('quote.requested') },
    { label: revs.length ? `Revised ${revs.length}x` : 'Revised', e: revs[revs.length - 1], optional: true },
    { label: 'Documents', e: first('documents.requested'), optional: true },
    { label: 'Accepted', e: first('quote.accepted') },
    { label: 'Bound', e: first('policy.bound') },
    { label: 'CRM updated', e: first('crm.updated') }
  ].filter((n) => n.e || !n.optional);
}
export default function Path({ events }) {
  const nodes = journeyPath(events);
  return (
    <div className="path">
      {nodes.map((n, i) => (
        <div key={n.label} style={{ display: 'flex', alignItems: 'center', flex: i < nodes.length - 1 ? 1 : '0 0 auto', minWidth: 0 }}>
          <div className="node" data-done={!!n.e}><i>{n.e ? '✓' : ''}</i><span>{n.label}<small>{n.e ? time(n.e.at || n.e.receivedAt) : 'not seen'}</small></span></div>
          {i < nodes.length - 1 && <div className="link" data-done={!!nodes[i + 1].e} />}
        </div>
      ))}
    </div>
  );
}
