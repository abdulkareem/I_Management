'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BulletList } from '../ui';
import { discoverEmail, login, sendOtp, setPassword, type AuthRole, verifyOtp } from '../lib/auth';

const roleMeta: Record<AuthRole, { label: string; loginPath: string; signupPath: string }> = {
  college: {
    label: 'College',
    loginPath: '/login/college',
    signupPath: '/signup/college',
  },
  student: {
    label: 'Student',
    loginPath: '/login/student',
    signupPath: '/signup/student',
  },
  industry: {
    label: 'Industry',
    loginPath: '/login/industry',
    signupPath: '/signup/industry',
  },
};

const suggestedRoles: Record<string, string[]> = {
  IT: ['Backend Intern', 'Frontend Intern', 'QA Intern'],
  MANUFACTURING: ['Production Intern', 'Quality Intern', 'Supply Chain Intern'],
  HEALTHCARE: ['Clinical Ops Intern', 'Lab Support Intern', 'Health Data Intern'],
  FINANCE: ['Financial Analyst Intern', 'Audit Intern', 'Operations Intern'],
  EDUCATION: ['Academic Operations Intern', 'EdTech Intern', 'Research Support Intern'],
  RETAIL: ['Store Operations Intern', 'Merchandising Intern', 'Customer Success Intern'],
  LOGISTICS: ['Warehouse Ops Intern', 'Dispatch Intern', 'Planning Intern'],
  AGRICULTURE: ['AgriTech Intern', 'Field Operations Intern', 'Quality Intern'],
  MEDIA: ['Content Intern', 'Video Production Intern', 'Social Media Intern'],
  GOVERNMENT: ['Public Systems Intern', 'Programme Intern', 'Data Support Intern'],
  OTHER: ['Project Intern', 'Operations Intern', 'Analyst Intern'],
};

interface AuthExperienceProps {
  initialRole?: AuthRole;
  initialStage?: 'discover' | 'login' | 'register';
  heading: string;
  lead: string;
}

type Stage = 'discover' | 'register' | 'activate' | 'login';

const baseStudentRegistration = {
  fullName: '',
  universityRegNo: '',
  photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
  photoSizeBytes: '180000',
  dob: '',
  whatsappNumber: '',
  address: '',
  programme: '',
  year: '3',
  semester: '6',
  collegeId: 'college-demo',
};

const baseCollegeRegistration = {
  collegeName: '',
  logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
  logoSizeBytes: '140000',
  address: '',
  university: '',
  isAutonomous: true,
  subscriptionPlan: 'FOUNDATION',
};

const baseIndustryRegistration = {
  industryName: '',
  logoUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
  logoSizeBytes: '120000',
  industryField: 'IT',
  description: '',
  internshipRoles: suggestedRoles.IT.join(', '),
};

