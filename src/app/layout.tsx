import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { brand, model, render } from '@/config/car';
import './globals.css';

const display = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: `${brand.model} | ${brand.tagline}`,
  description: `${brand.model}: ${brand.tagline} Explore it in 3D, configure your colour and book a test drive.`,
};

export const viewport: Viewport = {
  themeColor: '#060607',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Start the big downloads alongside the JS instead of after hydration. */}
        <link rel="preload" href={model.url} as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href={render.environment.files} as="fetch" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
