import { AuthCard } from '../../ui';

export default function IndustryLoginPage() {
  return (
    <AuthCard
      role="Industry Login"
      title="Manage internships and applicants"
      lead="Sign in to post internships, review applicants, shortlist candidates, and coordinate interview decisions."
      submitLabel="Login"
      fields={[
        { label: 'Business email', type: 'email', placeholder: 'talent@company.com' },
        { label: 'Password', type: 'password', placeholder: 'Enter your password' },
      ]}
      secondaryLink={{ href: '/forgot-password', label: 'Forgot Password' }}
    />
  );
}
