import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
export const metadata = { title: 'ICEA LION | Jamii Protect', description: 'Jamii Protect quotes across ICEA LION direct and partner channels, priced live by Coherent Spark.' };
export default function RootLayout({ children }) {
  return <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}><body>{children}</body></html>;
}
