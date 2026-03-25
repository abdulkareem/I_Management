import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonStyles = {
  primary: 'bg-white text-slate-950 shadow-[0_20px_60px_rgba(255,255,255,0.18)] hover:bg-slate-200',
  secondary: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
  ghost: 'text-slate-200 hover:bg-white/5',
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
