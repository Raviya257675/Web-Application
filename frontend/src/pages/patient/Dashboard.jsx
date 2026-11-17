import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Badge, Empty, ErrorState, Icon, Loader, Money, PageHead, Stat,
} from '../../components/ui';
import { date, dateTime, money, relative, time } from '../../utils/format';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => dashboardApi.get(), []);

  if (loading) return <Loader label="Loading your health overview…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const patient = data?.patient;
  const counts = data?.counts || {};
  const upcoming = data?.upcoming;
  const outstanding = Number(data?.outstanding || 0);
  const records = data?.recentRecords || [];
  const invoices = data?.recentInvoices || [];
  const prescriptions = data?.activePrescriptions || [];
  const labs = data?.recentLabs || [];
  const admission = data?.activeAdmission;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <PageHead
        eyebrow={date(new Date())}
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}.`}
        description="Your appointments, results and balance in one place."
        actions={<Link className="btn btn--primary" to="/patient/book"><Icon name="plus" size={15} /> Book a visit</Link>}
      />

      <div className="split">
        <section className={`card ${upcoming ? 'card--wash' : ''}`}>
          <div className="card__head">
            <div>
              <h3>{upcoming ? 'Your next appointment' : 'No upcoming appointment'}</h3>
              <p className="muted">{upcoming ? relative(upcoming.dateTime) : 'Book a consultant to get started.'}</p>
            </div>
            {upcoming ? <span className="appt__token">Token #{upcoming.tokenNumber ?? '—'}</span> : null}
          </div>
          {upcoming ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div className="avatar" style={{ width: 46, height: 46, fontSize: 14 }}>
                  {upcoming.doctor?.user?.name?.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <strong style={{ fontSize: 17 }}>{upcoming.doctor?.user?.name}</strong>
                  <p className="muted" style={{ fontSize: 12 }}>{upcoming.doctor?.specialization} · {upcoming.doctor?.department?.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: 17 }}>{time(upcoming.dateTime)}</strong>
                  <p className="muted" style={{ fontSize: 12 }}>{date(upcoming.dateTime)}</p>
                </div>
              </div>
              <p className="muted">{upcoming.reason || 'Consultation'}</p>
              <div className="row-gap">
                <Link className="btn btn--sm" to="/patient/appointments">Manage appointment</Link>
                <Link className="btn btn--sm btn--ghost" to={`/patient/records`}>My records</Link>
              </div>
            </>
          ) : (
            <Empty icon="calendar" title="Nothing booked" message="Pick a speciality and a free slot that suits you." action={<Link className="btn btn--primary" to="/patient/book">Book a visit</Link>} />
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card__head"><div><h3>Balance</h3><p className="muted">Across your invoices</p></div></div>
            <strong style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {money(outstanding)}
            </strong>
            <p className="muted">{outstanding > 0 ? 'Outstanding — settle online or at the front desk.' : 'All invoices settled. Thank you.'}</p>
            <div className="row-gap">
              <Link className="btn btn--sm" to="/patient/invoices">View invoices</Link>
              {outstanding > 0 ? <Link className="btn btn--sm btn--primary" to="/patient/invoices">Pay now</Link> : null}
            </div>
          </section>
          {admission ? (
            <div className="notice notice--info">
              <Icon name="bed" size={17} />
              <div>
                <strong>Currently admitted</strong>
                {admission.bed?.ward?.name} · bed {admission.bed?.code}. Admitting consultant {admission.doctor?.user?.name}.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="stat-row">
        <Stat label="Completed visits" value={counts.visits ?? 0} hint="Since registration" icon="check" tone="success" />
        <Stat label="Upcoming" value={counts.upcoming ?? 0} hint="Booked appointments" icon="calendar" />
        <Stat label="Medical records" value={counts.records ?? 0} hint="Signed summaries" icon="file" tone="info" />
        <Stat label="Lab results" value={counts.labResults ?? 0} hint={`${counts.pendingLabs ?? 0} pending`} icon="flask" tone="info" />
      </div>

      <div className="split split--even">
        <section className="card">
          <div className="card__head">
            <div><h3>Recent clinical summaries</h3><p className="muted">Written by your treating doctor</p></div>
            <Link className="link-btn" to="/patient/records">All records</Link>
          </div>
          {records.length === 0 ? <Empty icon="file" title="No records yet" message="After a completed visit your summary appears here." /> : (
            <div className="tile-list">
              {records.map((record) => (
                <div className="tile" key={record.id}>
                  <div className="tile__main">
                    <strong>{record.diagnosis}</strong>
                    <span>{record.doctor?.user?.name} · {date(record.createdAt)}</span>
                  </div>
                  <Link className="link-btn" to="/patient/records">Read</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Recent invoices</h3><p className="muted">Payments and balances</p></div>
            <Link className="link-btn" to="/patient/invoices">All invoices</Link>
          </div>
          {invoices.length === 0 ? <Empty icon="receipt" title="No invoices" message="Consultation invoices appear after a visit completes." /> : (
            <div className="tile-list">
              {invoices.map((invoice) => (
                <div className="tile" key={invoice.id}>
                  <div className="tile__main">
                    <strong>{invoice.invoiceNumber}</strong>
                    <span>{money(invoice.totalAmount)} · paid {money(invoice.amountPaid)}</span>
                  </div>
                  <Badge status={invoice.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="split split--even">
        <section className="card">
          <div className="card__head">
            <div><h3>Active prescriptions</h3><p className="muted">Medicines prescribed to you</p></div>
            <Link className="link-btn" to="/patient/prescriptions">All prescriptions</Link>
          </div>
          {prescriptions.length === 0 ? <Empty icon="pill" title="No prescriptions" message="Prescriptions issued by your doctor appear here." /> : (
            <div className="tile-list">
              {prescriptions.map((prescription) => (
                <div className="tile" key={prescription.id}>
                  <div className="tile__main">
                    <strong>{(prescription.items || []).map((item) => item.medicineName).join(', ')}</strong>
                    <span>{prescription.doctor?.user?.name} · {date(prescription.createdAt)}</span>
                  </div>
                  <Link className="link-btn" to="/patient/prescriptions">View</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Laboratory</h3><p className="muted">Results and pending samples</p></div>
            <Link className="link-btn" to="/patient/lab">All results</Link>
          </div>
          {labs.length === 0 ? <Empty icon="flask" title="No lab tests" message="Tests ordered by your doctor appear here." /> : (
            <div className="tile-list">
              {labs.map((order) => (
                <div className="tile" key={order.id}>
                  <div className="tile__main">
                    <strong>{order.test?.name}</strong>
                    <span>{order.status === 'COMPLETED' ? `Result ${order.resultValue} ${order.resultUnit || ''}` : `Ordered ${relative(order.orderedAt)}`}</span>
                  </div>
                  <Badge status={order.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {patient ? (
        <p className="muted" style={{ fontSize: 12 }}>
          Patient record #{patient.id} · blood group {patient.bloodGroup || '—'} · allergies {patient.allergies || 'none recorded'}.
          Contact the front desk to correct any detail.
        </p>
      ) : null}
    </div>
  );
}
