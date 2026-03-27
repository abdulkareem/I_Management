import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonStyles = {
  primary: 'bg-primary text-white shadow-sm hover:bg-blue-700',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
  ghost: 'text-slate-900 hover:bg-slate-100',
} as const;

const baseClass =
  'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60';

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
