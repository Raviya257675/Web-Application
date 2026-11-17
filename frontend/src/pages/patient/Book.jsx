import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi, departmentApi, doctorApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, PageHead,
} from '../../components/ui';
import { date, isoDate, money, time, weekday } from '../../utils/format';

export default function BookAppointment() {
  const toast = useToast();
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [dateValue, setDateValue] = useState(isoDate(new Date(Date.now() + 86_400_000)));
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [booked, setBooked] = useState(null);
  const [busy, setBusy] = useState(false);

  const departments = useApi(() => departmentApi.list(), []);
  const doctors = useApi(
    () => doctorApi.list(departmentId ? { departmentId } : undefined),
    [departmentId]
  );
  const availability = useApi(
    () => doctorApi.availability(doctorId, dateValue),
    [doctorId, dateValue],
    { enabled: Boolean(doctorId) }
  );

  const list = doctors.data || [];
  const doctor = useMemo(() => list.find((item) => String(item.id) === String(doctorId)), [list, doctorId]);

  const book = async () => {
    if (!slot) { toast.error('Pick a free slot first'); return; }
    setBusy(true);
    try {
      const result = await appointmentApi.book({
        doctorId: Number(doctorId),
        dateTime: slot,
        reason: reason || 'Consultation',
      });
      setBooked(result.data);
      toast.success('Appointment confirmed');
      availability.refetch();
    } catch (err) {
      toast.error(err.message);
      availability.refetch();
      setSlot('');
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <div className="page">
        <PageHead eyebrow="Booking confirmed" title="You're all set." description="Your appointment is reserved and the care team has been notified." />
        <div className="split">
          <section className="card card--wash">
            <div className="card__head">
              <div><h3>{booked.doctor?.user?.name}</h3><p className="muted">{booked.doctor?.department?.name}</p></div>
              <Badge status="booked" />
            </div>
            <div className="grid-2">
              <div className="detail"><span>Date</span><strong>{date(booked.dateTime)}</strong></div>
              <div className="detail"><span>Time</span><strong>{time(booked.dateTime)}</strong></div>
              <div className="detail"><span>Token</span><strong>#{booked.tokenNumber}</strong></div>
              <div className="detail"><span>Consultation fee</span><strong>{money(booked.fee)}</strong></div>
            </div>
            <p className="muted">{booked.reason}</p>
            <div className="row-gap">
              <Link className="btn btn--primary" to="/patient/appointments">View my appointments</Link>
              <button type="button" className="btn" onClick={() => { setBooked(null); setSlot(''); setReason(''); }}>Book another</button>
            </div>
          </section>
          <div className="notice notice--info">
            <Icon name="clock" size={17} />
            <div>
              <strong>Arrive 10 minutes early.</strong>
              Bring your ID and insurance card if applicable. You can cancel free of charge up to 2 hours before the appointment.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead
        eyebrow="New appointment"
        title="Book a consultation"
        description="Choose a speciality, a consultant and a slot that is genuinely free."
      />

      <div className="split">
        <div className="stack">
          <section className="card">
            <div className="card__head"><div><h3><span className="step-num">1</span> Choose a speciality</h3><p className="muted">Filter the consultants below</p></div></div>
            <div className="row-gap">
              <button type="button" className={`btn btn--sm ${departmentId === '' ? 'btn--primary' : ''}`} onClick={() => { setDepartmentId(''); setDoctorId(''); }}>
                All departments
              </button>
              {(departments.data || []).map((department) => (
                <button
                  key={department.id}
                  type="button"
                  className={`btn btn--sm ${String(departmentId) === String(department.id) ? 'btn--primary' : ''}`}
                  onClick={() => { setDepartmentId(department.id); setDoctorId(''); }}
                >
                  {department.name}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card__head"><div><h3><span className="step-num">2</span> Choose a consultant</h3><p className="muted">{list.length} available</p></div></div>
            {doctors.loading ? <div className="loader-inline">Loading consultants…</div> : null}
            {doctors.error ? <ErrorState error={doctors.error} onRetry={doctors.refetch} /> : null}
            {!doctors.loading && list.length === 0 ? <Empty icon="activity" title="No consultants" message="Try another department." /> : null}
            <div className="stack stack--tight">
              {list.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`doctor-choice ${String(doctorId) === String(item.id) ? 'is-selected' : ''}`}
                  onClick={() => { setDoctorId(item.id); setSlot(''); }}
                >
                  <span className="avatar">{item.user?.name?.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                  <span className="doctor-choice__body">
                    <strong>{item.user?.name}</strong>
                    <span>
                      {item.specialization}
                      {item.specialization === item.department?.name ? '' : ` · ${item.department?.name || ''}`}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right', flex: 'none' }}>
                    <strong style={{ fontSize: 13 }}>{money(item.consultationFee)}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{item.experienceYears ?? 0} yrs</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card__head"><div><h3><span className="step-num">3</span> Pick a date and slot</h3><p className="muted">Only free slots can be selected</p></div></div>
            <Field label="Date">
              <input type="date" min={isoDate(new Date())} value={dateValue} onChange={(e) => { setDateValue(e.target.value); setSlot(''); }} />
            </Field>
            {!doctorId ? <div className="lp-empty-state">Choose a consultant to see their live availability.</div> : null}
            {doctorId && availability.loading ? <div className="loader-inline">Checking the rota…</div> : null}
            {doctorId && availability.error ? <ErrorState error={availability.error} onRetry={availability.refetch} /> : null}
            {doctorId && availability.data ? (
              <>
                <div className="slotpicker__summary">
                  <span className="muted">{weekday(availability.data.date)} · {availability.data.slots?.length || 0} slots</span>
                  {availability.data.onLeave ? <Badge tone="danger">On leave</Badge> : null}
                </div>
                {(availability.data.slots || []).length === 0 ? (
                  <div className="lp-empty-state">No consulting hours on this day. Try another date.</div>
                ) : (
                  <div className="slotgrid">
                    {(availability.data.slots || []).map((item) => (
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
              </>
            ) : null}
          </section>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 76 }}>
          <section className="card card--wash">
            <div className="card__head"><div><h3>Booking summary</h3><p className="muted">Review before confirming</p></div></div>
            <div className="detail"><span>Consultant</span><strong>{doctor?.user?.name || 'Not selected'}</strong></div>
            <div className="detail"><span>Department</span><strong>{doctor?.department?.name || '—'}</strong></div>
            <div className="detail"><span>Date</span><strong>{slot ? date(slot) : dateValue ? date(dateValue) : '—'}</strong></div>
            <div className="detail"><span>Time</span><strong>{slot ? time(slot) : 'Choose a slot'}</strong></div>
            <div className="detail"><span>Fee</span><strong>{money(doctor?.consultationFee || 0)}</strong></div>
            <Field label="Reason for visit">
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms…" />
            </Field>
            <button type="button" className="btn btn--primary btn--block" onClick={book} disabled={busy || !slot}>
              {busy ? 'Confirming…' : 'Confirm appointment'}
            </button>
            <p className="muted" style={{ fontSize: 11 }}>Free cancellation up to 2 hours before. The API re-checks conflicts on confirmation.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
