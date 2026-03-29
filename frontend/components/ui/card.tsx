import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-2xl bg-white p-6 text-black shadow-lg shadow-slate-200/60', className)} {...props} />;
}
