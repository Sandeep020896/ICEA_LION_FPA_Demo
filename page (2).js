'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kes, perLabel, productName, channelOf, BRANDS } from '@/lib/format';

export default function Policies() {
  const [data, setData] = useState(null); const router = useRouter();
  useEffect(() => {
    let on = true;
    const load = () => fetch('/api/policies').then((r) => r.json()).then((d) => on && setData(d.policies || [])).catch(() => {});
    load(); const t = setInterval(load, 5000); return () => { on = false; clearInterval(t); };
  }, []);
  const ps = data || [];
  const by = (k) => ps.filter((p) => p.journey === k).length;
  const gwp = ps.reduce((a, p) => a + (Number(p.quote?.annualPremium) || 0), 0);
  return (
    <main className="page">
      <div className="ph">
        <div><h1>Policies</h1><p>Every policy bound from the direct site and partner channels. New ones appear here as customers accept.</p></div>
        <a className="btn" href="/console">Open integration console</a>
      </div>
      <div className="stats">
        <div className="stat"><b className="num">{ps.length}</b><span>Policies in force</span></div>
        <div className="stat"><b className="num">{kes(gwp)}</b><span>Annual premium in force</span></div>
        <div className="stat"><b className="num">{by('direct')}</b><span>Sold direct</span></div>
        <div className="stat"><b className="num">{ps.length - by('direct')}</b><span>Sold through partners</span></div>
      </div>
      <div className="panel" style={{ overflowX: 'auto' }}>
        {data === null ? <div className="empty">Loading policies</div> : ps.length === 0 ? <div className="empty">No policies yet. Accept a quote in the channels app and it lands here.</div> : (
          <table className="t">
            <thead><tr><th>Policy</th><th>Policyholder</th><th>Channel</th><th>Product</th><th className="r">Instalment</th><th className="hide-sm">Plan</th><th className="hide-sm">Cover start</th><th>Status</th></tr></thead>
            <tbody>
              {ps.map((p) => {
                const b = BRANDS[p.journey];
                return (
                  <tr key={p.policyNumber} className="click" onClick={() => router.push('/policies/' + p.policyNumber)}>
                    <td><a href={'/policies/' + p.policyNumber} onClick={(e) => e.stopPropagation()} className="num" style={{ fontWeight: 650 }}>{p.policyNumber}</a></td>
                    <td>{p.customer?.name}</td>
                    <td><span className="badge ch"><span className="dotc" style={{ background: b?.color || '#999' }} />{channelOf(p)}</span></td>
                    <td><span className="badge">{productName(p.quote?.product)}</span></td>
                    <td className="r num">{kes(p.quote?.instalment)} <span className="sub">{perLabel(p.quote?.plan)}</span></td>
                    <td className="hide-sm">{p.quote?.plan}</td>
                    <td className="hide-sm">{p.quote?.coverStart}</td>
                    <td><span className="badge ok">{p.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
