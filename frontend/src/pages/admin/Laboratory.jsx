import { useState } from 'react';
import { labApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, Stat, Tabs,
} from '../../components/ui';
import { dateTime, time } from '../../utils/format';

const STATUS_TABS = [
  { value: '', label: 'All orders' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const BLANK_TEST = {
  code: '', name: '', category: 'Biochemistry', price: '', sampleType: 'Blood',
  referenceRange: '', unit: '', turnaroundHours: 24, active: true,
};

export default function AdminLaboratory() {
  const toast = useToast();
  const [tab, setTab] = useState('orders');
  const [status, setStatus] = useState('');
  const [resultFor, setResultFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_TEST);
  const [resultForm, setResultForm] = useState({ resultValue: '', resultUnit: '', referenceRange: '', remarks: '' });
  const [busy, setBusy] = useState(false);

  const orders = useApi(() => labApi.orders(status || undefined), [status]);
  const tests = useApi(() => labApi.tests(true), []);

  const allOrders = orders.data || [];
  const counts = {
    ordered: allOrders.filter((o) => o.status === 'ORDERED').length,
    collected: allOrders.filter((o) => o.status === 'COLLECTED').length,
    completed: allOrders.filter((o) => o.status === 'COMPLETED').length,
  };

  const collect = async (order) => {
    try {
      await labApi.collect(order.id, 'Laboratory desk');
      toast.success('Sample marked as collected');
      orders.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancel = async (order) => {
    if (!window.confirm(`Cancel the ${order.test?.name} order for ${order.patient?.user?.name}?`)) return;
    try {
      await labApi.cancel(order.id);
      toast.success('Lab order cancelled');
      orders.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openResult = (order) => {
    setResultFor(order);
    setResultForm({
      resultValue: order.resultValue || '',
      resultUnit: order.resultUnit || order.test?.unit || '',
      referenceRange: order.referenceRange || order.test?.referenceRange || '',
      remarks: order.remarks || '',
    });
  };

  const submitResult = async () => {
    if (!resultForm.resultValue.trim()) { toast.error('Enter a result value'); return; }
    setBusy(true);
    try {
      await labApi.result(resultFor.id, resultForm);
      toast.success('Result published and the patient notified');
      setResultFor(null);
      orders.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openNewTest = () => { setEditing({ id: 'new' }); setForm(BLANK_TEST); };
  const openEditTest = (test) => {
    setEditing(test);
    setForm({
      code: test.code, name: test.name, category: test.category || '', price: test.price,
      sampleType: test.sampleType || '', referenceRange: test.referenceRange || '',
      unit: test.unit || '', turnaroundHours: test.turnaroundHours, active: test.active,
    });
  };

  const saveTest = async () => {
    setBusy(true);
    try {
      const body = { ...form, price: Number(form.price || 0), turnaroundHours: Number(form.turnaroundHours || 24) };
      if (editing.id === 'new') await labApi.createTest(body);
      else await labApi.updateTest(editing.id, body);
      toast.success(editing.id === 'new' ? 'Test added to the catalogue' : 'Test updated');
      setEditing(null);
      tests.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Diagnostics"
        title="Laboratory"
        description="Sample collection, result entry and the test catalogue — connected to doctor orders and patient portals."
        actions={tab === 'catalog' ? <button type="button" className="btn btn--primary" onClick={openNewTest}><Icon name="plus" size={15} /> Add test</button> : null}
      />

      <div className="stat-row">
        <Stat label="Awaiting collection" value={counts.ordered} hint="Orders needing a sample" icon="clock" tone={counts.ordered ? 'warning' : 'success'} />
        <Stat label="In the lab" value={counts.collected} hint="Samples being processed" icon="flask" tone="info" />
        <Stat label="Completed" value={counts.completed} hint="Results published" icon="check" tone="success" />
        <Stat label="Catalogue" value={(tests.data || []).length} hint="Tests offered" icon="file" />
      </div>

      <div className="toolbar">
        <Tabs tabs={[{ value: 'orders', label: 'Orders' }, { value: 'catalog', label: 'Test catalogue' }]} value={tab} onChange={setTab} />
        {tab === 'orders' ? <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} /> : null}
      </div>

      {tab === 'orders' ? (
        <>
          {orders.loading ? <Loader label="Loading lab orders…" /> : null}
          {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : null}
          {!orders.loading && !orders.error && allOrders.length === 0 ? <Empty icon="flask" title="No lab orders" message="Doctors order tests from their portal." /> : null}
          {!orders.loading && !orders.error && allOrders.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Patient</th><th>Test</th><th>Ordered by</th><th>Priority</th><th>Ordered</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {allOrders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Patient">
                        <strong>{order.patient?.user?.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{order.patient?.user?.email}</span>
                      </td>
                      <td data-label="Test">
                        {order.test?.name}
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{order.test?.code} · {order.test?.sampleType}</span>
                      </td>
                      <td data-label="Ordered by">{order.doctor?.user?.name}</td>
                      <td data-label="Priority"><Badge tone={order.priority === 'URGENT' ? 'danger' : 'muted'}>{order.priority}</Badge></td>
                      <td data-label="Ordered">{dateTime(order.orderedAt)}</td>
                      <td data-label="Status"><Badge status={order.status.toLowerCase()} /></td>
                      <td data-label="Actions">
                        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                          {order.status === 'ORDERED' ? <button type="button" className="btn btn--sm" onClick={() => collect(order)}>Collect</button> : null}
                          {order.status === 'ORDERED' || order.status === 'COLLECTED' ? (
                            <button type="button" className="btn btn--sm btn--primary" onClick={() => openResult(order)}>Enter result</button>
                          ) : null}
                          {order.status === 'COMPLETED' ? <button type="button" className="btn btn--sm" onClick={() => setDetail(order)}>View result</button> : null}
                          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' ? (
                            <button type="button" className="btn btn--sm btn--danger" onClick={() => cancel(order)}>Cancel</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'catalog' ? (
        <>
          {tests.loading ? <Loader label="Loading the test catalogue…" /> : null}
          {tests.error ? <ErrorState error={tests.error} onRetry={tests.refetch} /> : null}
          {!tests.loading && !tests.error ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Test</th><th>Category</th><th>Sample</th><th>Reference range</th><th>Price</th><th>Turnaround</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {(tests.data || []).map((test) => (
                    <tr key={test.id}>
                      <td data-label="Test">
                        <strong>{test.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{test.code}</span>
                      </td>
                      <td data-label="Category">{test.category || '—'}</td>
                      <td data-label="Sample">{test.sampleType || '—'}</td>
                      <td data-label="Reference range"><span className="muted" style={{ fontSize: 12 }}>{test.referenceRange || '—'}</span></td>
                      <td data-label="Price"><Money value={test.price} /></td>
                      <td data-label="Turnaround">{test.turnaroundHours}h</td>
                      <td data-label="Actions">
                        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn--sm" onClick={() => openEditTest(test)}>Edit</button>
                          <Badge status={test.active ? 'active' : 'inactive'} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      <Modal
        open={Boolean(resultFor)}
        onClose={() => setResultFor(null)}
        title="Enter a lab result"
        description={resultFor ? `${resultFor.test?.name} · ${resultFor.patient?.user?.name}` : ''}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setResultFor(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={submitResult} disabled={busy}>{busy ? 'Publishing…' : 'Publish result'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Result value"><input value={resultForm.resultValue} onChange={(e) => setResultForm({ ...resultForm, resultValue: e.target.value })} placeholder="e.g. 7.2" /></Field>
          <Field label="Unit"><input value={resultForm.resultUnit} onChange={(e) => setResultForm({ ...resultForm, resultUnit: e.target.value })} /></Field>
          <Field label="Reference range"><input value={resultForm.referenceRange} onChange={(e) => setResultForm({ ...resultForm, referenceRange: e.target.value })} /></Field>
          <Field label="Technician"><input value={resultFor?.technician || ''} readOnly disabled /></Field>
        </div>
        <Field label="Remarks"><textarea rows={3} value={resultForm.remarks} onChange={(e) => setResultForm({ ...resultForm, remarks: e.target.value })} placeholder="Interpretation or follow-up advice…" /></Field>
        <p className="muted" style={{ fontSize: 12 }}>Publishing notifies the patient and the ordering doctor, and locks the order as completed.</p>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Laboratory result"
        description={detail ? `${detail.test?.name} · ${detail.patient?.user?.name}` : ''}
        footer={<button type="button" className="btn" onClick={() => setDetail(null)}>Close</button>}
      >
        {detail ? (
          <>
            <div className="grid-2">
              <div className="detail"><span>Result</span><strong style={{ fontSize: 20 }}>{detail.resultValue} {detail.resultUnit || ''}</strong></div>
              <div className="detail"><span>Reference range</span><strong>{detail.referenceRange || '—'}</strong></div>
              <div className="detail"><span>Collected</span><strong>{detail.collectedAt ? dateTime(detail.collectedAt) : '—'}</strong></div>
              <div className="detail"><span>Reported</span><strong>{detail.completedAt ? dateTime(detail.completedAt) : '—'}</strong></div>
            </div>
            <div className="detail"><span>Remarks</span><strong>{detail.remarks || '—'}</strong></div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id === 'new' ? 'Add a lab test' : `Edit ${editing?.name || ''}`}
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={saveTest} disabled={busy}>{busy ? 'Saving…' : 'Save test'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Code"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CBC" /></Field>
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Complete Blood Count" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Sample type"><input value={form.sampleType} onChange={(e) => setForm({ ...form, sampleType: e.target.value })} /></Field>
          <Field label="Price (Rs.)"><input type="number" min="0" step="50" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Turnaround (hours)"><input type="number" min="1" value={form.turnaroundHours} onChange={(e) => setForm({ ...form, turnaroundHours: e.target.value })} /></Field>
          <Field label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="x10^9/L" /></Field>
          <Field label="Status">
            <select value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Reference range"><input value={form.referenceRange} onChange={(e) => setForm({ ...form, referenceRange: e.target.value })} placeholder="4.0 - 11.0 x10^9/L" /></Field>
      </Modal>
    </div>
  );
}
