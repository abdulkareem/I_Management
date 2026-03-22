import { AuthCard } from '../../ui';

export default function StudentSignupPage() {
  return (
    <AuthCard
      role="Student Registration"
      title="Create your student account"
      lead="Register with your verified email, college ID, and university registration number to access InternSuite securely."
      submitLabel="Start Verification"
      fields={[
        { label: 'Full name', type: 'text', placeholder: 'Your full name' },
        { label: 'College email', type: 'email', placeholder: 'student@college.edu' },
        { label: 'College ID', type: 'text', placeholder: 'College-issued student ID' },
        { label: 'University registration number', type: 'text', placeholder: 'University registration number' },
      ]}
      secondaryLink={{ href: '/verify-email', label: 'Already verified your email?' }}
    />
  );
}
