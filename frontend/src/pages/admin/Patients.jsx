import { useState } from 'react';
import { patientApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Avatar, Badge, Empty, ErrorState, Icon, Loader, Modal, PageHead, SearchBar,
} from '../../components/ui';
import { age, date, dateTime } from '../../utils/format';

export default function AdminPatients() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, loading, error, refetch } = useApi(
    () => patientApi.list(query || undefined),
    [query]
  );
  const patients = data || [];

  const deactivate = async (patient) => {
    if (!window.confirm(`Deactivate ${patient.user?.name}'s patient account?`)) return;
    try {
      await patientApi.deactivate(patient.id);
      toast.success('Patient account deactivated');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Patient records"
        title="Patients"
        description="Everyone registered with the hospital, their blood group and clinical flags."
      />

      <div className="toolbar">
        <div className="inline-meta"><span>{patients.length} patients</span></div>
        <div className="toolbar__group">
          <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Name or email" />
          {query ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading patients…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && patients.length === 0 ? <Empty icon="users" title="No patients found" message="Patients appear here when they register." /> : null}

      {!loading && !error && patients.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Patient</th><th>Age / gender</th><th>Blood</th><th>Contact</th><th>Registered</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td data-label="Patient">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={patient.user?.name} />
                      <div>
                        <strong>{patient.user?.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{patient.allergies && patient.allergies !== 'None' ? `Allergy: ${patient.allergies}` : 'No known allergies'}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Age / gender">{patient.age ?? '—'} yrs · {patient.gender?.toLowerCase() || '—'}</td>
                  <td data-label="Blood"><Badge tone="muted">{patient.bloodGroup || '—'}</Badge></td>
                  <td data-label="Contact">
                    {patient.user?.phone || '—'}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{patient.user?.email}</span>
                  </td>
                  <td data-label="Registered">{date(patient.createdAt)}</td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--sm" onClick={() => setSelected(patient)}>View chart</button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => deactivate(patient)}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <PatientChart patient={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PatientChart({ patient, onClose }) {
  const records = useApi(() => recordApi.forPatient(patient.id), [patient?.id], { enabled: Boolean(patient) });
  return (
    <Modal
      open={Boolean(patient)}
      onClose={onClose}
      title={patient?.user?.name || 'Patient chart'}
      description={patient ? `${patient.user?.email} · ${patient.user?.phone || 'no phone'}` : ''}
      size="lg"
      footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      {patient ? (
        <>
          <div className="grid-3">
            <div className="detail"><span>Age</span><strong>{patient.age ?? '—'}</strong></div>
            <div className="detail"><span>Blood group</span><strong>{patient.bloodGroup || '—'}</strong></div>
            <div className="detail"><span>Gender</span><strong>{patient.gender?.toLowerCase() || '—'}</strong></div>
          </div>
          <div className="grid-2">
            <div className="detail"><span>Address</span><strong>{patient.address || '—'}</strong></div>
            <div className="detail"><span>Emergency contact</span><strong>{patient.emergencyContact || '—'}</strong></div>
            <div className="detail"><span>Allergies</span><strong>{patient.allergies || 'None recorded'}</strong></div>
            <div className="detail"><span>Insurance</span><strong>{patient.insuranceProvider ? `${patient.insuranceProvider} · ${patient.insuranceNumber || ''}` : 'Self pay'}</strong></div>
          </div>

          <h4 style={{ marginTop: 8 }}>Clinical history</h4>
          {records.loading ? <div className="loader-inline">Loading records…</div> : null}
          {!records.loading && (records.data || []).length === 0 ? <div className="empty-box">No clinical records yet.</div> : null}
          <div className="record-grid">
            {(records.data || []).map((record) => (
              <div className="card" key={record.id}>
                <div className="record__head">
                  <div>
                    <h4>{record.diagnosis}</h4>
                    <span className="muted">{dateTime(record.createdAt)} · {record.doctor?.user?.name}</span>
                  </div>
                </div>
                <p className="record__notes">{record.notes}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
