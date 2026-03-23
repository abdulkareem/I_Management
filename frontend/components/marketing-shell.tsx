import type { ReactNode } from 'react';
import { Bolt, ShieldCheck, Sparkles } from 'lucide-react';
import { ButtonLink } from './ui/button';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid-bg min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Prism SaaS</p>
          <p className="text-sm text-slate-400">Multi-tenant operations cloud</p>
        </div>
        <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
          <a href="#testimonials">Customers</a>
        </nav>
        <div className="flex gap-3">
          <ButtonLink variant="ghost" href="/login">Login</ButtonLink>
          <ButtonLink href="/register">Get started</ButtonLink>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-20 lg:px-10">{children}</main>
      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-white/10 px-6 py-10 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3 text-slate-300"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Tenant isolation, audit logs, verification tokens, and role-aware experiences by default.</div>
        <div className="flex gap-4">
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-300" /> Figma-level UX</span>
          <span className="inline-flex items-center gap-2"><Bolt className="h-4 w-4 text-amber-300" /> Fastify + Prisma</span>
        </div>
      </footer>
    </div>
  );
}
