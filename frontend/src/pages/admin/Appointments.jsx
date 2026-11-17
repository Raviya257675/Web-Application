import { useState } from 'react';
import { appointmentApi, doctorApi, patientApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import RescheduleModal from '../../components/RescheduleModal.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, PageHead, SearchBar, Tabs,
} from '../../components/ui';
import { date, time, todayIso } from '../../utils/format';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

export default function AdminAppointments() {
  const toast = useToast();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [upcoming, setUpcoming] = useState(false);
  const [booking, setBooking] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [sort, setSort] = useState('date_desc');
  const [detailFor, setDetailFor] = useState(null);
  const [rescheduleFor, setRescheduleFor] = useState(null);

  const params = {
    limit: 300,
    ...(status !== 'ALL' ? { status } : {}),
    ...(query ? { search: query } : {}),
    ...(upcoming ? { upcoming: true } : {}),
  };
  const { data, loading, error, refetch } = useApi(() => appointmentApi.list(params), [status, query, upcoming]);
  const appointments = data || [];

  const sorted = [...appointments].sort((a, b) => {
    if (sort === 'date_asc') return new Date(a.dateTime) - new Date(b.dateTime);
    if (sort === 'patient') return (a.patient?.user?.name || '').localeCompare(b.patient?.user?.name || '');
    if (sort === 'status') return a.status.localeCompare(b.status);
    return new Date(b.dateTime) - new Date(a.dateTime);
  });

  const act = async (id, fn, message) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(message);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (appointment) => {
    if (!window.confirm(`Cancel ${appointment.patient?.user?.name}'s appointment with ${appointment.doctor?.user?.name}?`)) return;
    act(appointment.id, () => appointmentApi.cancel(appointment.id, 'Cancelled by administration'), 'Appointment cancelled');
  };

  const complete = (appointment) => {
    if (!window.confirm('Mark this visit complete? An invoice will be generated automatically.')) return;
    act(appointment.id, () => appointmentApi.complete(appointment.id), 'Visit completed and invoice generated');
  };

  const removeAppointment = (appointment) => {
    if (!window.confirm(`Delete this ${appointment.status.toLowerCase().replace('_', ' ')} appointment for ${appointment.patient?.user?.name}? This cannot be undone.`)) return;
    act(appointment.id, () => appointmentApi.remove(appointment.id), 'Appointment deleted');
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Clinic operations"
        title="Appointments"
        description="Every booking across the hospital, with token numbers and conflict-checked slots."
        actions={<button type="button" className="btn btn--primary" onClick={() => setBooking(true)}><Icon name="plus" size={15} /> New appointment</button>}
      />

      <div className="toolbar">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
        <div className="toolbar__group">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSubmit={() => setQuery(search.trim())}
            placeholder="Patient, doctor or reason"
          />
          <label className="check">
            <input type="checkbox" checked={upcoming} onChange={(e) => setUpcoming(e.target.checked)} />
            <span>Upcoming only</span>
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 170 }} aria-label="Sort appointments">
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="patient">Patient A–Z</option>
            <option value="status">Status</option>
          </select>
          {query ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading appointments…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}

      {!loading && !error && appointments.length === 0 ? (
        <Empty icon="calendar" title="No appointments match" message="Try another status or clear the search." action={<button type="button" className="btn btn--primary" onClick={() => setBooking(true)}>Book an appointment</button>} />
      ) : null}

      {!loading && !error && appointments.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Consultant</th>
                <th>Schedule</th>
                <th>Token</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((appointment) => (
                <tr key={appointment.id}>
                  <td data-label="Patient">
                    <strong>{appointment.patient?.user?.name}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{appointment.reason || 'No reason recorded'}</span>
                  </td>
                  <td data-label="Consultant">
                    {appointment.doctor?.user?.name}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{appointment.doctor?.department?.name}</span>
                  </td>
                  <td data-label="Schedule">
                    {date(appointment.dateTime)}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{time(appointment.dateTime)} · {appointment.durationMinutes} min</span>
                  </td>
                  <td data-label="Token">#{appointment.tokenNumber ?? '—'}</td>
                  <td data-label="Status"><Badge status={appointment.status.toLowerCase()} /></td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--sm" onClick={() => setDetailFor(appointment)}>View</button>
                      {appointment.status === 'BOOKED' ? (
                        <>
                          <button type="button" className="btn btn--sm btn--success" disabled={busyId === appointment.id} onClick={() => complete(appointment)}>Complete</button>
                          <button type="button" className="btn btn--sm" disabled={busyId === appointment.id} onClick={() => setRescheduleFor(appointment)}>Move</button>
                          <button type="button" className="btn btn--sm btn--danger" disabled={busyId === appointment.id} onClick={() => cancel(appointment)}>Cancel</button>
                        </>
                      ) : null}
                      {appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW' ? (
                        <button type="button" className="btn btn--sm btn--danger" disabled={busyId === appointment.id} onClick={() => removeAppointment(appointment)}>Delete</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={Boolean(detailFor)}
        onClose={() => setDetailFor(null)}
        title="Appointment details"
        description={detailFor ? `Appointment #${detailFor.id}` : ''}
        size="lg"
        footer={(
          <>
            {detailFor?.status === 'BOOKED' ? (
              <button type="button" className="btn" onClick={() => { setRescheduleFor(detailFor); setDetailFor(null); }}>Reschedule</button>
            ) : null}
            <button type="button" className="btn btn--primary" onClick={() => setDetailFor(null)}>Close</button>
          </>
        )}
      >
        {detailFor ? (
          <>
            <div className="grid-2">
              <div className="detail"><span>Patient</span><strong>{detailFor.patient?.user?.name}</strong></div>
              <div className="detail"><span>Contact</span><strong>{detailFor.patient?.user?.phone || detailFor.patient?.user?.email}</strong></div>
              <div className="detail"><span>Consultant</span><strong>{detailFor.doctor?.user?.name}</strong></div>
              <div className="detail"><span>Department</span><strong>{detailFor.doctor?.department?.name}</strong></div>
              <div className="detail"><span>Date</span><strong>{date(detailFor.dateTime)}</strong></div>
              <div className="detail"><span>Time</span><strong>{time(detailFor.dateTime)} · {detailFor.durationMinutes} min</strong></div>
              <div className="detail"><span>Token</span><strong>#{detailFor.tokenNumber ?? '—'}</strong></div>
              <div className="detail"><span>Fee</span><strong>Rs. {Number(detailFor.fee || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></div>
              <div className="detail"><span>Status</span><strong><Badge status={detailFor.status.toLowerCase()} /></strong></div>
              <div className="detail"><span>Booked on</span><strong>{date(detailFor.createdAt)}</strong></div>
            </div>
            <div className="detail"><span>Reason</span><strong>{detailFor.reason || '—'}</strong></div>
            <div className="detail"><span>Notes</span><strong>{detailFor.notes || '—'}</strong></div>
          </>
        ) : null}
      </Modal>

      <RescheduleModal
        appointment={rescheduleFor}
        onClose={() => setRescheduleFor(null)}
        onSaved={() => { setRescheduleFor(null); refetch(); }}
      />

      <BookModal open={booking} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); refetch(); }} />
    </div>
  );
}

function BookModal({ open, onClose, onBooked }) {
  const toast = useToast();
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: todayIso(), reason: '' });
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);

  const patients = useApi(() => patientApi.list(), [open], { enabled: open });
  const doctors = useApi(() => doctorApi.list(), [open], { enabled: open });
  const availability = useApi(
    () => doctorApi.availability(form.doctorId, form.date),
    [form.doctorId, form.date, open],
    { enabled: open && Boolean(form.doctorId) && Boolean(form.date) }
  );

  const close = () => {
    setForm({ patientId: '', doctorId: '', date: todayIso(), reason: '' });
    setSlot('');
    onClose();
  };

  const submit = async () => {
    if (!form.patientId || !form.doctorId || !slot) {
      toast.error('Choose a patient, a consultant and a free slot.');
      return;
    }
    setBusy(true);
    try {
      await appointmentApi.book({
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        dateTime: slot,
        reason: form.reason || 'Booked by administration',
      });
      toast.success('Appointment booked');
      setForm({ patientId: '', doctorId: '', date: todayIso(), reason: '' });
      setSlot('');
      onBooked();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New appointment"
      description="Admin booking uses the same conflict detection as the patient portal."
      size="lg"
      footer={(
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>{busy ? 'Booking…' : 'Book appointment'}</button>
        </>
      )}
    >
      <div className="grid-2">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Choose a patient</option>
            {(patients.data || []).map((patient) => (
              <option key={patient.id} value={patient.id}>{patient.user?.name} · {patient.user?.email}</option>
            ))}
          </select>
        </Field>
        <Field label="Consultant">
          <select value={form.doctorId} onChange={(e) => { setForm({ ...form, doctorId: e.target.value }); setSlot(''); }}>
            <option value="">Choose a consultant</option>
            {(doctors.data || []).map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.user?.name} · {doctor.department?.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" min={todayIso()} value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setSlot(''); }} />
        </Field>
        <Field label="Reason">
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Follow-up consultation" />
        </Field>
      </div>

      <Field label="Available slots" hint="Slots already booked, in the past, or outside the rota cannot be selected.">
        {!form.doctorId ? (
          <div className="lp-empty-state">Choose a consultant to see their live availability.</div>
        ) : availability.loading ? (
          <div className="loader-inline">Checking the rota…</div>
        ) : (availability.data?.slots || []).length === 0 ? (
          <div className="lp-empty-state">No consulting hours on this date. Try another day.</div>
        ) : (
          <div className="slotgrid">
            {(availability.data?.slots || []).map((item) => (
              <button
                type="button"
                key={item.dateTime}
                className={`slot ${slot === item.dateTime ? 'slot--selected' : ''} ${item.available ? '' : 'slot--disabled'}`}
                disabled={!item.available}
                onClick={() => setSlot(item.dateTime)}
                title={item.reason || 'Available'}
              >
                {item.label}
                {!item.available ? <span className="slot__tag">{item.reason}</span> : null}
              </button>
            ))}
          </div>
        )}
      </Field>
    </Modal>
  );
}
