import { MarketingShell } from '@/components/marketing-shell';
import { AuthForm } from '@/components/auth-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <MarketingShell>
      <AuthForm mode="reset-password" token={params.token} />
    </MarketingShell>
  );
}
