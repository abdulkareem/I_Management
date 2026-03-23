'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { discover, forgotPassword, login, register, resetPassword } from '@/lib/auth';

interface AuthFormProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
  token?: string;
}

const initialRegisterState = {
  tenantName: '',
  tenantSlug: '',
  plan: 'FREE',
  name: '',
  email: '',
  password: '',
  registrationNumber: '',
  dob: '',
  whatsappNumber: '',
  address: '',
  programme: '',
  year: '1',
  semester: '1',
  photoUrl: '',
};

export function AuthForm({ mode, token }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState('northstar-university');
  const [email, setEmail] = useState('admin@northstar.edu');
  const [password, setPassword] = useState('Demo12345');
  const [registerState, setRegisterState] = useState(initialRegisterState);

  const heading = useMemo(() => {
    switch (mode) {
      case 'register':
        return 'Create a tenant-aware account';
      case 'forgot-password':
        return 'Recover access safely';
      case 'reset-password':
        return 'Create a new password';
      default:
        return 'Tenant-aware login';
    }
  }, [mode]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const discovery = await discover({ tenantSlug, email });
      if (!discovery.data.exists) {
        setMessage('No account exists in this workspace yet. Continue with registration.');
        router.push('/register');
        return;
      }
      await login({ tenantSlug, email, password });
      setMessage('Login successful. Redirecting to your dashboard...');
      router.push('/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await register({
        ...registerState,
        year: Number(registerState.year),
        semester: Number(registerState.semester),
      });
      const preview = JSON.stringify(response.data.delivery);
      setMessage(`Registration complete. Check your email for a verification link. Delivery preview: ${preview}`);
      router.push('/verify-email');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await forgotPassword({ tenantSlug, email });
      setMessage(`If the account exists, a reset email has been sent. Delivery preview: ${JSON.stringify(response.data.delivery)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await resetPassword({ token: token ?? '', password });
      setMessage('Password reset successful. Redirecting to login...');
      router.push('/login');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[34px] p-8 lg:p-10">
        <Badge>Premium workspace access</Badge>
        <h1 className="mt-5 text-4xl font-semibold text-white">{heading}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          Workspace slug, email verification, role-aware access control, and Prisma-backed persistence are already part of the flow.
        </p>
        <div className="mt-8 grid gap-4 text-slate-300">
          {[
            'Use the seeded demo workspace: northstar-university / admin@northstar.edu / Demo12345.',
            'New registrations create a tenant if the slug is unused, otherwise they join an existing tenant.',
            'Verification and password reset links are delivered through Resend when configured, with safe previews during local development.',
          ].map((item) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-4">{item}</div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[34px] p-8 lg:p-10">
        {message ? <div className="mb-6 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{message}</div> : null}

        {mode === 'login' ? (
          <form className="grid gap-4" onSubmit={handleLogin}>
            <Input placeholder="Tenant slug" value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} required />
            <Input placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button disabled={loading}>{loading ? 'Signing in…' : 'Login'}</Button>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRegister}>
            {[
              ['tenantName', 'Tenant name'],
              ['tenantSlug', 'Tenant slug'],
              ['name', 'Full name'],
              ['email', 'Email address'],
              ['registrationNumber', 'Registration number'],
              ['whatsappNumber', 'WhatsApp number'],
              ['programme', 'Programme'],
              ['photoUrl', 'Photo URL'],
              ['dob', 'Date of birth'],
              ['address', 'Address'],
            ].map(([field, label]) => (
              <Input
                key={field}
                placeholder={label}
                type={field === 'email' ? 'email' : field === 'dob' ? 'date' : 'text'}
                className={field === 'address' ? 'md:col-span-2' : ''}
                value={registerState[field as keyof typeof initialRegisterState]}
                onChange={(event) => setRegisterState((current) => ({ ...current, [field]: event.target.value }))}
                required={field !== 'photoUrl'}
              />
            ))}
            <Input placeholder="Password" type="password" value={registerState.password} onChange={(event) => setRegisterState((current) => ({ ...current, password: event.target.value }))} required />
            <select className="h-12 rounded-2xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white outline-none" value={registerState.plan} onChange={(event) => setRegisterState((current) => ({ ...current, plan: event.target.value }))}>
              <option value="FREE">Free plan</option>
              <option value="PRO">Pro plan</option>
            </select>
            <Input placeholder="Academic year" value={registerState.year} onChange={(event) => setRegisterState((current) => ({ ...current, year: event.target.value }))} required />
            <Input placeholder="Semester" value={registerState.semester} onChange={(event) => setRegisterState((current) => ({ ...current, semester: event.target.value }))} required />
            <Button className="md:col-span-2" disabled={loading}>{loading ? 'Creating account…' : 'Register and send verification'}</Button>
          </form>
        ) : null}

        {mode === 'forgot-password' ? (
          <form className="grid gap-4" onSubmit={handleForgotPassword}>
            <Input placeholder="Tenant slug" value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} required />
            <Input placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Button disabled={loading}>{loading ? 'Sending reset email…' : 'Send reset link'}</Button>
          </form>
        ) : null}

        {mode === 'reset-password' ? (
          <form className="grid gap-4" onSubmit={handleResetPassword}>
            <Input value={token ?? ''} disabled />
            <Input placeholder="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button disabled={loading}>{loading ? 'Saving password…' : 'Reset password'}</Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
