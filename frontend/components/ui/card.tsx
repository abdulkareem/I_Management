import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-[28px] p-6 shadow-[0_24px_65px_rgba(37,99,235,0.14)]', className)} {...props} />;
}
