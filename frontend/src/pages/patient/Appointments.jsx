import { useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import RescheduleModal from '../../components/RescheduleModal.jsx';
import {
  Badge, Empty, ErrorState, Icon, Loader, PageHead, Tabs,
} from '../../components/ui';
import { date, dateTime, relative, time } from '../../utils/format';

const TABS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PAST', label: 'Past' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PatientAppointments() {
  const toast = useToast();
  const [tab, setTab] = useState('UPCOMING');
  const [rescheduleFor, setRescheduleFor] = useState(null);

  const { data, loading, error, refetch } = useApi(async () => {
    const [appointments, records] = await Promise.all([appointmentApi.me({ limit: 200 }), recordApi.list()]);
    return { data: { appointments: appointments.data || [], records: records.data || [] } };
  }, []);

  const appointments = data?.appointments || [];
  const records = data?.records || [];
  const recordByAppointment = Object.fromEntries(records.map((record) => [record.appointment?.id, record]));

  const filtered = appointments.filter((appointment) => {
    if (tab === 'UPCOMING') return appointment.status === 'BOOKED' && new Date(appointment.dateTime) >= new Date();
    if (tab === 'CANCELLED') return appointment.status === 'CANCELLED';
    return appointment.status === 'COMPLETED' || appointment.status === 'NO_SHOW' || new Date(appointment.dateTime) < new Date();
  });

  const cancel = async (appointment) => {
    if (!window.confirm(`Cancel your appointment with ${appointment.doctor?.user?.name} on ${date(appointment.dateTime)}?`)) return;
    try {
      await appointmentApi.cancel(appointment.id, 'Cancelled by patient');
      toast.success('Appointment cancelled');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="My care"
        title="Appointments"
        description="Upcoming visits, past consultations and their documents."
        actions={<Link className="btn btn--primary" to="/patient/book"><Icon name="plus" size={15} /> Book a visit</Link>}
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {loading ? <Loader label="Loading your appointments…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <Empty icon="calendar" title={`No ${tab.toLowerCase()} appointments`} message={tab === 'UPCOMING' ? 'Book a consultation to see it here.' : 'Nothing in this list yet.'} action={tab === 'UPCOMING' ? <Link className="btn btn--primary" to="/patient/book">Book a visit</Link> : null} />
      ) : null}

      <div className="stack">
        {filtered.map((appointment) => {
          const record = recordByAppointment[appointment.id];
          return (
            <article className={`card appt appt--${appointment.status.toLowerCase()}`} key={appointment.id}>
              <div className="appt__when">
                <span className="appt__day">{relative(appointment.dateTime)}</span>
                <strong>{time(appointment.dateTime)}</strong>
                <span className="muted" style={{ fontSize: 11 }}>{date(appointment.dateTime)}</span>
              </div>
              <div className="appt__who">
                <h4>{appointment.doctor?.user?.name}</h4>
                <span className="appt__reason">{appointment.doctor?.specialization} · {appointment.doctor?.department?.name}</span>
                <div className="inline-meta">
                  <span>Token #{appointment.tokenNumber ?? '—'}</span>
                  <span className="dot-sep">{appointment.reason || 'Consultation'}</span>
                </div>
              </div>
              <div className="appt__side">
                <Badge status={appointment.status.toLowerCase()} />
                <div className="appt__actions">
                  {appointment.status === 'BOOKED' ? (
                    <>
                      <button type="button" className="btn btn--sm" onClick={() => setRescheduleFor(appointment)}>Reschedule</button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => cancel(appointment)}>Cancel</button>
                    </>
                  ) : null}
                  {record ? <Link className="btn btn--sm btn--primary" to="/patient/records">Read summary</Link> : null}
                  {appointment.status === 'COMPLETED' && !record ? <span className="muted" style={{ fontSize: 11 }}>Summary pending</span> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <RescheduleModal
        appointment={rescheduleFor}
        onClose={() => setRescheduleFor(null)}
        onSaved={() => { setRescheduleFor(null); refetch(); }}
      />
    </div>
  );
}
