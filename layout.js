import './globals.css';
import Nav from '@/components/Nav';
export const metadata = { title: 'LitePAS | ICEA LION policy administration', description: 'Policy administration for Jamii Protect, receiving accepted quotes from every channel.' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap" rel="stylesheet" />
      </head>
      <body><Nav />{children}</body>
    </html>
  );
}
