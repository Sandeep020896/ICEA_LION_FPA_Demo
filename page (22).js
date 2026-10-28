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
      <p className="sub" style={{ marginTop: 0 }}>Demo access for the ICEA LION Product Builder POC</p>
      <div className="field" style={{ margin: '18px 0 12px' }}><label htmlFor="pw">Password</label><input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary big" style={{ marginTop: 12 }} disabled={busy || !pw}>Sign in</button>
    </form>
  );
}
export default function Login() {
  return (
    <div className="login" data-brand="icea">
      <div className="login-l">
        <div className="wordmark" style={{ color: '#fff' }}>ICEA LION</div>
        <div>
          <h1>One product, every channel, priced live</h1>
          <p>Jamii Protect sold direct and through partners. Eligibility, cover and price come from ICEA LION's services on Coherent Spark.</p>
        </div>
        <small style={{ opacity: .7 }}>Product Builder POC, October 2026</small>
      </div>
      <div className="login-r"><Suspense><Form /></Suspense></div>
    </div>
  );
}
