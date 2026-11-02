'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
export default function Nav() {
  const path = usePathname(); const router = useRouter();
  if (path.startsWith('/login') || path.startsWith('/customer')) return null;
  const signOut = async () => { await fetch('/api/login', { method: 'DELETE' }); router.replace('/login'); };
  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/policies" className="logo" style={{ textDecoration: 'none' }}><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><rect x="1" y="1" width="20" height="20" rx="6" fill="#0B1324"/><rect x="6" y="6" width="3" height="10" rx="1.5" fill="#fff"/><rect x="11" y="10" width="5" height="3" rx="1.5" fill="#27AAE1"/></svg>LitePAS<span className="for">for ICEA LION</span></Link>
        <Link href="/policies" className="tab" aria-current={path.startsWith('/policies') ? 'page' : undefined}>Policies</Link>
        <Link href="/console" className="tab" aria-current={path.startsWith('/console') ? 'page' : undefined}>Integration console</Link>
        <div className="right"><span className="env">UAT</span><button className="btn" onClick={signOut}>Sign out</button></div>
      </div>
    </header>
  );
}
