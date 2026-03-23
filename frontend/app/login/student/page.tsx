import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function StudentLoginPage() {
  return (
    <PublicShell
      title="Student login that knows if you already belong here"
      lead="Returning students can log in and jump into applications, approvals, and internship tracking. New students are redirected to the student onboarding flow first."
    >
      <AuthExperience
        initialRole="student"
        initialStage="login"
        heading="Student dashboard access"
        lead="Use your verified student email to continue your internship journey, manage applications, and update profile records."
      />
    </PublicShell>
  );
}
