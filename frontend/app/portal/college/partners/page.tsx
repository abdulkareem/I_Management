import { collegeNav, partnerColleges } from '../../../content';
import { PortalShell, SectionCard, SimpleGrid } from '../../../ui';

export default function PartnerCollegesPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Partner colleges"
      lead="Add partner colleges, review shared opportunity rules, and maintain collaboration without exposing protected records."
      nav={collegeNav}
      actions={[{ label: 'Add Partner College', href: '/portal/college/partners' }]}
    >
      <SimpleGrid>
        {partnerColleges.map((item) => (
          <article key={item.name} className="card-surface listing-card">
            <h3>{item.name}</h3>
            <p>{item.status}</p>
            <p>{item.shareRule}</p>
          </article>
        ))}
      </SimpleGrid>
      <SectionCard title="Shared internship visibility" kicker="Protected collaboration">
        <p>
          Colleges can see shared listings and seat alerts, but never another
          college’s private analytics, student profiles, or subscription data.
        </p>
      </SectionCard>
    </PortalShell>
  );
}
