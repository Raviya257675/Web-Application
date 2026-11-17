import { useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import RecordModal from '../../components/RecordModal.jsx';
import {
  Badge, Empty, ErrorState, Icon, Loader, Modal, PageHead, SearchBar,
} from '../../components/ui';
import { date, dateTime } from '../../utils/format';

export default function DoctorRecords() {
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState(false);
  const [recordFor, setRecordFor] = useState(null);

  const { data, loading, error, refetch } = useApi(async () => {
    const [records, appointments] = await Promise.all([
      recordApi.list(),
      appointmentApi.list({ status: 'COMPLETED', limit: 300 }),
    ]);
    return { data: { records: records.data || [], appointments: appointments.data || [] } };
  }, []);

  const records = data?.records || [];
  const appointments = data?.appointments || [];
  const signed = new Set(records.map((record) => record.appointment?.id));
  const eligible = appointments.filter((appointment) => !signed.has(appointment.id));
  const needle = search.trim().toLowerCase();
  const filtered = records.filter((record) => !needle
    || record.diagnosis?.toLowerCase().includes(needle)
    || record.patient?.user?.name?.toLowerCase().includes(needle));

  return (
    <div className="page">
      <PageHead
        eyebrow="Clinical documentation"
        title="Medical records"
        description="Signed notes, vitals and prescriptions. A record can only be written for a completed visit of yours."
        actions={<button type="button" className="btn btn--primary" onClick={() => setPicker(true)}><Icon name="plus" size={15} /> New record</button>}
      />

      <div className="toolbar">
        <div className="inline-meta"><span>{records.length} records · {eligible.length} visits awaiting notes</span></div>
        <SearchBar value={search} onChange={setSearch} placeholder="Diagnosis or patient" />
      </div>

      {loading ? <Loader label="Loading clinical records…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <Empty icon="file" title="No records match" message={eligible.length ? 'Some completed visits still need notes.' : 'Records appear here after a completed visit.'} action={eligible.length ? <button type="button" className="btn btn--primary" onClick={() => setPicker(true)}>Write the first record</button> : null} />
      ) : null}

      <div className="record-grid">
        {filtered.map((record) => (
          <article className="card record" key={record.id}>
            <div className="record__head">
              <div>
                <h4>{record.diagnosis}</h4>
                <span className="muted">{record.patient?.user?.name} · {dateTime(record.createdAt)}</span>
              </div>
              <div className="row-gap">
                {record.prescription ? <Badge tone="info">Prescription</Badge> : null}
                <Link className="btn btn--sm" to={`/doctor/patients/${record.patient?.id}`}>Open chart</Link>
              </div>
            </div>
            {record.symptoms ? <p className="muted"><strong>Symptoms:</strong> {record.symptoms}</p> : null}
            <ul className="vitals">
              {record.bloodPressure ? <li><span>BP</span>{record.bloodPressure}</li> : null}
              {record.pulse ? <li><span>Pulse</span>{record.pulse} bpm</li> : null}
              {record.temperature ? <li><span>Temp</span>{record.temperature} °C</li> : null}
              {record.spo2 ? <li><span>SpO₂</span>{record.spo2}%</li> : null}
              {record.weight ? <li><span>Weight</span>{record.weight} kg</li> : null}
            </ul>
            {record.notes ? <p className="record__notes">{record.notes}</p> : null}
            {record.prescription ? (
              <div className="rx">
                <h5>Prescription</h5>
                <ul className="rx__list">
                  {(record.prescription.items || []).map((item) => (
                    <li key={item.medicineName}><strong>{item.medicineName}</strong> — {item.dosage} · {item.frequency} · {item.durationDays} days</li>
                  ))}
                </ul>
                {record.prescription.advice ? <p className="muted">Advice: {record.prescription.advice}</p> : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <Modal
        open={picker}
        onClose={() => setPicker(false)}
        title="Choose a completed visit"
        description="Records are unlocked only after the visit is marked complete."
        size="lg"
        footer={<button type="button" className="btn" onClick={() => setPicker(false)}>Cancel</button>}
      >
        {eligible.length === 0 ? <Empty icon="check" title="All visits documented" message="Every completed visit already has a record." /> : (
          <div className="tile-list">
            {eligible.map((appointment) => (
              <div className="tile" key={appointment.id}>
                <div className="tile__main">
                  <strong>{appointment.patient?.user?.name}</strong>
                  <span>{date(appointment.dateTime)} · {appointment.reason || 'Consultation'}</span>
                </div>
                <button type="button" className="btn btn--sm btn--primary" onClick={() => { setPicker(false); setRecordFor(appointment); }}>
                  Write record
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <RecordModal
        open={Boolean(recordFor)}
        appointment={recordFor}
        onClose={() => setRecordFor(null)}
        onSaved={() => { setRecordFor(null); refetch(); }}
      />
    </div>
  );
}
