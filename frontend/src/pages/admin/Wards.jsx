import { useState } from 'react';
import { doctorApi, patientApi, wardApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, Progress, Stat, Tabs,
} from '../../components/ui';
import { date, dateTime, money, todayIso } from '../../utils/format';

const TABS = [
  { value: 'wards', label: 'Wards & beds' },
  { value: 'admissions', label: 'Admissions' },
];

const ADMISSION_TABS = [
  { value: 'ADMITTED', label: 'In-patients' },
  { value: 'DISCHARGED', label: 'Discharged' },
  { value: '', label: 'All' },
];

const BLANK_WARD = { name: '', type: 'General', floor: '', description: '', active: true };
const BLANK_BED = { code: '', dailyCharge: '9500' };

export default function AdminWards() {
  const toast = useToast();
  const [tab, setTab] = useState('wards');
  const [admissionStatus, setAdmissionStatus] = useState('ADMITTED');
  const [selectedWard, setSelectedWard] = useState(null);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitBed, setAdmitBed] = useState(null);
  const [admitForm, setAdmitForm] = useState({ patientId: '', doctorId: '', bedId: '', diagnosis: '', notes: '' });
  const [dischargeFor, setDischargeFor] = useState(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [bedAction, setBedAction] = useState(null);
  const [wardModal, setWardModal] = useState(null);
  const [wardForm, setWardForm] = useState(BLANK_WARD);
  const [bedModal, setBedModal] = useState(null);
  const [bedForm, setBedForm] = useState(BLANK_BED);
  const [busy, setBusy] = useState(false);

  const occupancy = useApi(() => wardApi.occupancy(), []);
  const admissions = useApi(() => wardApi.admissions(admissionStatus || undefined), [admissionStatus]);
  const beds = useApi(() => wardApi.beds(selectedWard.id), [selectedWard?.id], { enabled: Boolean(selectedWard) });
  const availableBeds = useApi(() => wardApi.availableBeds(), [admitOpen], { enabled: admitOpen });
  const patients = useApi(() => patientApi.list(), [admitOpen], { enabled: admitOpen });
  const doctors = useApi(() => doctorApi.list(), [admitOpen], { enabled: admitOpen });

  const wards = occupancy.data?.wards || [];
  const currentWard = wards.find((ward) => ward.id === selectedWard?.id) || selectedWard;

  const openWard = (ward) => {
    setSelectedWard(ward);
    setTab('wards');
  };

  const openAdmit = (bed = null) => {
    setAdmitBed(bed);
    setAdmitForm({
      patientId: '', doctorId: '', bedId: bed ? String(bed.id) : '',
      diagnosis: '', notes: '',
    });
    setBedAction(null);
    setAdmitOpen(true);
  };

  const submitAdmit = async () => {
    if (!admitForm.patientId || !admitForm.doctorId || !admitForm.bedId) {
      toast.error('Patient, doctor and bed are required');
      return;
    }
    setBusy(true);
    try {
      await wardApi.admit({
        patientId: Number(admitForm.patientId),
        doctorId: Number(admitForm.doctorId),
        bedId: Number(admitForm.bedId),
        diagnosis: admitForm.diagnosis || 'Observation',
        notes: admitForm.notes,
      });
      toast.success('Patient admitted');
      setAdmitOpen(false);
      occupancy.refetch();
      admissions.refetch();
      beds.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitDischarge = async () => {
    setBusy(true);
    try {
      const result = await wardApi.discharge(dischargeFor.id, dischargeNotes);
      toast.success(`Discharged · ${result.data?.nights} night(s) · invoice ${result.data?.invoice?.invoiceNumber}`);
      setDischargeFor(null);
      setDischargeNotes('');
      occupancy.refetch();
      admissions.refetch();
      beds.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveBedStatus = async (status) => {
    try {
      await wardApi.setBedStatus(bedAction.id, status);
      toast.success('Bed status updated');
      setBedAction(null);
      occupancy.refetch();
      beds.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveWard = async () => {
    setBusy(true);
    try {
      const body = { ...wardForm };
      if (wardModal.id === 'new') await wardApi.createWard(body);
      else await wardApi.updateWard(wardModal.id, body);
      toast.success('Ward saved');
      setWardModal(null);
      occupancy.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveBed = async () => {
    setBusy(true);
    try {
      const body = { code: bedForm.code, dailyCharge: Number(bedForm.dailyCharge || 0) };
      if (bedModal.id === 'new') await wardApi.addBed(selectedWard.id, body);
      else await wardApi.updateBed(bedModal.id, body);
      toast.success('Bed saved');
      setBedModal(null);
      beds.refetch();
      occupancy.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const o = occupancy.data || {};
  const activeAdmissions = (admissions.data || []).filter((a) => a.status === 'ADMITTED');

  return (
    <div className="page">
      <PageHead
        eyebrow="In-patient care"
        title="Wards, beds & admissions"
        description="Live occupancy, admissions, discharge summaries and the final room invoice."
        actions={(
          <>
            <button type="button" className="btn" onClick={() => { setWardModal({ id: 'new' }); setWardForm(BLANK_WARD); }}><Icon name="plus" size={15} /> Ward</button>
            <button type="button" className="btn btn--primary" onClick={() => openAdmit()}><Icon name="bed" size={15} /> Admit patient</button>
          </>
        )}
      />

      <div className="stat-row">
        <Stat label="Beds" value={o.totalBeds ?? '—'} hint={`${o.maintenanceBeds ?? 0} under maintenance`} icon="bed" />
        <Stat label="Occupied" value={o.occupiedBeds ?? 0} hint={`${o.occupancyRate ?? 0}% occupancy`} icon="activity" tone="info" />
        <Stat label="Available" value={o.availableBeds ?? 0} hint="Ready for admission" icon="check" tone="success" />
        <Stat label="In-patients" value={o.activeAdmissions ?? 0} hint="Currently admitted" icon="users" tone={o.activeAdmissions > 0 ? 'warning' : 'success'} />
      </div>

      <div className="toolbar">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'admissions' ? <Tabs tabs={ADMISSION_TABS} value={admissionStatus} onChange={setAdmissionStatus} /> : null}
      </div>

      {tab === 'wards' ? (
        <>
          {occupancy.loading ? <Loader label="Loading wards…" /> : null}
          {occupancy.error ? <ErrorState error={occupancy.error} onRetry={occupancy.refetch} /> : null}
          {!occupancy.loading && !occupancy.error ? (
            <div className="ward-list">
              {wards.map((ward) => {
                const rate = ward.totalBeds ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0;
                return (
                  <article
                    className={`card ward-card ${selectedWard?.id === ward.id ? 'card--wash' : ''}`}
                    key={ward.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openWard(ward)}
                  >
                    <div className="card__head">
                      <div><h3>{ward.name}</h3><p className="muted">{ward.type} · {ward.floor}</p></div>
                      <Badge tone={rate > 80 ? 'danger' : rate > 50 ? 'warning' : 'success'}>{rate}% full</Badge>
                    </div>
                    <div className="ward-card__figures">
                      <strong>{ward.occupiedBeds}</strong><span>of {ward.totalBeds} beds occupied</span>
                    </div>
                    <Progress value={ward.occupiedBeds} max={ward.totalBeds || 1} tone={rate > 80 ? 'danger' : rate > 50 ? 'warning' : 'success'} />
                    <div className="inline-meta" style={{ justifyContent: 'space-between' }}>
                      <span>{ward.totalBeds - ward.occupiedBeds} available</span>
                      <span>Select ward →</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {selectedWard ? (
            <section className="card">
              <div className="card__head">
                <div>
                  <h3>{currentWard?.name} · beds</h3>
                  <p className="muted">Click a bed to admit, change status or edit its charge.</p>
                </div>
                <div className="row-gap">
                  <button type="button" className="btn btn--sm" onClick={() => { setBedModal({ id: 'new' }); setBedForm(BLANK_BED); }}>Add bed</button>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => setSelectedWard(null)}>Close</button>
                </div>
              </div>
              {beds.loading ? <div className="loader-inline">Loading beds…</div> : null}
              {!beds.loading && (beds.data || []).length === 0 ? <Empty icon="bed" title="No beds in this ward" message="Add the first bed." /> : null}
              <div className="bed-grid">
                {(beds.data || []).map((bed) => (
                  <button type="button" className={`bed bed--${bed.status.toLowerCase()}`} key={bed.id} onClick={() => setBedAction(bed)}>
                    <strong>{bed.code}</strong>
                    <span>{bed.status.toLowerCase()}</span>
                    <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{money(bed.dailyCharge)}/night</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="notice notice--info">
              <Icon name="bed" size={16} />
              <div>Select a ward above to see its bed map. Occupied beds show who is admitted in the admissions tab.</div>
            </div>
          )}
        </>
      ) : null}

      {tab === 'admissions' ? (
        <>
          {admissions.loading ? <Loader label="Loading admissions…" /> : null}
          {admissions.error ? <ErrorState error={admissions.error} onRetry={admissions.refetch} /> : null}
          {!admissions.loading && !admissions.error && (admissions.data || []).length === 0 ? <Empty icon="bed" title="No admissions" message="Admit a patient to create the first in-patient stay." action={<button type="button" className="btn btn--primary" onClick={() => openAdmit()}>Admit patient</button>} /> : null}
          {!admissions.loading && !admissions.error && (admissions.data || []).length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Patient</th><th>Bed</th><th>Consultant</th><th>Admitted</th><th>Stay</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {(admissions.data || []).map((admission) => {
                    const days = Math.max(1, Math.ceil((Date.now() - new Date(admission.admittedAt)) / 86_400_000));
                    return (
                      <tr key={admission.id}>
                        <td data-label="Patient">
                          <strong>{admission.patient?.user?.name}</strong>
                          <span className="muted" style={{ display: 'block', fontSize: 11 }}>{admission.diagnosis}</span>
                        </td>
                        <td data-label="Bed">
                          {admission.bed?.ward?.name}
                          <span className="muted" style={{ display: 'block', fontSize: 11 }}>Bed {admission.bed?.code} · {money(admission.dailyCharge)}/night</span>
                        </td>
                        <td data-label="Consultant">{admission.doctor?.user?.name}</td>
                        <td data-label="Admitted">{dateTime(admission.admittedAt)}</td>
                        <td data-label="Stay">{admission.status === 'ADMITTED' ? `${days} day${days > 1 ? 's' : ''}` : date(admission.dischargedAt)}</td>
                        <td data-label="Status"><Badge status={admission.status.toLowerCase()} /></td>
                        <td data-label="Actions">
                          <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                            {admission.status === 'ADMITTED' ? (
                              <button type="button" className="btn btn--sm btn--primary" onClick={() => { setDischargeFor(admission); setDischargeNotes(''); }}>Discharge</button>
                            ) : (
                              <span className="muted" style={{ fontSize: 11 }}>Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      <Modal
        open={Boolean(bedAction)}
        onClose={() => setBedAction(null)}
        title={bedAction ? `Bed ${bedAction.code}` : ''}
        description={bedAction ? `${bedAction.ward?.name} · ${money(bedAction.dailyCharge)} per night` : ''}
        footer={<button type="button" className="btn" onClick={() => setBedAction(null)}>Close</button>}
      >
        {bedAction ? (
          <>
            <div className="detail"><span>Status</span><strong><Badge status={bedAction.status.toLowerCase()} /></strong></div>
            {bedAction.status === 'AVAILABLE' ? (
              <button type="button" className="btn btn--primary btn--block" onClick={() => openAdmit(bedAction)}>Admit a patient to this bed</button>
            ) : null}
            {bedAction.status === 'OCCUPIED' ? (
              <div className="notice notice--info"><Icon name="bed" size={16} /><div>Discharge the patient from the admissions tab to free this bed.</div></div>
            ) : null}
            <div className="row-gap">
              {bedAction.status !== 'OCCUPIED' ? (
                <>
                  <button type="button" className="btn btn--sm" onClick={() => saveBedStatus('AVAILABLE')}>Mark available</button>
                  <button type="button" className="btn btn--sm" onClick={() => saveBedStatus('MAINTENANCE')}>Maintenance</button>
                </>
              ) : null}
              <button type="button" className="btn btn--sm" onClick={() => { setBedModal(bedAction); setBedForm({ code: bedAction.code, dailyCharge: bedAction.dailyCharge }); setBedAction(null); }}>Edit bed</button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={admitOpen}
        onClose={() => setAdmitOpen(false)}
        title="Admit a patient"
        description={admitBed ? `Bed ${admitBed.code} · ${admitBed.ward?.name}` : 'Choose an available bed.'}
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setAdmitOpen(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={submitAdmit} disabled={busy}>{busy ? 'Admitting…' : 'Admit patient'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Patient">
            <select value={admitForm.patientId} onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}>
              <option value="">Choose a patient</option>
              {(patients.data || []).map((patient) => <option key={patient.id} value={patient.id}>{patient.user?.name} · {patient.user?.email}</option>)}
            </select>
          </Field>
          <Field label="Attending consultant">
            <select value={admitForm.doctorId} onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })}>
              <option value="">Choose a consultant</option>
              {(doctors.data || []).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user?.name} · {doctor.department?.name}</option>)}
            </select>
          </Field>
          <Field label="Bed">
            <select value={admitForm.bedId} onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}>
              <option value="">Choose an available bed</option>
              {(availableBeds.data || []).map((bed) => (
                <option key={bed.id} value={bed.id}>{bed.ward?.name} · {bed.code} · {money(bed.dailyCharge)}/night</option>
              ))}
            </select>
          </Field>
          <Field label="Admission date"><input type="date" value={todayIso()} disabled /></Field>
        </div>
        <Field label="Working diagnosis"><input value={admitForm.diagnosis} onChange={(e) => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} placeholder="e.g. Community-acquired pneumonia" /></Field>
        <Field label="Notes"><textarea rows={3} value={admitForm.notes} onChange={(e) => setAdmitForm({ ...admitForm, notes: e.target.value })} placeholder="Care plan, isolation needs, allergies…" /></Field>
      </Modal>

      <Modal
        open={Boolean(dischargeFor)}
        onClose={() => setDischargeFor(null)}
        title="Discharge patient"
        description={dischargeFor ? `${dischargeFor.patient?.user?.name} · bed ${dischargeFor.bed?.code}` : ''}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setDischargeFor(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={submitDischarge} disabled={busy}>{busy ? 'Discharging…' : 'Discharge & invoice'}</button>
          </>
        )}
      >
        {dischargeFor ? (
          <>
            <div className="grid-2">
              <div className="detail"><span>Admitted</span><strong>{dateTime(dischargeFor.admittedAt)}</strong></div>
              <div className="detail"><span>Daily charge</span><strong>{money(dischargeFor.dailyCharge)}</strong></div>
              <div className="detail"><span>Estimated nights</span><strong>{Math.max(1, Math.ceil((Date.now() - new Date(dischargeFor.admittedAt)) / 86_400_000))}</strong></div>
              <div className="detail"><span>Consultant</span><strong>{dischargeFor.doctor?.user?.name}</strong></div>
            </div>
            <Field label="Discharge summary"><textarea rows={3} value={dischargeNotes} onChange={(e) => setDischargeNotes(e.target.value)} placeholder="Condition on discharge, medication changes, follow-up…" /></Field>
            <p className="muted" style={{ fontSize: 12 }}>
              Discharging frees the bed and generates the room + consultant invoice automatically.
            </p>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(wardModal)}
        onClose={() => setWardModal(null)}
        title={wardModal?.id === 'new' ? 'New ward' : `Edit ${wardModal?.name || ''}`}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setWardModal(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={saveWard} disabled={busy}>{busy ? 'Saving…' : 'Save ward'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Name"><input value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} placeholder="Surgical Ward" /></Field>
          <Field label="Type"><input value={wardForm.type} onChange={(e) => setWardForm({ ...wardForm, type: e.target.value })} placeholder="General / ICU / Maternity" /></Field>
          <Field label="Floor"><input value={wardForm.floor} onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })} placeholder="Level 2" /></Field>
          <Field label="Status">
            <select value={wardForm.active ? 'active' : 'inactive'} onChange={(e) => setWardForm({ ...wardForm, active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea rows={2} value={wardForm.description} onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })} /></Field>
      </Modal>

      <Modal
        open={Boolean(bedModal)}
        onClose={() => setBedModal(null)}
        title={bedModal?.id === 'new' ? 'Add bed' : `Edit bed ${bedModal?.code || ''}`}
        description={selectedWard?.name}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setBedModal(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={saveBed} disabled={busy}>{busy ? 'Saving…' : 'Save bed'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Bed code"><input value={bedForm.code} onChange={(e) => setBedForm({ ...bedForm, code: e.target.value })} placeholder="GM-09" /></Field>
          <Field label="Daily charge (Rs.)"><input type="number" min="0" step="500" value={bedForm.dailyCharge} onChange={(e) => setBedForm({ ...bedForm, dailyCharge: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
