import type { ReactNode } from "react";
import { publicNav } from "./content";

export function PublicShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand-mark" href="/">
          <span className="brand-badge">InternSuite</span>
          <div>
            <strong>InternSuite</strong>
            <p>Internship Cloud ERP for Colleges</p>
          </div>
        </a>
        <nav className="desktop-nav" aria-label="Public navigation">
          {publicNav.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className="button primary small" href="/auth">
            Register College
          </a>
        </nav>
      </header>
      <section className="page-intro">
        <span className="eyebrow">InternSuite</span>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </section>
      {children}
      <footer className="site-footer">
        <div>
          <strong>InternSuite</strong>
          <p>Copyrighted by Adel Strategic Services.</p>
          <p>ERP developed by Adel Strategic Services, Calicut.</p>
          <p>Contact: adelstrategics@gmail.com</p>
        </div>
        <div className="footer-links">
          <a href="/internships">Explore Internships</a>
          <a href="/auth">Register / Login</a>
          <a href="/pricing">Pricing</a>
        </div>
      </footer>
    </main>
  );
}

export function PortalShell({
  role,
  title,
  lead,
  nav,
  actions,
  children,
}: {
  role: string;
  title: string;
  lead: string;
  nav: Array<{ label: string; href: string }>;
  actions?: Array<{
    label: string;
    href: string;
    tone?: "primary" | "secondary";
  }>;
  children: ReactNode;
}) {
  return (
    <main className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <span className="eyebrow">{role}</span>
          <strong>InternSuite</strong>
          <p>{title}</p>
        </div>
        <nav className="portal-nav" aria-label={`${role} navigation`}>
          {nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <section className="portal-content">
        <header className="portal-header card-surface">
          <div>
            <span className="eyebrow">{role}</span>
            <h1>{title}</h1>
            <p className="lead">{lead}</p>
          </div>
          {actions ? (
            <div className="action-row">
              {actions.map((action) => (
                <a
                  key={action.href + action.label}
                  className={`button ${action.tone === "secondary" ? "secondary" : "primary"}`}
                  href={action.href}
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}
        </header>
        {children}
      </section>
      <nav className="bottom-nav" aria-label={`${role} quick navigation`}>
        {nav.slice(0, 4).map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}

export function StatGrid({
  items,
}: {
  items: Array<{ label: string; value: string; detail: string }>;
}) {
  return (
    <section className="stat-grid">
      {items.map((item) => (
        <article key={item.label} className="card-surface stat-card">
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

export function SectionCard({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="card-surface section-card">
      <div className="section-head">
        <h2>{title}</h2>
        {kicker ? <span className="chip">{kicker}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function SimpleGrid({ children }: { children: ReactNode }) {
  return <section className="simple-grid">{children}</section>;
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.join("-") + index}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="bullet-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PricingGrid({
  plans,
}: {
  plans: Array<{
    name: string;
    price: string;
    audience: string;
    bullets: string[];
    cta: string;
  }>;
}) {
  return (
    <section className="pricing-grid">
      {plans.map((plan) => (
        <article key={plan.name} className="card-surface pricing-card">
          <span className="eyebrow">{plan.name}</span>
          <h3>{plan.price}</h3>
          <p>{plan.audience}</p>
          <BulletList items={plan.bullets} />
          <a className="button primary" href="/auth">
            {plan.cta}
          </a>
        </article>
      ))}
    </section>
  );
}

export function AuthCard({
  role,
  title,
  lead,
  submitLabel,
  fields,
  secondaryLink,
}: {
  role: string;
  title: string;
  lead: string;
  submitLabel: string;
  fields: Array<{ label: string; type: string; placeholder: string }>;
  secondaryLink: { href: string; label: string };
}) {
  return (
    <PublicShell title={title} lead={lead}>
      <section className="auth-layout">
        <article className="card-surface auth-card">
          <span className="eyebrow">{role}</span>
          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.label} className="field">
                <span>{field.label}</span>
                <input type={field.type} placeholder={field.placeholder} />
              </label>
            ))}
          </div>
          <div className="action-row stacked-mobile">
            <button className="button primary" type="button">
              {submitLabel}
            </button>
            <a className="button secondary" href={secondaryLink.href}>
              {secondaryLink.label}
            </a>
          </div>
        </article>
        <article className="card-surface auth-help">
          <h2>Secure account access</h2>
          <BulletList
            items={[
              "Email verification is mandatory before dashboard access.",
              "Forgot password flow issues a time-limited reset link by email.",
              "Sessions are role-specific and protected with signed tokens.",
            ]}
          />
        </article>
      </section>
    </PublicShell>
  );
}

export function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 100},${100 - (value / max) * 100}`,
    )
    .join(" ");

  return (
    <article className="card-surface chart-card">
      <div className="section-head">
        <h2>Applications per semester</h2>
        <span className="chip">Trending upward</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="line-chart"
      >
        <polyline
          fill="none"
          stroke="#1e40af"
          strokeWidth="3"
          points={points}
        />
        {values.map((value, index) => (
          <circle
            key={`${value}-${index}`}
            cx={(index / (values.length - 1)) * 100}
            cy={100 - (value / max) * 100}
            r="2.4"
            fill="#10b981"
          />
        ))}
      </svg>
    </article>
  );
}

export function BarChart({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <article className="card-surface chart-card">
      <div className="section-head">
        <h2>Student participation</h2>
        <span className="chip">Department view</span>
      </div>
      <div className="bar-chart">
        {items.map((item) => (
          <div key={item.label} className="bar-item">
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${item.value}%` }} />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PieChart({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  let offset = 0;
  const stops = items.map((item) => {
    const stop = `${item.color} ${offset}% ${offset + item.value}%`;
    offset += item.value;
    return stop;
  });

  return (
    <article className="card-surface chart-card">
      <div className="section-head">
        <h2>Internship categories</h2>
        <span className="chip">Current cycle</span>
      </div>
      <div className="pie-layout">
        <div
          className="pie-chart"
          style={{ background: `conic-gradient(${stops.join(", ")})` }}
        />
        <div className="legend-list">
          {items.map((item) => (
            <div key={item.label} className="legend-item">
              <span className="legend-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
              <strong>{item.value}%</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
