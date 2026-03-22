import { studentNav } from '../../../content';
import { PortalShell, SectionCard } from '../../../ui';

export default function StudentProfilePage() {
  return (
    <PortalShell
      role="Student Panel"
      title="Profile"
      lead="Maintain your skills, resume, and academic details so your applications stay complete and ready for review."
      nav={studentNav}
      actions={[
        { label: 'Update Profile', href: '/portal/student/profile' },
        { label: 'Upload Resume', href: '/portal/student/profile', tone: 'secondary' },
      ]}
    >
      <SectionCard title="Skills and resume" kicker="Profile workspace">
        <div className="form-grid">
          <label className="field"><span>Core skills</span><input type="text" placeholder="Data analysis, communication, Excel, Python" /></label>
          <label className="field"><span>Resume upload</span><input type="text" placeholder="Resume ready for upload" /></label>
        </div>
      </SectionCard>
    </PortalShell>
  );
}
