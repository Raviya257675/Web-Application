import HospitalFooter from './HospitalFooter';
import HospitalWelcome from './HospitalWelcome';
import './hospital-public.css';
import { Link } from 'react-router-dom';
import { publicApi } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/ui';
import { HeroVisual } from '../components/MedicalVisuals.jsx';
import { money } from '../utils/format';

const FEATURES = [
  {
    icon: 'calendar',
    title: 'Conflict-free scheduling',
    text: 'Weekly consulting windows, slot-grid validation, doctor leave and double-booking checks run before a booking is ever accepted.',
  },
  {
    icon: 'receipt',
    title: 'Billing that adds up',
    text: 'Invoices generate automatically when a visit completes. Partial payments, discounts, tax and PDF statements are built in.',
  },
  {
    icon: 'pill',
    title: 'Pharmacy & stock',
    text: 'Dispense against a prescription, decrement batches FEFO, and get low-stock alerts before a shelf runs empty.',
  },
  {
    icon: 'flask',
    title: 'Laboratory workflow',
    text: 'Order tests, track sample collection and publish results straight into the patient portal.',
  },
  {
    icon: 'bed',
    title: 'Wards & admissions',
    text: 'Live bed occupancy, admissions, discharge summaries and the final room invoice in a single flow.',
  },
  {
    icon: 'shield',
    title: 'Audited by default',
    text: 'Every clinical and financial action is recorded with the actor, entity and IP address for a complete audit trail.',
  },
];

const STEPS = [
  ['Register or sign in', 'Choose Patient, Doctor, Administrator, Receptionist or Pharmacist. Staff applications are approved by hospital administration.'],
  ['Book or run the clinic', 'Patients pick a real free slot; doctors see a token-ordered day sheet and complete visits in one click.'],
  ['Everything follows', 'Completing a visit unlocks the clinical record, generates the invoice and notifies the patient.'],
];

