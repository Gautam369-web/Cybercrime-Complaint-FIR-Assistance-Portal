import type { Metadata, Viewport } from 'next';
import '../src/styles.css';
import '../src/liquid-glass.css';
import '../src/lens-world.css';
import '../src/management.css';

export const metadata: Metadata = {
  title: 'The Village of Justice — A safe place to begin',
  description:
    'A calm place to prepare your cybercrime complaint. One step at a time, in your own language.',
};

export const viewport: Viewport = {
  themeColor: '#101e25',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
