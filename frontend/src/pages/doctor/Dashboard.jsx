import { useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi, dashboardApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import RecordModal from '../../components/RecordModal.jsx';
import {
  Badge, BarChart, Empty, ErrorState, Icon, Loader, PageHead, Progress, Stat,
} from '../../components/ui';
import { date, dateTime, relative, time } from '../../utils/format';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [recordFor, setRecordFor] = useState(null);
  const { data, loading, error, refetch } = useApi(async () => {
    const [dashboard, records] = await Promise.all([dashboardApi.get(), recordApi.list()]);
    return { data: { ...dashboard.data, myRecords: records.data || [] } };
  }, []);

  if (loading) return <Loader label="Preparing your clinic…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const counts = data?.counts || {};
  const today = data?.todayAppointments || [];
  const next = data?.nextAppointment;
  const trends = data?.trends || [];
  const records = data?.myRecords || [];
  const recordAppointments = new Set(records.map((record) => record.appointment?.id));
  const labs = data?.pendingLabOrders || [];
  const leaves = data?.leaves || [];
  const doctor = data?.doctor;

  const complete = async (appointment) => {
    if (!window.confirm(`Complete ${appointment.patient?.user?.name}'s visit and generate the invoice?`)) return;
    try {
      await appointmentApi.complete(appointment.id);
      toast.success('Visit completed · invoice generated');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <PageHead
        eyebrow={date(new Date())}
        title={`${greeting}, ${user?.name || 'Doctor'}.`}
        description={`${today.length} visit${today.length === 1 ? '' : 's'} on today's list · ${doctor?.department?.name || ''}`}
        actions={(
          <>
            <Link className="btn" to="/doctor/availability"><Icon name="clock" size={15} /> Availability</Link>
            <Link className="btn btn--primary" to="/doctor/appointments"><Icon name="calendar" size={15} /> Day sheet</Link>
          </>
        )}
      />

      <div className="stat-row">
        <Stat label="Today's visits" value={counts.today ?? 0} hint={`${counts.completedToday ?? 0} completed`} icon="calendar" />
        <Stat label="Patients treated" value={counts.patients ?? 0} hint="Under your care" icon="users" tone="info" />
        <Stat label="Records written" value={counts.records ?? 0} hint="Clinical documentation" icon="file" tone="success" />
        <Stat label="Pending labs" value={counts.pendingLabs ?? 0} hint="Awaiting results" icon="flask" tone={counts.pendingLabs ? 'warning' : 'success'} />
      </div>

      <div className="split">
        <section className="card card--flush">
          <div className="card__head">
            <div>
              <h3>Today&apos;s queue</h3>
              <p className="muted">Token order · complete a visit to unlock its record and invoice</p>
            </div>
            <Link className="link-btn" to="/doctor/appointments">Full list</Link>
          </div>
          {today.length === 0 ? (
            <Empty icon="calendar" title="No visits today" message="Your next clinic will appear here. Check your availability template." action={<Link className="btn btn--sm" to="/doctor/availability">Review availability</Link>} />
          ) : (
            <div className="stack" style={{ padding: 'var(--sp-3)' }}>
              {today.map((appointment) => (
                <article className={`card appt appt--${appointment.status.toLowerCase()}`} key={appointment.id}>
                  <div className="appt__when">
                    <span className="appt__day">{appointment.status === 'COMPLETED' ? 'Completed' : relative(appointment.dateTime)}</span>
                    <strong>{time(appointment.dateTime)}</strong>
                    <span className="appt__token">Token #{appointment.tokenNumber ?? '—'}</span>
                  </div>
                  <div className="appt__who">
                    <h4>{appointment.patient?.user?.name}</h4>
                    <span className="appt__reason">{appointment.reason || 'No reason recorded'}</span>
                    <div className="inline-meta">
                      <span>{appointment.patient?.age ?? '—'} yrs</span>
                      <span className="dot-sep">{appointment.patient?.bloodGroup || '—'}</span>
                      {appointment.patient?.allergies && appointment.patient.allergies !== 'None' ? (
                        <span className="chip chip--warn">Allergy: {appointment.patient.allergies}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="appt__side">
                    <Badge status={appointment.status.toLowerCase()} />
                    <div className="appt__actions">
                      {appointment.status === 'BOOKED' ? (
                        <button type="button" className="btn btn--sm btn--success" onClick={() => complete(appointment)}>Complete visit</button>
                      ) : null}
                      {appointment.status === 'COMPLETED' ? (
                        recordAppointments.has(appointment.id)
                          ? <Link className="btn btn--sm" to="/doctor/records">View record</Link>
                          : <button type="button" className="btn btn--sm btn--primary" onClick={() => setRecordFor(appointment)}>Write record</button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card__head"><div><h3>Next appointment</h3><p className="muted">Your immediate next visit</p></div></div>
            {next ? (
              <>
                <div className="inline-meta" style={{ justifyContent: 'space-between' }}>
                  <span>{relative(next.dateTime)}</span>
                  <span className="appt__token">Token #{next.tokenNumber}</span>
                </div>
                <h3 style={{ fontSize: 20 }}>{next.patient?.user?.name}</h3>
                <p className="muted">{dateTime(next.dateTime)}</p>
                <p className="muted" style={{ fontSize: 13 }}>{next.reason}</p>
                <Link className="btn btn--sm" to={`/doctor/patients/${next.patient?.id}`}>Open patient chart</Link>
              </>
            ) : (
              <Empty icon="check" title="Nothing upcoming" message="All caught up." />
            )}
          </section>

          <section className="card">
            <div className="card__head"><div><h3>Visits this week</h3><p className="muted">Booked per day</p></div></div>
            <BarChart data={trends.map((item) => ({ label: item.label, value: item.count, date: item.date }))} height={130} />
          </section>
        </div>
      </div>

      <div className="split split--even">
        <section className="card">
          <div className="card__head">
            <div><h3>Laboratory follow-ups</h3><p className="muted">Results you ordered</p></div>
            <Link className="link-btn" to="/doctor/lab">All orders</Link>
          </div>
          {labs.length === 0 ? <Empty icon="flask" title="No pending labs" message="Ordered tests appear here until resulted." /> : (
            <div className="tile-list">
              {labs.map((order) => (
                <div className="tile" key={order.id}>
                  <div className="tile__main">
                    <strong>{order.test?.name}</strong>
                    <span>{order.patient?.user?.name} · ordered {relative(order.orderedAt)}</span>
                  </div>
                  <Badge status={order.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Recent records</h3><p className="muted">Your latest clinical notes</p></div>
            <Link className="link-btn" to="/doctor/records">Open records</Link>
          </div>
          {records.length === 0 ? <Empty icon="file" title="No records yet" message="Complete a visit to write the first record." /> : (
            <div className="tile-list">
              {records.slice(0, 4).map((record) => (
                <div className="tile" key={record.id}>
                  <div className="tile__main">
                    <strong>{record.diagnosis}</strong>
                    <span>{record.patient?.user?.name} · {date(record.createdAt)}</span>
                  </div>
                  <Link className="link-btn" to="/doctor/records">View</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {leaves.length ? (
        <section className="card">
          <div className="card__head"><div><h3>Your leave</h3><p className="muted">Approved leave blocks new bookings</p></div></div>
          <div className="tile-list">
            {leaves.map((leave) => (
              <div className="tile" key={leave.id}>
                <div className="tile__main">
                  <strong>{date(leave.startDate)} → {date(leave.endDate)}</strong>
                  <span>{leave.reason}</span>
                </div>
                <Badge status={leave.status.toLowerCase()} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <RecordModal
        open={Boolean(recordFor)}
        appointment={recordFor}
        onClose={() => setRecordFor(null)}
        onSaved={() => { setRecordFor(null); refetch(); }}
      />
    </div>
  );
}
