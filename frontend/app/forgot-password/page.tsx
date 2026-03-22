import { PublicShell, SectionCard } from '../ui';

export default function ForgotPasswordPage() {
  return (
    <PublicShell
      title="Forgot your password?"
      lead="Request a secure password reset link. Reset emails are time-limited and role-aware for college, student, and industry users."
    >
      <SectionCard title="Password reset" kicker="Secure recovery">
        <div className="form-grid single-column">
          <label className="field">
            <span>Email address</span>
            <input type="email" placeholder="Enter your account email" />
          </label>
          <button type="button" className="button primary">
            Send Reset Link
          </button>
        </div>
      </SectionCard>
    </PublicShell>
  );
}
