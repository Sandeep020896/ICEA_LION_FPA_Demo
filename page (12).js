'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Form() {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const router = useRouter(); const sp = useSearchParams();
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (r.ok) router.replace(sp.get('next') || '/'); else setErr('That password is not right. Check it and try again.');
  }
  return (
    <form className="login-box" onSubmit={go}>
      <h2>Sign in</h2>
      <p className="sub" style={{ marginTop: 0 }}>Policy administration for the ICEA LION Product Builder POC</p>
      <div className="field" style={{ margin: '18px 0 12px' }}><label htmlFor="pw">Password</label><input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary big" style={{ marginTop: 12 }} disabled={busy || !pw}>Sign in</button>
    </form>
  );
}
export default function Login() {
  return (
    <div className="login" >
      <div className="login-l">
        <div style={{ fontWeight: 650, fontSize: 16, letterSpacing: '-.01em' }}>LitePAS <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 450 }}>for ICEA LION</span></div>
        <div>
          <h1>Every accepted quote, from every channel, in one place</h1>
          <p>Policy administration for ICEA LION's Jamii Protect. Each policy keeps the product, rating and quote versions it was priced on, and the Spark calls behind it.</p>
        </div>
        <small style={{ color: 'rgba(255,255,255,.55)' }}>Product Builder POC, October 2026</small>
      </div>
      <div className="login-r"><Suspense><Form /></Suspense></div>
    </div>
  );
}
