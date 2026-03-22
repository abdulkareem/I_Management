import { costModel, pricingPlans } from "../content";
import { PortalShell } from "../ui";

export default function PricingPage() {
  return (
    <PortalShell
      badge="Pricing page"
      title="Simple annual pricing for colleges"
      lead="Students and industry partners never need a paid subscription. Each college plan includes semester operations, archive retention, and controlled collaboration tools."
    >
      <div className="pricing-grid top-gap">
        {pricingPlans.map((plan) => (
          <article className="pricing-card" key={plan.name}>
            <div className="pricing-tier">{plan.name}</div>
            <div className="pricing-price">{plan.price}</div>
            <p className="detail">{plan.audience}</p>
            <ul className="feature-list">
              <li>{plan.students}</li>
              <li>{plan.archive}</li>
              <li>{plan.support}</li>
              <li>{plan.addOn}</li>
              <li>{plan.archiveAddOn}</li>
            </ul>
            <p className="detail top-gap">{plan.highlight}</p>
          </article>
        ))}
      </div>

      <section className="panel section-block nested-panel">
        <div className="section-heading-row">
          <h2 className="section-title">Compare Plans</h2>
          <span className="table-highlight">College-only billing</span>
        </div>
        <div className="table-wrap top-gap">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Foundation</th>
                <th>Growth</th>
                <th>Statewide</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Annual fee</td>
                <td>₹22,000</td>
                <td>₹50,000</td>
                <td>₹75,000+</td>
              </tr>
              <tr>
                <td>Active students / semester</td>
                <td>500</td>
                <td>2,000</td>
                <td>5,000</td>
              </tr>
              <tr>
                <td>Archive allowance</td>
                <td>2,000</td>
                <td>6,000</td>
                <td>20,000</td>
              </tr>
              <tr>
                <td>Partner college sharing</td>
                <td>Yes</td>
                <td>Yes + priority routing</td>
                <td>Network-wide</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>Basic</td>
                <td>Advanced</td>
                <td>Executive + custom</td>
              </tr>
              <tr>
                <td>Industry subscription</td>
                <td>Free</td>
                <td>Free</td>
                <td>Free</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stats stats-4 section-block">
        {costModel.map((item) => (
          <article className="card" key={item.label}>
            <div className="metric small">{item.value}</div>
            <div className="label">{item.label}</div>
            <p className="detail">{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/portal/college">
          Register Your College →
        </a>
        <a className="ghost-cta" href="/">
          ← Back to landing page
        </a>
      </div>
    </PortalShell>
  );
}
