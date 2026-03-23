import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function IndustryLoginPage() {
  return (
    <PublicShell
      title="Industry partner login"
      lead="Returning partners can log in immediately, while new organizations are redirected into OTP-based onboarding before posting internships."
    >
      <AuthExperience
        initialRole="industry"
        initialStage="login"
        heading="Continue as an industry partner"
        lead="Review applicants, publish internships, and collaborate with colleges from a secure, role-aware dashboard."
      />
    </PublicShell>
  );
}
