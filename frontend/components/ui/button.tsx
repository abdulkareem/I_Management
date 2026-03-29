import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonStyles = {
  primary: 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:bg-slate-400',
  secondary: 'border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 disabled:bg-slate-100',
  ghost: 'text-slate-900 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300',
} as const;

const baseClass =
  'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70';

export function Button({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles; children: ReactNode }) {
  return <button className={cn(baseClass, buttonStyles[variant], className)} {...props}>{children}</button>;
}

export function ButtonLink({
  className,
  variant = 'primary',
  children,
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: keyof typeof buttonStyles; children: ReactNode; href: string }) {
  return <Link href={href} className={cn(baseClass, buttonStyles[variant], className)} {...props}>{children}</Link>;
}
