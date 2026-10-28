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
        <Link href="/policies" className="logo" style={{ textDecoration: 'none' }}><i>LP</i>LitePAS</Link>
        <Link href="/policies" className="tab" aria-current={path.startsWith('/policies') ? 'page' : undefined}>Policies</Link>
        <Link href="/console" className="tab" aria-current={path.startsWith('/console') ? 'page' : undefined}>Integration console</Link>
        <div className="right"><span>ICEA LION policy administration</span><button className="btn" onClick={signOut}>Sign out</button></div>
      </div>
    </header>
  );
}
