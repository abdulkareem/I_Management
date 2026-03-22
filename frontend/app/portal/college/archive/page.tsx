import { archiveHighlights } from '../../../content';
import { PortalShell } from '../../../ui';

const archiveRows = [
  {
    cycle: 'Semester 3 Foundation Cycle',
    students: '605',
    storage: '41 MB compressed',
    status: 'Archived',
  },
  {
    cycle: 'Semester 4 Allied Cycle',
    students: '482',
    storage: '34 MB compressed',
    status: 'Ready for review',
  },
  {
    cycle: 'Semester 5 Industry Cycle',
    students: '164',
    storage: '12 MB projected',
    status: 'Pending closure',
  },
];

export default function ArchivePage() {
  return (
    <PortalShell
      badge="Archive page"
      title="Past Internship Records and Archived Students"
      lead="Archive history stays available for institutional memory, accreditation evidence, and outcome reporting while keeping active billing clean and predictable."
    >
      <section className="grid-3 top-gap">
        {archiveHighlights.map((item) => (
          <article className="card" key={item}>
            <div className="label">Archive benefit</div>
            <p className="detail">{item}</p>
          </article>
        ))}
      </section>

      <section className="panel section-block nested-panel">
        <div className="section-heading-row">
          <h2 className="section-title">Archived Students</h2>
          <span className="table-highlight">Read-only retention</span>
        </div>
        <div className="table-wrap top-gap">
          <table>
            <thead>
              <tr>
                <th>Semester cycle</th>
                <th>Students</th>
                <th>Compressed storage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {archiveRows.map((row) => (
                <tr key={row.cycle}>
                  <td>{row.cycle}</td>
                  <td>{row.students}</td>
                  <td>{row.storage}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/portal/college">
          Return to college dashboard
        </a>
        <a className="ghost-cta" href="/pricing">
          View archive add-ons
        </a>
      </div>
    </PortalShell>
  );
}
