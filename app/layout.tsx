import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DFP 2.0',
  description: 'DFP 2.0 internal discovery system'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="dfp-v97-theme">{children}</body>
    </html>
  );
}
