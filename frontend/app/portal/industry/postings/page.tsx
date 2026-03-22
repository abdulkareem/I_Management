import { industryNav } from '../../../content';
import { PortalShell, SectionCard } from '../../../ui';

export default function IndustryPostingsPage() {
  return (
    <PortalShell
      role="Industry Panel"
      title="Post internship"
      lead="Create a new internship listing, choose visibility, and publish roles for verified college workflows."
      nav={industryNav}
      actions={[{ label: 'Post Internship', href: '/portal/industry/postings' }]}
    >
      <SectionCard title="New listing" kicker="Post Internship">
        <div className="form-grid">
          <label className="field"><span>Role title</span><input type="text" placeholder="Internship title" /></label>
          <label className="field"><span>Seats</span><input type="text" placeholder="Number of seats" /></label>
          <label className="field"><span>Mode</span><input type="text" placeholder="On-site / Hybrid / Remote" /></label>
          <label className="field"><span>Application deadline</span><input type="text" placeholder="DD Month YYYY" /></label>
        </div>
      </SectionCard>
    </PortalShell>
  );
}
