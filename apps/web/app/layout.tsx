import type { Metadata } from 'next';
import { Chivo, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import type { PropsWithChildren } from 'react';
import './globals.css';

const display = Chivo({ subsets: ['latin'], variable: '--font-display' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body' });
const data = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-data' });

export const metadata: Metadata = {
  title: { default: 'Source Mesh', template: '%s · Source Mesh' },
  description: 'Visible, governed data operations from source evidence to customer delivery.',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  );
}
