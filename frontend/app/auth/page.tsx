import { authFlowCards } from '../content';
import { PublicShell, SectionCard } from '../ui';

export default function AuthPage() {
  return (
    <PublicShell
      title="Register / Login"
      lead="InternSuite uses an email-first flow: enter email, auto-detect whether you should login or register, verify OTP, then continue to password creation."
    >
      <section className="section-grid two-col">
        <SectionCard title="Email-first entry" kicker="Screen 1">
          <div className="form-grid single-column">
            <label className="field">
              <span>Email address</span>
              <input type="email" placeholder="Enter your email address" />
            </label>
            <button type="button" className="button primary">
              Continue
            </button>
          </div>
          <p>
            Existing account → password login. New account → role selection and registration form for student,
            college, or industry.
          </p>
        </SectionCard>
        <SectionCard title="Registration data capture" kicker="Screen 2 onward">
          <ul className="bullet-list">
            <li>Student: full name, university registration number, photo, DOB, WhatsApp, address, programme, year, semester.</li>
            <li>College: college name, emblem/logo, address, university, and autonomous status.</li>
            <li>Industry: industry name, logo, field, and dynamically suggested internship roles.</li>
          </ul>
        </SectionCard>
      </section>

      <SectionCard title="Flow logic" kicker="Frontend orchestration">
        <div className="card-list">
          {authFlowCards.map((item) => (
            <article key={item.title} className="mini-card info-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </PublicShell>
  );
}
