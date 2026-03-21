import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PRISM – Rural Internship & Skill Mission',
  description:
    'Production-ready multi-tenant SaaS PWA for Calicut FYUGP internship compliance, industry partnerships, and academic governance.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'PRISM',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#071321',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
