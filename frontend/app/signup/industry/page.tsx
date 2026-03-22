import { AuthCard } from '../../ui';

export default function IndustrySignupPage() {
  return (
    <AuthCard
      role="Industry Registration"
      title="Join InternSuite as an industry partner"
      lead="Create a free industry account to publish internships, review applicants, and collaborate with colleges."
      submitLabel="Create Industry Account"
      fields={[
        { label: 'Organization name', type: 'text', placeholder: 'Your company or institution' },
        { label: 'Business email', type: 'email', placeholder: 'hr@organization.com' },
        { label: 'Contact person', type: 'text', placeholder: 'Hiring lead or supervisor' },
        { label: 'Password', type: 'password', placeholder: 'Create a secure password' },
      ]}
      secondaryLink={{ href: '/login/industry', label: 'Already have an account?' }}
    />
  );
}
