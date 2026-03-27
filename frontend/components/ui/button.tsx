import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonStyles = {
  primary: 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-[0_18px_50px_rgba(79,70,229,0.38)] hover:brightness-110',
  secondary: 'border border-slate-200/90 bg-white/75 text-slate-700 hover:bg-white',
  ghost: 'text-slate-600 hover:bg-white/65',
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
