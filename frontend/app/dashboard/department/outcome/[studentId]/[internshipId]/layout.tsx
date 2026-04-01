import type { ReactNode } from 'react';

export default function DynamicLayout({ children }: { children: ReactNode }) {
  return children;
}

export function generateStaticParams() {
  return [];
}
