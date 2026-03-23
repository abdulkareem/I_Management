import AuthExperience from './AuthExperience';
import { PublicShell, SectionCard } from '../ui';

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const initialRole = params.role === 'student' || params.role === 'industry' ? params.role : 'college';

  return (
    <PublicShell
      title="One click to the right internship workspace"
      lead="Every login and register button now checks whether the email already exists, routes new users to the correct onboarding form, sends a 6-digit OTP for verification, and unlocks dashboard access only after password creation."
    >
      <AuthExperience
        initialRole={initialRole}
        heading="A polished email-first journey that behaves like a real SaaS product"
        lead="Choose your role, enter your email once, and InternSuite decides whether to move you into registration or toward the right dashboard login path."
      />

      <SectionCard title="What changed" kicker="Auth orchestration">
        <div className="card-list auth-logic-grid">
          <article className="mini-card info-card">
            <strong>Existing account detection</strong>
            <p>Role-aware discovery prevents duplicate signups and routes existing users straight into the right login experience.</p>
          </article>
          <article className="mini-card info-card">
            <strong>OTP-first registration</strong>
            <p>New users complete their profile, receive a 6-digit OTP by email, verify it, and only then can create a password.</p>
          </article>
          <article className="mini-card info-card">
            <strong>Dashboard-safe access</strong>
            <p>Login returns a signed session token and sends users to the correct student, college, or industry dashboard.</p>
          </article>
        </div>
      </SectionCard>
    </PublicShell>
  );
}
