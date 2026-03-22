import { AuthCard } from '../../ui';

export default function StudentLoginPage() {
  return (
    <AuthCard
      role="Student Login"
      title="Continue your internship journey"
      lead="Sign in to view internships, track applications, update your profile, and upload your resume."
      submitLabel="Login"
      fields={[
        { label: 'Email address', type: 'email', placeholder: 'student@college.edu' },
        { label: 'Password', type: 'password', placeholder: 'Enter your password' },
      ]}
      secondaryLink={{ href: '/forgot-password', label: 'Forgot Password' }}
    />
  );
}
