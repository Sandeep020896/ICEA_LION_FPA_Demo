import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Nav from '@/components/Nav';
export const metadata = { title: 'LitePAS | ICEA LION policy administration', description: 'Policy administration for Jamii Protect, receiving accepted quotes from every channel.' };
export default function RootLayout({ children }) {
  return <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}><body><Nav />{children}</body></html>;
}
