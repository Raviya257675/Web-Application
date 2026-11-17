import { useEffect, useState } from 'react';
import { doctorApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, PageHead,
} from '../../components/ui';
import { date, isoDate, todayIso } from '../../utils/format';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorAvailability() {
  const toast = useToast();
  const me = useApi(() => doctorApi.me(), []);
  const leaves = useApi(() => doctorApi.leaves(me.data?.id), [me.data?.id], { enabled: Boolean(me.data?.id) });
  const [windows, setWindows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [previewDate, setPreviewDate] = useState(isoDate(new Date(Date.now() + 86400000)));
  const [leaveForm, setLeaveForm] = useState({ startDate: todayIso(), endDate: todayIso(), reason: '' });

  const preview = useApi(
    () => doctorApi.availability(me.data.id, previewDate),
    [me.data?.id, previewDate],
    { enabled: Boolean(me.data?.id) }
  );

  useEffect(() => {
    if (!me.data?.availableSlots) return;
    setWindows(me.data.availableSlots.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime?.slice(0, 5) || '09:00',
      endTime: slot.endTime?.slice(0, 5) || '13:00',
      slotMinutes: slot.slotMinutes || 30,
    })));
  }, [me.data]);

  const addWindow = () => setWindows([...windows, { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 30 }]);
  const updateWindow = (index, key, value) => {
    setWindows((current) => current.map((window, i) => (i === index ? { ...window, [key]: value } : window)));
  };
  const removeWindow = (index) => setWindows(windows.filter((_, i) => i !== index));

  const save = async () => {
    for (const window of windows) {
      if (window.startTime >= window.endTime) {
        toast.error('Every window must start before it ends.');
        return;
      }
    }
    setBusy(true);
    try {
      await doctorApi.setAvailability(me.data.id, windows.map((window) => ({
        dayOfWeek: Number(window.dayOfWeek),
        startTime: window.startTime,
        endTime: window.endTime,
        slotMinutes: Number(window.slotMinutes),
      })));
      toast.success('Consulting hours updated');
      me.refetch();
      preview.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestLeave = async () => {
    if (!leaveForm.reason.trim()) { toast.error('Give a reason for the leave request'); return; }
    setBusy(true);
    try {
      await doctorApi.requestLeave(me.data.id, leaveForm);
      toast.success('Leave request submitted for approval');
      setLeaveForm({ startDate: todayIso(), endDate: todayIso(), reason: '' });
      leaves.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (me.loading) return <Loader label="Loading your availability…" />;
  if (me.error) return <ErrorState error={me.error} onRetry={me.refetch} />;

  return (
    <div className="page">
      <PageHead
        eyebrow="Rota"
        title="Availability & leave"
        description="Your weekly consulting template drives the slots patients can book. Leave blocks those dates."
        actions={<button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save consulting hours'}</button>}
      />

      <div className="split">
        <section className="card">
          <div className="card__head">
            <div><h3>Weekly consulting windows</h3><p className="muted">Slots are generated from these windows at the chosen interval.</p></div>
            <button type="button" className="btn btn--sm" onClick={addWindow}><Icon name="plus" size={13} /> Add window</button>
          </div>
          {windows.length === 0 ? <Empty icon="clock" title="No consulting hours" message="Add at least one window so patients can book you." /> : null}
          <div className="stack stack--tight">
            {windows.map((window, index) => (
              <div className="rxform__row" key={index}>
                <select value={window.dayOfWeek} onChange={(e) => updateWindow(index, 'dayOfWeek', e.target.value)} style={{ flex: '1 1 130px' }}>
                  {DAYS.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
                </select>
                <input type="time" value={window.startTime} onChange={(e) => updateWindow(index, 'startTime', e.target.value)} style={{ maxWidth: 120 }} />
                <span className="muted">to</span>
                <input type="time" value={window.endTime} onChange={(e) => updateWindow(index, 'endTime', e.target.value)} style={{ maxWidth: 120 }} />
                <select value={window.slotMinutes} onChange={(e) => updateWindow(index, 'slotMinutes', e.target.value)} style={{ maxWidth: 110 }}>
                  {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                </select>
                <button type="button" className="icon-btn" onClick={() => removeWindow(index)} aria-label="Remove window">×</button>
              </div>
            ))}
          </div>
          <div className="row-end">
            <span className="muted" style={{ fontSize: 12 }}>Windows must start on the hour or half hour.</span>
            <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={busy}>Save hours</button>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div><h3>Slot preview</h3><p className="muted">Exactly what patients see</p></div>
          </div>
          <Field label="Date">
            <input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} />
          </Field>
          {preview.loading ? <div className="loader-inline">Generating slots…</div> : null}
          {preview.data ? (
            <>
              <div className="inline-meta" style={{ justifyContent: 'space-between' }}>
                <span>{preview.data.dayOfWeek}</span>
                <span>{preview.data.slots?.length || 0} slots</span>
              </div>
              {preview.data.onLeave ? <div className="notice notice--warning"><Icon name="alert" size={16} /><div>You are on approved leave that day.</div></div> : null}
              {(preview.data.slots || []).length === 0 ? <div className="lp-empty-state">No consulting hours on this weekday.</div> : (
                <div className="slotgrid">
                  {(preview.data.slots || []).map((slot) => (
                    <div key={slot.dateTime} className={`slot ${slot.available ? '' : 'slot--disabled'}`} style={{ cursor: 'default' }}>
                      {slot.label}
                      {!slot.available ? <span className="slot__tag">{slot.reason}</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>

      <div className="split split--even">
        <section className="card">
          <div className="card__head"><div><h3>Request leave</h3><p className="muted">Admin approval is required before bookings are blocked.</p></div></div>
          <div className="grid-2">
            <Field label="From"><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field>
            <Field label="To"><input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></Field>
          </div>
          <Field label="Reason"><input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Conference, annual leave…" /></Field>
          <button type="button" className="btn btn--primary" onClick={requestLeave} disabled={busy}>Submit request</button>
        </section>

        <section className="card">
          <div className="card__head"><div><h3>My leave</h3><p className="muted">Approved leave blocks new bookings</p></div></div>
          {leaves.loading ? <div className="loader-inline">Loading leave…</div> : null}
          {!leaves.loading && (leaves.data || []).length === 0 ? <Empty icon="clock" title="No leave recorded" message="Submit a request when you need time away." /> : (
            <div className="tile-list">
              {(leaves.data || []).map((leave) => (
                <div className="tile" key={leave.id}>
                  <div className="tile__main">
                    <strong>{date(leave.startDate)} → {date(leave.endDate)}</strong>
                    <span>{leave.reason}</span>
                  </div>
                  <Badge status={leave.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
