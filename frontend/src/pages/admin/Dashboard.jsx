import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  BarChart, Badge, Empty, ErrorState, Icon, Loader, Money, PageHead, Progress, Stat,
} from '../../components/ui';
import { compactMoney, date, money, time } from '../../utils/format';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(() => dashboardApi.get(), []);
  const [metric, setMetric] = useState('appointments');

  if (loading) return <Loader label="Loading the hospital overview…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const counts = data?.counts || {};
  const revenue = data?.revenue || {};
  const beds = data?.beds || {};
  const trends = data?.trends || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const departments = data?.departmentLoad || [];
  const recent = data?.recentAppointments || [];
  const lowStock = data?.lowStockMedicines || [];
  const pendingLabs = data?.pendingLabOrders || [];
  const admissions = data?.activeAdmissions || [];
  const totalStatus = statusBreakdown.reduce((sum, item) => sum + Number(item.count), 0) || 1;
  const maxDept = Math.max(1, ...departments.map((d) => Number(d.appointments)));

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <PageHead
        eyebrow={date(new Date())}
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'Asha'}.`}
        description="The whole hospital at a glance — clinic load, revenue, stock, samples and beds."
        actions={
          <>
            <Link className="btn" to="/admin/audit"><Icon name="file" size={15} /> Audit trail</Link>
            <Link className="btn btn--primary" to="/admin/appointments"><Icon name="plus" size={15} /> New appointment</Link>
          </>
        }
      />

      <div className="stat-row">
        <Stat label="Patients" value={counts.patients ?? '—'} hint="Registered patient records" icon="users" />
        <Stat label="Appointments today" value={counts.appointmentsToday ?? '—'} hint={`${counts.upcoming ?? 0} upcoming overall`} icon="calendar" tone="info" />
        <Stat label="Revenue today" value={compactMoney(revenue.today)} hint={`${compactMoney(revenue.month)} this month`} icon="receipt" tone="success" />
        <Stat label="Outstanding" value={compactMoney(revenue.outstanding)} hint="Unpaid across all invoices" icon="alert" tone="warning" />
      </div>

      <div className="stat-row">
        <Stat label="Beds occupied" value={`${beds.occupied ?? 0}/${beds.total ?? 0}`} hint={`${beds.rate ?? 0}% occupancy`} icon="bed" />
        <Stat label="Active admissions" value={counts.activeAdmissions ?? 0} hint="In-patients currently admitted" icon="activity" tone="info" />
        <Stat label="Pharmacy alerts" value={counts.lowStock ?? 0} hint="Medicines at or below reorder level" icon="pill" tone={counts.lowStock ? 'warning' : 'success'} />
        <Stat label="Samples pending" value={counts.pendingLabs ?? 0} hint="Lab orders awaiting results" icon="flask" tone="info" />
      </div>

      <div className="split">
        <section className="card">
          <div className="card__head">
            <div>
              <h3>Hospital activity · last 7 days</h3>
              <p className="muted">Appointments booked and payments received per day</p>
            </div>
            <div className="tabs">
              <button type="button" className={`tab ${metric === 'appointments' ? 'is-active' : ''}`} onClick={() => setMetric('appointments')}>Visits</button>
              <button type="button" className={`tab ${metric === 'revenue' ? 'is-active' : ''}`} onClick={() => setMetric('revenue')}>Revenue</button>
            </div>
          </div>
          <BarChart
            data={trends.map((item) => ({
              label: item.label,
              value: metric === 'revenue' ? Number(item.revenue) : Number(item.appointments),
              date: item.date,
            }))}
            formatter={metric === 'revenue' ? compactMoney : undefined}
            height={190}
          />
          <div className="inline-meta" style={{ justifyContent: 'space-between' }}>
            <span>Peak day: {Math.max(...trends.map((t) => Number(t.appointments) || 0), 0)} visits</span>
            <span>Collections this week: {money(trends.reduce((sum, t) => sum + Number(t.revenue || 0), 0))}</span>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h3>Revenue position</h3>
              <p className="muted">Billed versus collected</p>
            </div>
            <Link className="link-btn" to="/admin/billing">Open billing</Link>
          </div>
          <div>
            <strong style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(revenue.collected)}</strong>
            <span className="muted" style={{ display: 'block', fontSize: 12 }}>collected of {money(revenue.billed)} billed</span>
          </div>
          <Progress
            value={Number(revenue.collected || 0)}
            max={Number(revenue.billed || 1)}
            label={`${Math.round((Number(revenue.collected || 0) / Math.max(1, Number(revenue.billed || 0))) * 100)}% realised`}
          />
          <div className="grid-2" style={{ marginTop: 4 }}>
            <div className="detail"><span>Outstanding</span><strong>{money(revenue.outstanding)}</strong></div>
            <div className="detail"><span>This month</span><strong>{money(revenue.month)}</strong></div>
          </div>
          <div className="tile-list" style={{ marginTop: 'auto' }}>
            {statusBreakdown.map((item) => (
              <div className="tile" key={item.status}>
                <div className="tile__main">
                  <strong><Badge status={item.status.toLowerCase()} /> </strong>
                  <Progress value={Number(item.count)} max={totalStatus} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="split">
        <section className="card card--flush">
          <div className="card__head">
            <div>
              <h3>Recent appointments</h3>
              <p className="muted">Latest bookings across every department</p>
            </div>
            <Link className="link-btn" to="/admin/appointments">View all</Link>
          </div>
          {recent.length === 0 ? (
            <Empty title="No appointments yet" message="Bookings will appear here as soon as patients reserve a slot." />
          ) : (
            <div className="table-wrap" style={{ border: 0, boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Doctor</th><th>When</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.map((appointment) => (
                    <tr key={appointment.id}>
                      <td><strong>{appointment.patient?.user?.name}</strong></td>
                      <td>{appointment.doctor?.user?.name}<span className="muted" style={{ display: 'block', fontSize: 11 }}>{appointment.doctor?.specialization}</span></td>
                      <td>{date(appointment.dateTime)}<span className="muted" style={{ display: 'block', fontSize: 11 }}>{time(appointment.dateTime)}</span></td>
                      <td><Badge status={appointment.status.toLowerCase()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Department load</h3><p className="muted">All-time visits per department</p></div>
          </div>
          <div className="stack stack--tight">
            {departments.map((department) => (
              <div key={department.name}>
                <div className="inline-meta" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{department.name}</strong>
                  <span>{department.appointments} visits · {department.doctors} doctors</span>
                </div>
                <Progress value={Number(department.appointments)} max={maxDept} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="split split--wide">
        <section className="card">
          <div className="card__head">
            <div><h3>Pharmacy alerts</h3><p className="muted">Reorder before the shelf empties</p></div>
            <Link className="link-btn" to="/admin/pharmacy">Open pharmacy</Link>
          </div>
          {lowStock.length === 0 ? <Empty icon="pill" title="Stock is healthy" message="No medicine is below its reorder level." /> : (
            <div className="tile-list">
              {lowStock.map((medicine) => (
                <div className={`tile ${medicine.stockQuantity === 0 ? 'tile--danger' : 'tile--warn'}`} key={medicine.id}>
                  <div className="tile__main">
                    <strong>{medicine.name}</strong>
                    <span>{medicine.stockQuantity} {medicine.unit} left · reorder at {medicine.reorderLevel}</span>
                  </div>
                  <Badge tone={medicine.stockQuantity === 0 ? 'danger' : 'warning'}>
                    {medicine.stockQuantity === 0 ? 'Out of stock' : 'Low'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Laboratory queue</h3><p className="muted">Orders waiting for collection or results</p></div>
            <Link className="link-btn" to="/admin/laboratory">Open lab</Link>
          </div>
          {pendingLabs.length === 0 ? <Empty icon="flask" title="Queue is clear" message="Every ordered test has a result." /> : (
            <div className="tile-list">
              {pendingLabs.map((order) => (
                <div className="tile" key={order.id}>
                  <div className="tile__main">
                    <strong>{order.test?.name}</strong>
                    <span>{order.patient?.user?.name} · ordered by {order.doctor?.user?.name}</span>
                  </div>
                  <Badge status={order.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>In-patients</h3><p className="muted">Currently admitted</p></div>
            <Link className="link-btn" to="/admin/wards">Open wards</Link>
          </div>
          {admissions.length === 0 ? <Empty icon="bed" title="No in-patients" message="Admissions will appear here." /> : (
            <div className="tile-list">
              {admissions.map((admission) => (
                <div className="tile" key={admission.id}>
                  <div className="tile__main">
                    <strong>{admission.patient?.user?.name}</strong>
                    <span>{admission.bed?.ward?.name} · {admission.bed?.code} · {admission.doctor?.user?.name}</span>
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>{date(admission.admittedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
