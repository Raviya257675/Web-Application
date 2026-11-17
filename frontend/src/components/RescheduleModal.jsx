import { useEffect, useState } from 'react';
import { appointmentApi, doctorApi } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Icon, Modal } from './ui';
import { date, time } from '../utils/format';

/**
 * Shared reschedule dialog. Runs the same availability + conflict checks as
 * booking, so it can only offer genuinely free slots.
 */
export default function RescheduleModal({ appointment, onClose, onSaved }) {
  const toast = useToast();
  const [dateValue, setDateValue] = useState('');
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    const d = new Date(appointment.dateTime);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDateValue(`${y}-${m}-${day}`);
    setSlot('');
  }, [appointment]);

  const availability = useApi(
    () => doctorApi.availability(appointment.doctor.id, dateValue),
    [appointment?.id, dateValue],
    { enabled: Boolean(appointment) && Boolean(dateValue) }
  );

  const close = () => { setSlot(''); onClose(); };

  const submit = async () => {
    if (!slot) { toast.error('Choose a free slot first'); return; }
    setBusy(true);
    try {
      await appointmentApi.reschedule(appointment.id, {
        dateTime: slot,
        durationMinutes: appointment.durationMinutes || 30,
      });
      toast.success('Appointment moved to the new slot');
      setSlot('');
      onSaved();
    } catch (err) {
      toast.error(err.message);
      availability.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={close}
      title="Reschedule appointment"
      description={appointment ? `${appointment.patient?.user?.name} · currently ${date(appointment.dateTime)} at ${time(appointment.dateTime)}` : ''}
      footer={(
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy || !slot}>
            {busy ? 'Moving…' : 'Move appointment'}
          </button>
        </>
      )}
    >
      <Field label="New date">
        <input type="date" value={dateValue} onChange={(e) => { setDateValue(e.target.value); setSlot(''); }} />
      </Field>
      <Field label="Available slots" hint={`${appointment?.doctor?.user?.name || ''} · ${appointment?.doctor?.department?.name || ''}`}>
        {availability.loading ? <div className="loader-inline">Checking the rota…</div> : null}
        {!availability.loading && (availability.data?.slots || []).length === 0 ? (
          <div className="lp-empty-state">No consulting hours on this date. Try another day.</div>
        ) : (
          <div className="slotgrid">
            {(availability.data?.slots || []).map((item) => {
              const isCurrent = appointment
                && item.dateTime?.slice(0, 16) === appointment.dateTime?.slice(0, 16);
              return (
                <button
                  type="button"
                  key={item.dateTime}
                  className={`slot ${slot === item.dateTime ? 'slot--selected' : ''} ${item.available || isCurrent ? '' : 'slot--disabled'}`}
                  disabled={!item.available && !isCurrent}
                  onClick={() => setSlot(item.dateTime)}
                  title={isCurrent ? 'Current slot' : item.reason || 'Available'}
                >
                  {item.label}
                  {isCurrent ? <span className="slot__tag">current</span> : !item.available ? <span className="slot__tag">{item.reason}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </Field>
      <p className="muted" style={{ fontSize: 12 }}>
        <Icon name="clock" size={13} /> The API re-checks doctor availability, leave, double-booking and the
        patient's own calendar before accepting the move.
      </p>
    </Modal>
  );
}
