import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
        className,
      )}
      {...props}
    />
  );
}
