import { AuthCard } from '../../ui';

export default function CollegeSignupPage() {
  return (
    <AuthCard
      role="College Registration"
      title="Register your college on InternSuite"
      lead="Create a verified college account to onboard departments, staff users, students, and internship operations."
      submitLabel="Create College Account"
      fields={[
        { label: 'College name', type: 'text', placeholder: 'Example College of Arts and Science' },
        { label: 'Coordinator name', type: 'text', placeholder: 'Internship cell coordinator' },
        { label: 'Official email', type: 'email', placeholder: 'internships@college.edu' },
        { label: 'Password', type: 'password', placeholder: 'Create a secure password' },
      ]}
      secondaryLink={{ href: '/login/college', label: 'Already have an account?' }}
    />
  );
}
