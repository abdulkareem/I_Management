import AuthExperience from '../../auth/AuthExperience';
import { PublicShell } from '../../ui';

export default function IndustrySignupPage() {
  return (
    <PublicShell
      title="Industry registration with instant OTP verification"
      lead="New companies and organizations verify their email first, create a 4 to 12 character alphanumeric password after OTP confirmation, and then open the partner dashboard."
    >
      <AuthExperience
        initialRole="industry"
        initialStage="register"
        heading="Become a verified internship partner"
        lead="Share internship opportunities, review applicants, and coordinate attendance and performance from a modern partner portal."
      />
    </PublicShell>
  );
}
