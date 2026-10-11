import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'DegenOS — Find the signal. Check the risk.',
  description: 'A multi-chain crypto research terminal for token discovery, market snapshots, watchlists and evidence-led risk checks.',
  applicationName: 'DegenOS', manifest: '/manifest.json', appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DegenOS' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#050706', width: 'device-width', initialScale: 1, maximumScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
