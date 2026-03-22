import { archiveHighlights, collegeNav } from '../../../content';
import { DataTable, PortalShell, SectionCard, StatGrid } from '../../../ui';

const stats = [
  { label: 'Archived students', value: '1,087', detail: 'Students preserved in read-only mode for audits and institutional reporting.' },
  { label: 'Cycles retained', value: '3', detail: 'Completed semester cycles currently available in archive search.' },
  { label: 'Compressed storage', value: '87 MB', detail: 'Optimized archive storage for certificates, reports, and summaries.' },
];

export default function ArchivePage() {
  return (
    <PortalShell
      role="College Panel"
      title="Archive"
      lead="Review past internship records and archived students without mixing completed cycles into live operational dashboards."
      nav={collegeNav}
    >
      <StatGrid items={stats} />
      <SectionCard title="Archive highlights" kicker="Read-only retention">
        <ul className="bullet-list">
          {archiveHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Archived cycles" kicker="Past internship records">
        <DataTable
          columns={['Semester cycle', 'Students', 'Storage', 'Status']}
          rows={[
            ['Semester 3 Foundation Cycle', '605', '41 MB compressed', 'Archived'],
            ['Semester 4 Allied Cycle', '318', '26 MB compressed', 'Archived'],
            ['Semester 5 Industry Cycle', '164', '20 MB compressed', 'Ready to archive'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
