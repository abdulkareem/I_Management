import { AuthCard } from '../../ui';

export default function StudentSignupPage() {
  return (
    <AuthCard
      role="Student Registration"
      title="Create your student account"
      lead="Register using your college email to access internships, upload documents, and track application progress."
      submitLabel="Create Student Account"
      fields={[
        { label: 'Full name', type: 'text', placeholder: 'Your full name' },
        { label: 'College email', type: 'email', placeholder: 'student@college.edu' },
        { label: 'Register number', type: 'text', placeholder: 'University or college register number' },
        { label: 'Password', type: 'password', placeholder: 'Create a secure password' },
      ]}
      secondaryLink={{ href: '/login/student', label: 'Already have an account?' }}
    />
  );
}
