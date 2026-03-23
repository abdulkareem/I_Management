import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function CollegeSignupPage() {
  return (
    <PublicShell
      title="College onboarding with verified access"
      lead="New colleges complete registration, confirm a 6-digit OTP from email, and then create their password before accessing the college dashboard."
    >
      <AuthExperience
        initialRole="college"
        initialStage="register"
        heading="Register your college on InternSuite"
        lead="Build a verified institution account for internship operations, staff coordination, student governance, and reporting."
      />
    </PublicShell>
  );
}
