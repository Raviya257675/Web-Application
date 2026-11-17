import { useState } from 'react';
import { departmentApi, doctorApi, userApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Avatar, Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, SearchBar,
} from '../../components/ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function rotaSummary(slots = []) {
  if (!slots.length) return 'No rota published';
  const days = [...new Set(slots.map((slot) => slot.dayOfWeek))].sort((a, b) => a - b);
  const contiguous = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  const dayText = contiguous && days.length > 1
    ? `${DAYS[days[0] - 1]}–${DAYS[days[days.length - 1] - 1]}`
    : days.map((day) => DAYS[day - 1]).join(', ');
  const windows = [...new Set(slots.map((slot) => `${slot.startTime?.slice(0, 5)}–${slot.endTime?.slice(0, 5)}`))]
    .slice(0, 2)
    .join(' · ');
  return `${dayText} · ${windows}`;
}

const BLANK_DOCTOR = {
  name: '', email: '', password: '', phone: '', departmentId: '',
  specialization: '', consultationFee: '', licenseNo: '', experienceYears: '', bio: '',
};

export default function AdminDoctors() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_DOCTOR);
  const [editForm, setEditForm] = useState({});
  const [busy, setBusy] = useState(false);

  const departments = useApi(() => departmentApi.list(true), []);
  const { data, loading, error, refetch } = useApi(
    () => doctorApi.list({ includeInactive: true, ...(query ? { search: query } : {}) }),
    [query]
  );
  const doctors = data || [];

  const create = async () => {
    setBusy(true);
    try {
      await userApi.createStaff({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'DOCTOR',
        phone: form.phone || null,
        departmentId: Number(form.departmentId),
        specialization: form.specialization || null,
        consultationFee: form.consultationFee ? Number(form.consultationFee) : null,
        licenseNo: form.licenseNo || null,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        bio: form.bio || null,
      });
      toast.success('Consultant provisioned with default Mon–Fri hours');
      setCreating(false);
      setForm(BLANK_DOCTOR);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (doctor) => {
    setEditing(doctor);
    setEditForm({
      specialization: doctor.specialization,
      departmentId: doctor.department?.id,
      consultationFee: doctor.consultationFee,
      bio: doctor.bio || '',
      licenseNo: doctor.licenseNo || '',
      experienceYears: doctor.experienceYears ?? '',
      phone: doctor.user?.phone || '',
      active: doctor.active,
    });
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await doctorApi.update(editing.id, {
        specialization: editForm.specialization,
        departmentId: Number(editForm.departmentId),
        consultationFee: Number(editForm.consultationFee),
        bio: editForm.bio,
        licenseNo: editForm.licenseNo,
        experienceYears: editForm.experienceYears === '' ? null : Number(editForm.experienceYears),
        phone: editForm.phone,
        active: editForm.active,
      });
      toast.success('Consultant profile updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (doctor) => {
    if (!window.confirm(`Deactivate ${doctor.user?.name}? Their account and roster will be disabled.`)) return;
    try {
      await doctorApi.deactivate(doctor.id);
      toast.success('Consultant deactivated');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Clinical team"
        title="Consultants"
        description="Profiles, departments, fees and the weekly rota that drives booking availability."
        actions={<button type="button" className="btn btn--primary" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> Add consultant</button>}
      />

      <div className="toolbar">
        <div className="inline-meta">
          <span>{doctors.filter((doctor) => doctor.active).length} active</span>
          <span className="dot-sep">{doctors.length} total</span>
        </div>
        <div className="toolbar__group">
          <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Name, specialty or department" />
          {query ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading consultants…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && doctors.length === 0 ? <Empty icon="activity" title="No consultants found" message="Add a consultant or clear the search." /> : null}

      {!loading && !error && doctors.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Consultant</th><th>Department</th><th>Rota</th><th>Fee</th><th>Status</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td data-label="Consultant">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={doctor.user?.name} />
                      <div>
                        <strong>{doctor.user?.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{doctor.specialization} · {doctor.experienceYears ?? 0} yrs</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Department">{doctor.department?.name}</td>
                  <td data-label="Rota"><span className="muted" style={{ fontSize: 12 }}>{rotaSummary(doctor.availableSlots)}</span></td>
                  <td data-label="Fee"><Money value={doctor.consultationFee} /></td>
                  <td data-label="Status"><Badge status={doctor.active ? 'active' : 'inactive'} /></td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--sm" onClick={() => openEdit(doctor)}>Edit</button>
                      {doctor.active ? <button type="button" className="btn btn--sm btn--danger" onClick={() => deactivate(doctor)}>Deactivate</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a consultant"
        description="Creates the login, the clinical profile and a default Mon–Fri 09:00–13:00 rota in one step."
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create consultant'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Silva" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane.silva@hospital.test" /></Field>
          <Field label="Temporary password"><input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 000 0000" /></Field>
          <Field label="Department">
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Choose a department</option>
              {(departments.data || []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Specialisation"><input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Interventional Cardiology" /></Field>
          <Field label="Consultation fee (Rs.)"><input type="number" min="0" step="100" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} placeholder="Defaults to department fee" /></Field>
          <Field label="Licence number"><input value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} placeholder="SLMC-12345" /></Field>
          <Field label="Experience (years)"><input type="number" min="0" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></Field>
        </div>
        <Field label="Profile bio"><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Clinical interests and background…" /></Field>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.user?.name || ''}`}
        description="Rota changes are made by the consultant in their own portal."
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Department">
            <select value={editForm.departmentId || ''} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}>
              {(departments.data || []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Specialisation"><input value={editForm.specialization || ''} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} /></Field>
          <Field label="Consultation fee (Rs.)"><input type="number" min="0" step="100" value={editForm.consultationFee || ''} onChange={(e) => setEditForm({ ...editForm, consultationFee: e.target.value })} /></Field>
          <Field label="Experience (years)"><input type="number" min="0" value={editForm.experienceYears ?? ''} onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })} /></Field>
          <Field label="Licence number"><input value={editForm.licenseNo || ''} onChange={(e) => setEditForm({ ...editForm, licenseNo: e.target.value })} /></Field>
          <Field label="Phone"><input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
          <Field label="Status">
            <select value={editForm.active ? 'active' : 'inactive'} onChange={(e) => setEditForm({ ...editForm, active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Profile bio"><textarea rows={3} value={editForm.bio || ''} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></Field>
      </Modal>
    </div>
  );
}
