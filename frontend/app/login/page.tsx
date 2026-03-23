import { MarketingShell } from '@/components/marketing-shell';
import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <MarketingShell>
      <AuthForm mode="login" />
    </MarketingShell>
  );
}
