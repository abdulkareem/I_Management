import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-[28px] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)]', className)} {...props} />;
}
