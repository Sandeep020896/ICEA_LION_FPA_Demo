import './globals.css';
export const metadata = { title: 'ICEA LION | Jamii Protect', description: 'Jamii Protect quotes across ICEA LION direct and partner channels, priced live by Coherent Spark.' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
