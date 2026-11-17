import { useState } from 'react';
import { labApi, patientApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, PageHead, Stat, Tabs,
} from '../../components/ui';
import { dateTime, relative } from '../../utils/format';

const TABS = [
  { value: '', label: 'All' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function DoctorLabOrders() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ patientId: '', testId: '', priority: 'ROUTINE' });
  const [busy, setBusy] = useState(false);

  const orders = useApi(() => labApi.orders(status || undefined), [status]);
  const patients = useApi(() => patientApi.list(), [orderOpen], { enabled: orderOpen });
  const tests = useApi(() => labApi.tests(), [orderOpen], { enabled: orderOpen });

  const items = orders.data || [];
  const counts = {
    ordered: items.filter((order) => order.status === 'ORDERED').length,
    collected: items.filter((order) => order.status === 'COLLECTED').length,
    completed: items.filter((order) => order.status === 'COMPLETED').length,
  };

  const submit = async () => {
    if (!form.patientId || !form.testId) { toast.error('Choose a patient and a test'); return; }
    setBusy(true);
    try {
      await labApi.order({ patientId: Number(form.patientId), testId: Number(form.testId), priority: form.priority });
      toast.success('Lab test ordered');
      setOrderOpen(false);
      setForm({ patientId: '', testId: '', priority: 'ROUTINE' });
      orders.refetch();
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
        title="Lab orders"
        description="Tests you have ordered, their sample status and published results."
        actions={<button type="button" className="btn btn--primary" onClick={() => setOrderOpen(true)}><Icon name="plus" size={15} /> Order a test</button>}
      />

      <div className="stat-row">
        <Stat label="Awaiting sample" value={counts.ordered} hint="Not collected yet" icon="clock" tone={counts.ordered ? 'warning' : 'success'} />
        <Stat label="In the lab" value={counts.collected} hint="Being processed" icon="flask" tone="info" />
        <Stat label="Results ready" value={counts.completed} hint="Published to the chart" icon="check" tone="success" />
        <Stat label="Total ordered" value={items.length} hint="Your orders" icon="file" />
      </div>

      <div className="toolbar">
        <Tabs tabs={TABS} value={status} onChange={setStatus} />
        <button type="button" className="btn btn--sm" onClick={orders.refetch}>Refresh</button>
      </div>

      {orders.loading ? <Loader label="Loading lab orders…" /> : null}
      {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : null}
      {!orders.loading && !orders.error && items.length === 0 ? <Empty icon="flask" title="No lab orders" message="Order a test from a patient chart or from here." action={<button type="button" className="btn btn--primary" onClick={() => setOrderOpen(true)}>Order a test</button>} /> : null}

      {!orders.loading && !orders.error && items.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Patient</th><th>Test</th><th>Priority</th><th>Ordered</th><th>Result</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {items.map((order) => (
                <tr key={order.id}>
                  <td data-label="Patient"><strong>{order.patient?.user?.name}</strong></td>
                  <td data-label="Test">
                    {order.test?.name}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{order.test?.code} · {order.test?.sampleType}</span>
                  </td>
                  <td data-label="Priority"><Badge tone={order.priority === 'URGENT' ? 'danger' : 'muted'}>{order.priority}</Badge></td>
                  <td data-label="Ordered">{relative(order.orderedAt)}</td>
                  <td data-label="Result">
                    {order.status === 'COMPLETED'
                      ? <span><strong>{order.resultValue}</strong> {order.resultUnit || ''}</span>
                      : <span className="muted">Pending</span>}
                  </td>
                  <td data-label="Status"><Badge status={order.status.toLowerCase()} /></td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      {order.status === 'COMPLETED' ? <button type="button" className="btn btn--sm" onClick={() => setDetail(order)}>View result</button> : <span className="muted" style={{ fontSize: 11 }}>Awaiting lab</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Order a lab test"
        description="Only patients you have treated can be selected."
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setOrderOpen(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>{busy ? 'Ordering…' : 'Order test'}</button>
          </>
        )}
      >
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Choose a patient</option>
            {(patients.data || []).map((patient) => <option key={patient.id} value={patient.id}>{patient.user?.name} · {patient.user?.email}</option>)}
          </select>
        </Field>
        <Field label="Test">
          <select value={form.testId} onChange={(e) => setForm({ ...form, testId: e.target.value })}>
            <option value="">Choose a test</option>
            {(tests.data || []).map((test) => <option key={test.id} value={test.id}>{test.name} · {test.sampleType} · Rs. {test.price}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Lab result"
        description={detail ? `${detail.test?.name} · ${detail.patient?.user?.name}` : ''}
        footer={<button type="button" className="btn" onClick={() => setDetail(null)}>Close</button>}
      >
        {detail ? (
          <>
            <div className="lab-result">
              <div>
                <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Result</span>
                <div className="lab-result__value">{detail.resultValue} <span style={{ fontSize: 14, fontWeight: 500 }}>{detail.resultUnit || ''}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reference</span>
                <div className="lab-result__range">{detail.referenceRange || '—'}</div>
              </div>
            </div>
            <div className="grid-2">
              <div className="detail"><span>Collected</span><strong>{detail.collectedAt ? dateTime(detail.collectedAt) : '—'}</strong></div>
              <div className="detail"><span>Reported</span><strong>{detail.completedAt ? dateTime(detail.completedAt) : '—'}</strong></div>
              <div className="detail"><span>Technician</span><strong>{detail.technician || '—'}</strong></div>
              <div className="detail"><span>Priority</span><strong>{detail.priority}</strong></div>
            </div>
            {detail.remarks ? <p className="record__notes">{detail.remarks}</p> : null}
          </>
        ) : null}
      </Modal>
    </div>
  );
}
