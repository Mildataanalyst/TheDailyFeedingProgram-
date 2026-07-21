import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DFP 2.0',
  description: 'DFP 2.0 internal discovery system'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="dfp-v97-theme dfp-v98-theme dfp-v99-theme dfp-v100-theme dfp-v106-theme dfp-v107-theme dfp-v108-theme dfp-v109-theme dfp-v110-theme dfp-v111-theme">{children}</body>
    </html>
  );
}