export default function AuthExperience({ initialRole = 'college', initialStage = 'discover', heading, lead }: AuthExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [email, setEmail] = useState(emailParam);
  const [password, setPasswordInput] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [studentRegistration, setStudentRegistration] = useState(baseStudentRegistration);
  const [collegeRegistration, setCollegeRegistration] = useState(baseCollegeRegistration);
  const [industryRegistration, setIndustryRegistration] = useState(baseIndustryRegistration);

  const roleDetails = roleMeta[role];

  const registerBullets = useMemo(() => {
    if (role === 'student') {
      return [
        'We first check whether your email already exists.',
        'If you are new, we create a 6-digit OTP and email it instantly.',
        'After verification, you create a 4 to 12 character alphanumeric password.',
      ];
    }

    if (role === 'college') {
      return [
        'Official email discovery decides whether to login or register.',
        'Verified college admins unlock the college workspace only after OTP confirmation.',
        'Password creation stays blocked until the OTP is successfully verified.',
      ];
    }

    return [
      'Business email discovery prevents duplicate partner accounts.',
      'Internship partners receive a 6-digit OTP before any credential is created.',
      'After verification, you set a secure 4 to 12 character alphanumeric password.',
    ];
  }, [role]);

  function setSession(accessToken: string, principal: { email: string; role: string }) {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('internsuite.session', JSON.stringify({ accessToken, principal }));
  }

  function onRoleChange(nextRole: AuthRole) {
    setRole(nextRole);
    if (stage === 'login') {
      router.replace(`${roleMeta[nextRole].loginPath}${email ? `?email=${encodeURIComponent(email)}` : ''}`);
      return;
    }
    if (stage === 'register' || stage === 'activate') {
      router.replace(`${roleMeta[nextRole].signupPath}${email ? `?email=${encodeURIComponent(email)}` : ''}`);
    }
  }

  function registrationPayload() {
    if (role === 'student') {
      return {
        ...studentRegistration,
        photoSizeBytes: Number(studentRegistration.photoSizeBytes),
        year: Number(studentRegistration.year),
        semester: Number(studentRegistration.semester),
      };
    }

    if (role === 'college') {
      return {
        ...collegeRegistration,
        logoSizeBytes: Number(collegeRegistration.logoSizeBytes),
      };
    }

    return {
      ...industryRegistration,
      logoSizeBytes: Number(industryRegistration.logoSizeBytes),
      internshipRoles: industryRegistration.internshipRoles
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    };
  }

  async function handleDiscovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await discoverEmail(email, role);
      setMessage(result.message);
      router.push(`${result.redirectTo}?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to check this email right now.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setOtpPreview(null);

    try {
      const result = await sendOtp({
        email,
        role,
        registration: registrationPayload(),
      });

      if (result.exists) {
        router.push(`${roleDetails.loginPath}?email=${encodeURIComponent(email)}`);
        return;
      }

      setStage('register');
      setMessage(result.message);
      setOtpPreview(result.otpPreview ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start registration.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await verifyOtp(email, otp);
      setStage('activate');
      setMessage(`${result.message} Create your password below.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordCreation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await setPassword(email, password);
      setStage('login');
      setPasswordInput('');
      setMessage(`${result.message} Login now to open your ${roleDetails.label.toLowerCase()} dashboard.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password setup failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await login(email, password);
      setSession(result.accessToken, result.principal);
      setMessage(`${result.message} Redirecting to your dashboard...`);
      router.push(result.redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  const stageTitle =
    stage === 'discover'
      ? 'Start with your email'
      : stage === 'register'
        ? 'Register and verify'
        : stage === 'activate'
          ? 'Create your password'
          : 'Login to your dashboard';

  return (
    <section className="auth-experience-grid">
      <article className="card-surface auth-story-card">
        <span className="eyebrow">Intelligent access</span>
        <h2>{heading}</h2>
        <p>{lead}</p>

        <div className="segmented-control" role="tablist" aria-label="Select role">
          {(Object.keys(roleMeta) as AuthRole[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className={`segment ${entry === role ? 'active' : ''}`}
              onClick={() => onRoleChange(entry)}
            >
              {roleMeta[entry].label}
            </button>
          ))}
        </div>

        <div className="card-surface auth-glass-card">
          <div className="section-head compact-head">
            <h3>How this works</h3>
            <span className="chip">Live logic</span>
          </div>
          <BulletList items={registerBullets} />
        </div>

        <div className="auth-metric-row">
          <div className="mini-card stat-mini">
            <strong>6-digit OTP</strong>
            <p>Generated during registration and delivered to email instantly.</p>
          </div>
          <div className="mini-card stat-mini">
            <strong>4–12 chars</strong>
            <p>Passwords must be alphanumeric and include at least one letter and one number.</p>
          </div>
        </div>
      </article>

      <article className="card-surface auth-flow-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">{roleDetails.label} flow</span>
            <h2>{stageTitle}</h2>
          </div>
          <span className="chip">{stage.toUpperCase()}</span>
        </div>

        {message ? <p className="auth-feedback">{message}</p> : null}
        {otpPreview ? (
          <div className="otp-preview-banner">
            <strong>OTP preview</strong>
            <span>{otpPreview}</span>
            <p>Shown because email delivery is simulated when Resend is not configured.</p>
          </div>
        ) : null}

        {stage === 'discover' ? (
          <form className="form-grid" onSubmit={handleDiscovery}>
            <label className="field">
              <span>Email address</span>
              <input
                required
                type="email"
                placeholder={
                  role === 'college'
                    ? 'placements@college.edu'
                    : role === 'student'
                      ? 'student@college.edu'
                      : 'hr@company.com'
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? 'Checking account...' : 'Check my access'}
            </button>
          </form>
        ) : null}

        {stage === 'register' ? (
          <div className="auth-stack">
            <form className="form-grid" onSubmit={handleRegistration}>
              <label className="field full-span">
                <span>Email address</span>
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>

              {role === 'student' ? (
                <>
                  <label className="field">
                    <span>Full name</span>
                    <input
                      required
                      value={studentRegistration.fullName}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>University registration number</span>
                    <input
                      required
                      value={studentRegistration.universityRegNo}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, universityRegNo: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Date of birth</span>
                    <input
                      required
                      type="date"
                      value={studentRegistration.dob}
                      onChange={(event) => setStudentRegistration((current) => ({ ...current, dob: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>WhatsApp number</span>
                    <input
                      required
                      value={studentRegistration.whatsappNumber}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, whatsappNumber: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field full-span">
                    <span>Address</span>
                    <input
                      required
                      value={studentRegistration.address}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Programme</span>
                    <input
                      required
                      value={studentRegistration.programme}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, programme: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Year</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max="8"
                      value={studentRegistration.year}
                      onChange={(event) => setStudentRegistration((current) => ({ ...current, year: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Semester</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max="12"
                      value={studentRegistration.semester}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, semester: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>College ID</span>
                    <input
                      required
                      value={studentRegistration.collegeId}
                      onChange={(event) =>
                        setStudentRegistration((current) => ({ ...current, collegeId: event.target.value }))
                      }
                    />
                  </label>
                </>
              ) : null}

              {role === 'college' ? (
                <>
                  <label className="field">
                    <span>College name</span>
                    <input
                      required
                      value={collegeRegistration.collegeName}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, collegeName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>University</span>
                    <input
                      required
                      value={collegeRegistration.university}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, university: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field full-span">
                    <span>Address</span>
                    <input
                      required
                      value={collegeRegistration.address}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Logo URL</span>
                    <input
                      required
                      value={collegeRegistration.logoUrl}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, logoUrl: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Plan</span>
                    <select
                      value={collegeRegistration.subscriptionPlan}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, subscriptionPlan: event.target.value }))
                      }
                    >
                      <option value="FOUNDATION">Foundation</option>
                      <option value="GROWTH">Growth</option>
                    </select>
                  </label>
                  <label className="field checkbox-field full-span">
                    <input
                      type="checkbox"
                      checked={collegeRegistration.isAutonomous}
                      onChange={(event) =>
                        setCollegeRegistration((current) => ({ ...current, isAutonomous: event.target.checked }))
                      }
                    />
                    <span>Autonomous institution</span>
                  </label>
                </>
              ) : null}

              {role === 'industry' ? (
                <>
                  <label className="field">
                    <span>Organization name</span>
                    <input
                      required
                      value={industryRegistration.industryName}
                      onChange={(event) =>
                        setIndustryRegistration((current) => ({ ...current, industryName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Industry field</span>
                    <select
                      value={industryRegistration.industryField}
                      onChange={(event) =>
                        setIndustryRegistration((current) => ({
                          ...current,
                          industryField: event.target.value,
                          internshipRoles: suggestedRoles[event.target.value].join(', '),
                        }))
                      }
                    >
                      {Object.keys(suggestedRoles).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field full-span">
                    <span>Description</span>
                    <textarea
                      required
                      minLength={20}
                      value={industryRegistration.description}
                      onChange={(event) =>
                        setIndustryRegistration((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Logo URL</span>
                    <input
                      required
                      value={industryRegistration.logoUrl}
                      onChange={(event) =>
                        setIndustryRegistration((current) => ({ ...current, logoUrl: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Internship roles</span>
                    <input
                      required
                      value={industryRegistration.internshipRoles}
                      onChange={(event) =>
                        setIndustryRegistration((current) => ({ ...current, internshipRoles: event.target.value }))
                      }
                    />
                  </label>
                </>
              ) : null}

              <button className="button primary full-span" type="submit" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Create account and send OTP'}
              </button>
            </form>

            <form className="form-grid compact-form" onSubmit={handleOtpVerification}>
              <label className="field full-span">
                <span>6-digit OTP</span>
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter OTP from email"
                />
              </label>
              <button className="button secondary full-span" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        ) : null}

        {stage === 'activate' ? (
          <form className="form-grid compact-form" onSubmit={handlePasswordCreation}>
            <label className="field full-span">
              <span>Email address</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field full-span">
              <span>Create password</span>
              <input
                required
                type="password"
                minLength={4}
                maxLength={12}
                pattern="[A-Za-z0-9]{4,12}"
                value={password}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="4-12 alphanumeric"
              />
            </label>
            <button className="button secondary full-span" type="submit" disabled={loading}>
              {loading ? 'Saving password...' : 'Create password'}
            </button>
          </form>
        ) : null}

        {stage === 'login' ? (
          <form className="form-grid compact-form" onSubmit={handleLogin}>
            <label className="field full-span">
              <span>Email address</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field full-span">
              <span>Password</span>
              <input
                required
                type="password"
                minLength={4}
                maxLength={12}
                value={password}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Your password"
              />
            </label>
            <button className="button primary full-span" type="submit" disabled={loading}>
              {loading ? 'Opening dashboard...' : `Login to ${roleDetails.label} dashboard`}
            </button>
          </form>
        ) : null}
      </article>
    </section>
  );
}
