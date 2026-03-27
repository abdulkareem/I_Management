import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-2xl border border-slate-300 bg-white/90 px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-500 focus:border-indigo-400',
        className,
      )}
      {...props}
    />
  );
}
