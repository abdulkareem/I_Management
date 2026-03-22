import { PublicShell, SectionCard } from '../ui';

export default function VerifyEmailPage() {
  return (
    <PublicShell
      title="Verify your email address"
      lead="Every InternSuite account must verify its email before signing in. This protects access by role and keeps academic workflows secure."
    >
      <SectionCard title="Check your inbox" kicker="Verification required">
        <p>
          We send a verification link immediately after registration. Open the
          link from your email to activate your account and continue to your
          dashboard.
        </p>
      </SectionCard>
    </PublicShell>
  );
}