export default function Landing() {
  const { user } = useAuth();
  const stats = useApi(() => publicApi.stats(), []);
  const departments = useApi(() => publicApi.departments(), []);
  const doctors = useApi(() => publicApi.doctors(), []);

  const s = stats.data || {};
  const specialties = departments.data || [];
  const team = (doctors.data || []).slice(0, 3);

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav__inner">
          <Link to="/" className="brand">
            <span className="brand__mark">M</span>
            <span>Meridian <em>HMS</em></span>
          </Link>
          <div className="lp-nav__links">
            <a href="#specialities">Specialities</a>
            <a href="#platform">Platform</a>
            <a href="#how">How it works</a>
            <a href="#roles">Portals</a>
          </div>
          <div className="lp-nav__actions">
            {user ? (
              <Link className="btn btn--primary" to={`/${user.role.toLowerCase()}`}>Open dashboard</Link>
            ) : (
              <>
                <Link className="btn btn--ghost" to="/login">Sign in</Link>
                <Link className="btn btn--primary" to="/register">Book a visit</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <HospitalWelcome />

      <section className="lp-band">
        <div className="lp-band__inner">
          <div className="lp-stat"><strong>{s.departments ?? 5}</strong><span>Clinical departments</span></div>
          <div className="lp-stat"><strong>{s.doctors ?? 6}</strong><span>Consultants on the roster</span></div>
          <div className="lp-stat"><strong>{s.patients ?? 0}</strong><span>Registered patients</span></div>
          <div className="lp-stat"><strong>{s.years ?? 18}</strong><span>Years of service</span></div>
        </div>
      </section>

      <section className="lp-section" id="specialities">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <span className="lp-eyebrow">Specialities</span>
            <h2>Consultants across the hospital, with their live hours</h2>
            <p className="lp-lead">
              Each department publishes its own fee, and every consultant maintains a weekly availability
              template. The booking engine only offers what the doctor actually works.
            </p>
          </div>
          <div className="lp-grid lp-grid--4">
            {specialties.map((department) => (
              <article className="lp-card" key={department.id}>
                <span className="lp-feature-icon"><Icon name="heart" size={17} /></span>
                <h3>{department.name}</h3>
                <p>{department.description}</p>
                <dl className="lp-card__meta">
                  <div><dt>Consultants</dt><dd>{department.doctorCount}</dd></div>
                  <div><dt>Consultation</dt><dd>{money(department.consultationFee)}</dd></div>
                </dl>
              </article>
            ))}
            {specialties.length === 0 ? <div className="lp-empty-state">Loading departments…</div> : null}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--alt" id="platform">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <span className="lp-eyebrow">The platform</span>
            <h2>Six modules that usually live in six different systems</h2>
            <p className="lp-lead">
              Our teams bring consultations, diagnostics, medicines and inpatient care together to support your health journey.</p>
          </div>
          <div className="lp-grid lp-grid--3">
            {FEATURES.map((feature) => (
              <article className="lp-card" key={feature.title}>
                <span className="lp-feature-icon"><Icon name={feature.icon} size={17} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="roles">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <span className="lp-eyebrow">One hospital · five workspaces</span>
            <h2>Everyone sees exactly their part of the hospital</h2>
          </div>
          <div className="lp-role-grid">
            <article className="lp-role">
              <span className="lp-role__tag">Patients</span>
              <h3>Book, read, pay</h3>
              <p>Self-register, choose a consultant, pick a genuinely free slot, then read results and settle invoices from the same portal.</p>
              <ul className="lp-list">
                <li>Live availability with reasons for disabled slots</li>
                <li>Diagnosis, vitals and prescriptions after the visit</li>
                <li>Pay in full or in part, download a PDF statement</li>
              </ul>
            </article>
            <article className="lp-role">
              <span className="lp-role__tag">Doctors</span>
              <h3>Run the clinic</h3>
              <p>A token-ordered day sheet, one-click completion that generates the invoice, and clinical records that unlock only after the visit.</p>
              <ul className="lp-list">
                <li>Day sheet scoped to the signed-in consultant</li>
                <li>Diagnosis, vitals, follow-up and prescriptions</li>
                <li>Order lab tests and review results</li>
              </ul>
            </article>
            <article className="lp-role">
              <span className="lp-role__tag">Administration</span>
              <h3>Run the hospital</h3>
              <p>Departments, staff accounts, rosters, revenue, pharmacy stock, laboratory workload and bed occupancy.</p>
              <ul className="lp-list">
                <li>Review staff applications and manage five roles</li>
                <li>Pharmacy and laboratory operations</li>
                <li>Audit trail for every sensitive action</li>
              </ul>
            </article>
            <article className="lp-role"><span className="lp-role__tag">Receptionists</span><h3>Welcome and coordinate</h3><p>Register patients, book and reschedule visits, check in arrivals, and record counter payments.</p><ul className="lp-list"><li>Appointment queue and arrival tracking</li><li>Patient contact details and bed availability</li><li>Payment history and PDF receipts</li></ul></article>
            <article className="lp-role"><span className="lp-role__tag">Pharmacists</span><h3>Manage medicines safely</h3><p>Receive stock, track expiry dates, dispense doctor-issued prescriptions and record stock write-offs.</p><ul className="lp-list"><li>Batch inventory and stock movements</li><li>Expired stock and duplicate dispensing checks</li><li>Low-stock alerts and dispensing history</li></ul></article>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--alt" id="how">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <span className="lp-eyebrow">How it works</span>
            <h2>Three steps from the front door to a closed invoice</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map(([title, text], index) => (
              <li className="lp-step" key={title}>
                <span className="lp-step__num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-band__inner">
          <div className="lp-stat"><strong>Compassion</strong><span>Care that respects every person</span></div><div className="lp-stat"><strong>Clarity</strong><span>Information to help you plan your care</span></div><div className="lp-stat"><strong>Connection</strong><span>Your care journey in one place</span></div><div className="lp-stat"><strong>Community</strong><span>Working towards healthier lives</span></div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section__inner">
          <div className="lp-section__head">
            <span className="lp-eyebrow">Meet the team</span>
            <h2>Meet your hospital consultants</h2>
            <p className="lp-lead">Create your patient account to book appointments and access your own hospital records.</p>
          </div>
          <div className="lp-grid lp-grid--3">
            {team.map((doctor) => (
              <article className="lp-card" key={doctor.id}>
                <span className="lp-role__tag">{doctor.department}</span>
                <h3>{doctor.name}</h3>
                <p>{doctor.bio}</p>
                <dl className="lp-card__meta">
                  <div><dt>Specialty</dt><dd>{doctor.specialization}</dd></div>
                  <div><dt>Experience</dt><dd>{doctor.experienceYears ?? '—'} years</dd></div>
                </dl>
              </article>
            ))}
            {team.length === 0 ? <div className="lp-empty-state">Loading the roster…</div> : null}
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-final__inner">
          <div>
            <h2>Your care, connected in one place.</h2>
            <p className="muted">
              Register with your own email and password. Return anytime to manage your appointments
              and view your hospital records.
            </p>
          </div>
          <div className="lp-cta-row">
            <Link className="btn btn--primary btn--lg" to="/login">Sign in to your account</Link>
            <Link className="btn btn--lg" to="/register">Register as a patient</Link>
          </div>
        </div>
      </section>

      <section className="hospital-purpose" id="purpose"><div><span>OUR PURPOSE</span><h2>Care that begins with listening.</h2><h3>Our mission</h3><p>To offer compassionate, coordinated care and clear communication, supporting every patient with dignity.</p></div><div><h3>Our vision</h3><p>A healthier community where people feel heard, informed and supported at every stage of life.</p><h3>Your experience matters</h3><p>Share a suggestion or ask for assistance with your hospital experience.</p><a className="btn btn--primary" href="/support">Share feedback ↗</a><p>Sign in to submit and track your support requests.</p></div></section><HospitalFooter />
    </div>
  );
}
