import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prism SaaS',
  description:
    'Prism is a multi-tenant SaaS platform starter with tenant isolation, email verification, role-based access control, notifications, and premium product design.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050816',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-white antialiased">{children}</body>
    </html>
  );
}
