import { MarketingShell } from '@/components/marketing-shell';
import { AuthForm } from '@/components/auth-form';

export default function RegisterPage() {
  return (
    <MarketingShell>
      <AuthForm mode="register" />
    </MarketingShell>
  );
}
