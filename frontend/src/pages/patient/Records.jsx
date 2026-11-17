import { useState } from 'react';
import { recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { Badge, Empty, ErrorState, Loader, PageHead, SearchBar } from '../../components/ui';
import { date, dateTime } from '../../utils/format';

export default function PatientRecords() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useApi(() => recordApi.list(), []);
  const records = data || [];
  const needle = search.trim().toLowerCase();
  const filtered = records.filter((record) => !needle
    || record.diagnosis?.toLowerCase().includes(needle)
    || record.doctor?.user?.name?.toLowerCase().includes(needle));

  return (
    <div className="page">
      <PageHead
        eyebrow="My health"
        title="Medical records"
        description="Diagnoses, vitals, clinical notes and prescriptions from your completed visits."
      />

      <div className="toolbar">
        <div className="inline-meta"><span>{records.length} summaries</span></div>
        <SearchBar value={search} onChange={setSearch} placeholder="Diagnosis or doctor" />
      </div>

      {loading ? <Loader label="Loading your records…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && filtered.length === 0 ? <Empty icon="file" title="No records yet" message="After a completed visit your doctor signs a summary and it appears here." /> : null}

      <div className="record-grid">
        {filtered.map((record) => (
          <article className="card record" key={record.id}>
            <div className="record__head">
              <div>
                <h4>{record.diagnosis}</h4>
                <span className="muted">{record.doctor?.user?.name} · {record.doctor?.department?.name} · {dateTime(record.createdAt)}</span>
              </div>
              <div className="row-gap">
                {record.followUpDate ? <Badge tone="info">Follow-up {date(record.followUpDate)}</Badge> : null}
                <Badge tone="success">Signed</Badge>
              </div>
            </div>

            {record.symptoms ? (
              <div>
                <h5>Symptoms</h5>
                <p className="record__notes">{record.symptoms}</p>
              </div>
            ) : null}

            <ul className="vitals">
              {record.bloodPressure ? <li><span>Blood pressure</span>{record.bloodPressure} mmHg</li> : null}
              {record.pulse ? <li><span>Pulse</span>{record.pulse} bpm</li> : null}
              {record.temperature ? <li><span>Temperature</span>{record.temperature} °C</li> : null}
              {record.spo2 ? <li><span>SpO₂</span>{record.spo2}%</li> : null}
              {record.weight ? <li><span>Weight</span>{record.weight} kg</li> : null}
              {record.height ? <li><span>Height</span>{record.height} cm</li> : null}
            </ul>

            {record.notes ? <p className="record__notes">{record.notes}</p> : null}

            {record.prescription ? (
              <div className="rx">
                <h5>Prescription</h5>
                <ul className="rx__list">
                  {(record.prescription.items || []).map((item) => (
                    <li key={item.medicineName}>
                      <strong>{item.medicineName}</strong> — {item.dosage} · {item.frequency} · {item.durationDays} days
                      {item.instructions ? <em> ({item.instructions})</em> : null}
                    </li>
                  ))}
                </ul>
                {record.prescription.advice ? <p className="muted">Advice: {record.prescription.advice}</p> : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
