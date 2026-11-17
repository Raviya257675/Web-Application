import { useState } from 'react';
import { departmentApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead } from '../../components/ui';
import { money } from '../../utils/format';

const BLANK = { name: '', description: '', consultationFee: '', active: true };

export default function AdminDepartments() {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(() => departmentApi.list(true), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const departments = data || [];

  const openNew = () => { setEditing('new'); setForm(BLANK); };
  const openEdit = (department) => {
    setEditing(department);
    setForm({
      name: department.name,
      description: department.description || '',
      consultationFee: department.consultationFee,
      active: department.active,
    });
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description,
        consultationFee: Number(form.consultationFee || 0),
        active: form.active,
      };
      if (editing === 'new') await departmentApi.create(body);
      else await departmentApi.update(editing.id, body);
      toast.success(editing === 'new' ? 'Department created' : 'Department updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (department) => {
    if (!window.confirm(`Remove ${department.name}? Departments with doctors are deactivated instead of deleted.`)) return;
    try {
      await departmentApi.remove(department.id);
      toast.success('Department removed');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Hospital setup"
        title="Departments"
        description="Clinical specialities, their default consultation fee and consultant headcount."
        actions={<button type="button" className="btn btn--primary" onClick={openNew}><Icon name="plus" size={15} /> New department</button>}
      />

      {loading ? <Loader label="Loading departments…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && departments.length === 0 ? <Empty icon="building" title="No departments yet" message="Create the first clinical department." /> : null}

      <div className="split split--even">
        {departments.map((department) => (
          <article className="card" key={department.id}>
            <div className="card__head">
              <div>
                <h3>{department.name}</h3>
                <p className="muted">{department.slug}</p>
              </div>
              <span className={`badge badge--${department.active ? 'success' : 'muted'}`}>{department.active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="muted">{department.description || 'No description yet.'}</p>
            <div className="stat-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="detail"><span>Consultants</span><strong>{department.doctorCount}</strong></div>
              <div className="detail"><span>Consultation</span><strong><Money value={department.consultationFee} /></strong></div>
            </div>
            <div className="row-end">
              <button type="button" className="btn btn--sm" onClick={() => openEdit(department)}>Edit</button>
              <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(department)}>Remove</button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New department' : `Edit ${editing?.name || ''}`}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save department'}</button>
          </>
        )}
      >
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dermatology" />
        </Field>
        <Field label="Description">
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this department treats…" />
        </Field>
        <div className="grid-2">
          <Field label="Default consultation fee (Rs.)" hint={form.consultationFee ? money(form.consultationFee) : 'Used when a doctor has no custom fee.'}>
            <input type="number" min="0" step="100" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} placeholder="2500" />
          </Field>
          <Field label="Status">
            <select value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
