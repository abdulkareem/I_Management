import { PublicShell, SectionCard } from '../ui';

export default function VerifyEmailPage() {
  return (
    <PublicShell
      title="Email verification happens with a 6-digit OTP"
      lead="InternSuite now sends a six-digit code during registration. Users must verify the OTP first and can only then create a 4 to 12 character alphanumeric password."
    >
      <SectionCard title="Verification sequence" kicker="Registration security">
        <div className="card-list auth-logic-grid">
          <article className="mini-card info-card">
            <strong>1. Submit registration</strong>
            <p>We save the selected role profile only after confirming the email does not already belong to an existing account.</p>
          </article>
          <article className="mini-card info-card">
            <strong>2. Receive OTP</strong>
            <p>A 6-digit OTP is generated and sent to the supplied email address for identity verification.</p>
          </article>
          <article className="mini-card info-card">
            <strong>3. Create password</strong>
            <p>Only verified users can create their password and continue into the correct dashboard.</p>
          </article>
        </div>
      </SectionCard>
    </PublicShell>
  );
}
