import type { ReactNode } from "react";

export function PortalShell({
  badge,
  title,
  lead,
  children,
}: {
  badge: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main>
      <section className="panel section-block page-shell">
        <span className="badge">{badge}</span>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {children}
      </section>
    </main>
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
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="label">Applications per semester</div>
          <div className="metric small">{values[values.length - 1]}</div>
        </div>
        <span className="table-highlight">+19% trend</span>
      </div>
      <svg
        className="line-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="Applications per semester trend"
      >
        <polyline
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="3"
          points={points}
        />
        {values.map((value, index) => (
          <circle
            key={`${value}-${index}`}
            cx={(index / (values.length - 1)) * 100}
            cy={100 - (value / max) * 100}
            r="2.5"
            fill="#10B981"
          />
        ))}
      </svg>
    </div>
  );
}

export function BarChart({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="label">Student participation</div>
          <div className="metric small">{items[items.length - 1]?.value}%</div>
        </div>
        <span className="table-highlight">Department-wide</span>
      </div>
      <div className="bar-chart" aria-label="Student participation bar chart">
        {items.map((item) => (
          <div key={item.label} className="bar-item">
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${item.value}%` }} />
            </div>
            <div className="label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieChart({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const stops: string[] = [];
  let offset = 0;
  items.forEach((item) => {
    const next = offset + item.value;
    stops.push(`${item.color} ${offset}% ${next}%`);
    offset = next;
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="label">Internship categories</div>
          <div className="metric small">4 major mixes</div>
        </div>
        <span className="table-highlight">Current semester</span>
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
    </div>
  );
}
