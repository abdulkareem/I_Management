import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function StudentSignupPage() {
  return (
    <PublicShell
      title="Student registration with OTP verification"
      lead="New students verify their email with a 6-digit OTP, then create a short alphanumeric password before entering the student dashboard."
    >
      <AuthExperience
        initialRole="student"
        initialStage="register"
        heading="Create your verified student identity"
        lead="Complete your academic profile, verify the OTP sent to your email, and then create your password to unlock applications and tracking."
      />
    </PublicShell>
  );
}
