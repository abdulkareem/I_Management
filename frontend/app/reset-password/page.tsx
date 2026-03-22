import { PublicShell, SectionCard } from '../ui';

export default function ResetPasswordPage() {
  return (
    <PublicShell
      title="Set a new password"
      lead="Use your secure email link to create a new password and continue with verified access to InternSuite."
    >
      <SectionCard title="Choose a new password" kicker="Time-limited link">
        <div className="form-grid">
          <label className="field">
            <span>New password</span>
            <input type="password" placeholder="Enter a new password" />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input type="password" placeholder="Re-enter the password" />
          </label>
          <button type="button" className="button primary">
            Save New Password
          </button>
        </div>
      </SectionCard>
    </PublicShell>
  );
}
