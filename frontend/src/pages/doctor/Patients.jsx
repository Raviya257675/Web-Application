import { useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { Avatar, Badge, Empty, ErrorState, Loader, PageHead, SearchBar } from '../../components/ui';
import { date } from '../../utils/format';

export default function DoctorPatients() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, error, refetch } = useApi(() => patientApi.list(query || undefined), [query]);
  const patients = data || [];

  return (
    <div className="page">
      <PageHead
        eyebrow="Caseload"
        title="My patients"
        description="Only patients you have an appointment with are visible — a treatment relationship is required by the API."
      />

      <div className="toolbar">
        <div className="inline-meta"><span>{patients.length} patients under your care</span></div>
        <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Name or email" />
      </div>

      {loading ? <Loader label="Loading your patients…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && patients.length === 0 ? <Empty icon="users" title="No patients yet" message="Patients appear here after their first appointment with you." /> : null}

      <div className="split split--even">
        {patients.map((patient) => (
          <article className="card" key={patient.id}>
            <div className="card__head">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={patient.user?.name} />
                <div>
                  <h3>{patient.user?.name}</h3>
                  <p className="muted">{patient.age ?? '—'} yrs · {patient.gender?.toLowerCase() || '—'} · {patient.bloodGroup || '—'}</p>
                </div>
              </div>
              <Badge tone={patient.allergies && patient.allergies !== 'None' ? 'danger' : 'muted'}>
                {patient.allergies && patient.allergies !== 'None' ? 'Allergy' : 'No allergy'}
              </Badge>
            </div>
            <div className="grid-2">
              <div className="detail"><span>Email</span><strong>{patient.user?.email}</strong></div>
              <div className="detail"><span>Phone</span><strong>{patient.user?.phone || '—'}</strong></div>
              <div className="detail"><span>Last registered</span><strong>{date(patient.createdAt)}</strong></div>
              <div className="detail"><span>Allergies</span><strong>{patient.allergies || 'None recorded'}</strong></div>
            </div>
            <div className="row-end">
              <span className="muted" style={{ fontSize: 12 }}>Ownership is enforced on every chart request.</span>
              <Link className="btn btn--sm btn--primary" to={`/doctor/patients/${patient.id}`}>Open chart</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
