import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-[28px] bg-white p-6 text-black shadow-sm', className)} {...props} />;
}
