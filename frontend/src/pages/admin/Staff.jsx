import { useState } from 'react';
import { departmentApi, userApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Avatar, Badge, Empty, ErrorState, Field, Icon, Loader, Modal, PageHead, SearchBar, Tabs,
} from '../../components/ui';
import { date } from '../../utils/format';

const TABS = [
  { value: '', label: 'Everyone' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'DOCTOR', label: 'Doctors' },
  { value: 'RECEPTIONIST', label: 'Receptionists' },
  { value: 'PHARMACIST', label: 'Pharmacists' },
  { value: 'PATIENT', label: 'Patients' },
];

const BLANK = {
  name: '', email: '', password: '', role: 'ADMIN', phone: '',
  departmentId: '', specialization: '', consultationFee: '', licenseNo: '',
};

export default function AdminStaff({ approvals = false }) {
  const toast = useToast();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [pendingOnly, setPendingOnly] = useState(approvals);

  const departments = useApi(() => departmentApi.list(true), [creating]);
  const { data, loading, error, refetch } = useApi(
    () => userApi.list({ ...(role ? { role } : {}), ...(query ? { search: query } : {}) }),
    [role, query]
  );
  const users = (data || []).filter(u => !pendingOnly || u.approvalStatus === 'PENDING');
  const pendingCount = (data || []).filter(u => u.approvalStatus === 'PENDING').length;

  const review = async (approve) => {
    if (!approve && !reviewNote.trim()) { toast.error('Enter a reason for rejection.'); return; }
    setBusy(true);
    try { await userApi.review(reviewing.id, approve, reviewNote); toast.success(approve ? 'Staff access approved' : 'Application rejected'); setReviewing(null); refetch(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const create = async () => {
    setBusy(true);
    try {
      await userApi.createStaff({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || null,
        departmentId: form.role === 'DOCTOR' ? Number(form.departmentId) : null,
        specialization: form.role === 'DOCTOR' ? form.specialization || null : null,
        consultationFee: form.role === 'DOCTOR' && form.consultationFee ? Number(form.consultationFee) : null,
        licenseNo: form.role === 'DOCTOR' ? form.licenseNo || null : null,
      });
      toast.success('Account provisioned');
      setCreating(false);
      setForm(BLANK);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (user) => {
    const next = !user.active;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${user.name}?`)) return;
    try {
      await userApi.setStatus(user.id, next);
      toast.success(`Account ${next ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Access control"
        title={approvals ? 'Staff signup approvals' : 'Staff & accounts'}
        description="Doctor, pharmacist and receptionist signup applications appear here. Review an application and approve access so that person can sign in with their own password. Leave approvals are managed separately."
        actions={<div className="row-gap"><button className="btn" onClick={refetch}>Refresh applications</button><button type="button" className="btn btn--primary" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> Provision account</button></div>}
      />

      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)} /> Awaiting approval ({pendingCount})</label>
        <Tabs tabs={TABS} value={role} onChange={setRole} />
        <div className="toolbar__group">
          <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Name or email" />
          {query ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading accounts…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && users.length === 0 ? <Empty icon="shield" title="No accounts found" message="Provision a doctor or administrator to give them access." /> : null}

      {!loading && !error && users.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Account</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Account">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={user.name} />
                      <div>
                        <strong>{user.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role"><Badge tone={user.role === 'ADMIN' ? 'info' : user.role === 'DOCTOR' ? 'success' : 'muted'}>{user.role}</Badge></td>
                  <td data-label="Phone">{user.phone || '—'}</td>
                  <td data-label="Joined">{date(user.createdAt)}</td>
                  <td data-label="Status">{user.approvalStatus === 'PENDING' ? <Badge tone="warning">Awaiting review</Badge> : user.approvalStatus === 'REJECTED' ? <Badge tone="danger">Rejected</Badge> : <Badge status={user.active ? 'active' : 'inactive'} />}</td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      {user.approvalStatus === 'PENDING' ? <button className="btn btn--sm btn--primary" onClick={()=>{setReviewing(user);setReviewNote('');}}>Review application</button> : user.approvalStatus === 'REJECTED' ? <span className="muted">{user.reviewNote}</span> : <button type="button" className={`btn btn--sm ${user.active ? 'btn--danger' : 'btn--success'}`} onClick={() => toggle(user)}>
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={!!reviewing} onClose={()=>!busy&&setReviewing(null)} title="Review staff application" footer={<><button className="btn btn--danger" disabled={busy} onClick={()=>review(false)}>Reject application</button><button className="btn btn--primary" disabled={busy} onClick={()=>review(true)}>Approve access</button></>}>
        <h3>{reviewing?.name}</h3><p>{reviewing?.email} · {reviewing?.role}</p>
        <p>Professional registration: {reviewing?.professionalLicense || 'Not applicable'}</p>
        <p>{reviewing?.applicationNote || 'No additional application details supplied.'}</p>
        <p>Verify this person's identity, hospital affiliation and professional credentials before granting access. Administrator approval grants full hospital administration access.</p>
        <Field label="Review note (required for rejection)"><textarea maxLength={1000} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} /></Field>
      </Modal>
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Provision a staff account"
        description="Provision approved doctors, administrators, receptionists and pharmacists."
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asha Menon" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@hospital.test" /></Field>
          <Field label="Temporary password" hint="The account holder can change it after signing in."><input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 000 0000" /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Administrator</option>
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="PHARMACIST">Pharmacist</option>
            </select>
          </Field>
          {form.role === 'DOCTOR' ? (
            <Field label="Department">
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Choose a department</option>
                {(departments.data || []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </Field>
          ) : <div />}
          {form.role === 'DOCTOR' ? (
            <>
              <Field label="Specialisation"><input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></Field>
              <Field label="Consultation fee (Rs.)"><input type="number" min="0" step="100" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} /></Field>
              <Field label="Licence number"><input value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} /></Field>
            </>
          ) : null}
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Doctor accounts also get a Doctor profile and a default Monday–Friday 09:00–13:00 rota, which they can change themselves.
        </p>
      </Modal>
    </div>
  );
}
