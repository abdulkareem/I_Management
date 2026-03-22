import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'InternSuite',
  description:
    'InternSuite is a public-facing internship cloud ERP for colleges with separate role access for colleges, students, industry partners, and private super admin operations.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'InternSuite',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
