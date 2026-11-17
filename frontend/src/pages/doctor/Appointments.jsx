import { useState } from 'react';
import { appointmentApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import RecordModal from '../../components/RecordModal.jsx';
import {
  Badge, Empty, ErrorState, Icon, Loader, PageHead, SearchBar, Tabs,
} from '../../components/ui';
import { date, time } from '../../utils/format';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

export default function DoctorAppointments() {
  const toast = useToast();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [recordFor, setRecordFor] = useState(null);

  const { data, loading, error, refetch } = useApi(async () => {
    const [appointments, records] = await Promise.all([
      appointmentApi.list({
        limit: 300,
        ...(status !== 'ALL' ? { status } : {}),
        ...(query ? { search: query } : {}),
      }),
      recordApi.list(),
    ]);
    return { data: { appointments: appointments.data || [], records: records.data || [] } };
  }, [status, query]);

  const appointments = data?.appointments || [];
  const withRecords = new Set((data?.records || []).map((record) => record.appointment?.id));

  const act = async (fn, message) => {
    try {
      await fn();
      toast.success(message);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const complete = (appointment) => {
    if (!window.confirm(`Complete ${appointment.patient?.user?.name}'s visit and generate the invoice?`)) return;
    act(() => appointmentApi.complete(appointment.id), 'Visit completed · invoice generated');
  };

  const noShow = (appointment) => {
    if (!window.confirm('Mark this appointment as a no-show?')) return;
    act(() => appointmentApi.noShow(appointment.id), 'Marked as no-show');
  };

  const cancel = (appointment) => {
    if (!window.confirm('Cancel this appointment?')) return;
    act(() => appointmentApi.cancel(appointment.id, 'Cancelled by the treating doctor'), 'Appointment cancelled');
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Clinic"
        title="Appointments"
        description="Your full appointment book. Completing a visit unlocks its clinical record and generates the invoice."
        actions={<button type="button" className="btn" onClick={refetch}><Icon name="activity" size={15} /> Refresh</button>}
      />

      <div className="toolbar">
        <Tabs tabs={TABS} value={status} onChange={setStatus} />
        <div className="toolbar__group">
          <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Patient or reason" />
          {query ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading your appointments…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && appointments.length === 0 ? <Empty icon="calendar" title="Nothing on the book" message="New bookings appear here automatically." /> : null}

      {!loading && !error && appointments.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Patient</th><th>Schedule</th><th>Token</th><th>Reason</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td data-label="Patient">
                    <strong>{appointment.patient?.user?.name}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{appointment.patient?.age ?? '—'} yrs · {appointment.patient?.bloodGroup || '—'}</span>
                  </td>
                  <td data-label="Schedule">
                    {date(appointment.dateTime)}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{time(appointment.dateTime)} · {appointment.durationMinutes} min</span>
                  </td>
                  <td data-label="Token">#{appointment.tokenNumber ?? '—'}</td>
                  <td data-label="Reason"><span className="muted" style={{ fontSize: 12 }}>{appointment.reason || '—'}</span></td>
                  <td data-label="Status"><Badge status={appointment.status.toLowerCase()} /></td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      {appointment.status === 'BOOKED' ? (
                        <>
                          <button type="button" className="btn btn--sm btn--success" onClick={() => complete(appointment)}>Complete</button>
                          <button type="button" className="btn btn--sm" onClick={() => noShow(appointment)}>No show</button>
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => cancel(appointment)}>Cancel</button>
                        </>
                      ) : null}
                      {appointment.status === 'COMPLETED' ? (
                        withRecords.has(appointment.id)
                          ? <span className="muted" style={{ fontSize: 11 }}>Record signed</span>
                          : <button type="button" className="btn btn--sm btn--primary" onClick={() => setRecordFor(appointment)}>Write record</button>
                      ) : null}
                      {appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW' ? <span className="muted" style={{ fontSize: 11 }}>Closed</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
