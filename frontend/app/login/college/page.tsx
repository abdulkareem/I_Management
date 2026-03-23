import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function CollegeLoginPage() {
  return (
    <PublicShell
      title="College admin login"
      lead="Existing college admins can sign in and move directly into the operations dashboard, while new institutions are routed to verified onboarding."
    >
      <AuthExperience
        initialRole="college"
        initialStage="login"
        heading="Open your college workspace"
        lead="Manage departments, internships, approvals, reports, and subscription operations from one verified SaaS command center."
      />
    </PublicShell>
  );
}
