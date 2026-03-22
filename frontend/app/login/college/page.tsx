import { AuthCard } from '../../ui';

export default function CollegeLoginPage() {
  return (
    <AuthCard
      role="College Login"
      title="Access your college workspace"
      lead="Sign in to manage students, listings, partner colleges, applications, reports, and subscription settings."
      submitLabel="Login"
      fields={[
        { label: 'Work email', type: 'email', placeholder: 'coordinator@college.edu' },
        { label: 'Password', type: 'password', placeholder: 'Enter your password' },
      ]}
      secondaryLink={{ href: '/forgot-password', label: 'Forgot Password' }}
    />
  );
}
