import { Icon } from './ui';

export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual__orb hero-visual__orb--one" />
      <div className="hero-visual__orb hero-visual__orb--two" />
      <div className="hero-visual__chip hero-visual__chip--one">
        <Icon name="heart" size={14} />
        Patient-first care
      </div>
      <div className="hero-visual__chip hero-visual__chip--two">
        <Icon name="bell" size={14} />
        Live notifications
      </div>

      <div className="hero-visual__frame">
        <div className="hero-visual__toolbar">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-visual__content">
          <div className="hero-visual__overview">
            <div className="hero-visual__welcome">
              <div>
                <strong>Good morning, Dr. Reed</strong>
                <p>Cardiology clinic is running smoothly today.</p>
              </div>
              <span className="hero-visual__pulse"><Icon name="activity" size={16} /></span>
            </div>

            <div className="hero-visual__stats">
              <article>
                <span>Scheduled</span>
                <strong>18</strong>
              </article>
              <article>
                <span>Lab orders</span>
                <strong>06</strong>
              </article>
              <article>
                <span>Invoices</span>
                <strong>12</strong>
              </article>
            </div>

            <div className="hero-visual__timeline">
              <div className="hero-visual__timeline-title">
                <strong>Today&apos;s care flow</strong>
                <span>Connected across every unit</span>
              </div>
              <div className="hero-visual__timeline-grid">
                <div><Icon name="calendar" size={15} /><span>Appointments</span></div>
                <div><Icon name="file" size={15} /><span>Records</span></div>
                <div><Icon name="receipt" size={15} /><span>Billing</span></div>
                <div><Icon name="pill" size={15} /><span>Pharmacy</span></div>
              </div>
            </div>
          </div>

          <div className="hero-visual__sidecard">
            <div className="hero-visual__doctor">
              <div className="hero-visual__doctor-icon"><Icon name="shield" size={18} /></div>
              <div>
                <strong>Secure role access</strong>
                <span>JWT + permission based routing</span>
              </div>
            </div>

            <div className="hero-visual__mini-chart">
              {[64, 86, 74, 96, 78].map((height, index) => (
                <span key={height + index} style={{ height: `${height}%` }} />
              ))}
            </div>

            <div className="hero-visual__side-list">
              <div>
                <span className="hero-visual__dot hero-visual__dot--success" />
                <small>Lab results uploaded</small>
              </div>
              <div>
                <span className="hero-visual__dot hero-visual__dot--warning" />
                <small>Low stock alert triggered</small>
              </div>
              <div>
                <span className="hero-visual__dot hero-visual__dot--info" />
                <small>Follow-up reminder sent</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthIllustration() {
  return (
    <div className="auth-illustration" aria-hidden="true">
      <div className="auth-illustration__glow" />
      <div className="auth-illustration__card auth-illustration__card--primary">
        <div className="auth-illustration__row">
          <span className="auth-illustration__badge"><Icon name="calendar" size={14} /></span>
          <div>
            <strong>Book smarter</strong>
            <p>See only genuine free slots in real time.</p>
          </div>
        </div>
      </div>
      <div className="auth-illustration__grid">
        <div className="auth-illustration__tile">
          <span><Icon name="file" size={16} /></span>
          <strong>Clinical notes</strong>
          <p>Private, accurate and instantly available.</p>
        </div>
        <div className="auth-illustration__tile">
          <span><Icon name="receipt" size={16} /></span>
          <strong>Invoice status</strong>
          <p>Track balances and download polished PDFs.</p>
        </div>
        <div className="auth-illustration__tile">
          <span><Icon name="flask" size={16} /></span>
          <strong>Lab updates</strong>
          <p>Results flow straight into the patient portal.</p>
        </div>
        <div className="auth-illustration__tile">
          <span><Icon name="bell" size={16} /></span>
          <strong>Instant alerts</strong>
          <p>Get reminders and workflow notifications faster.</p>
        </div>
      </div>
    </div>
  );
}
