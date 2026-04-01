import type { ReactNode } from 'react';

export default function ApplicationScopedLayout({ children }: { children: ReactNode }) {
  return children;
}

export function generateStaticParams() {
  return [];
}
