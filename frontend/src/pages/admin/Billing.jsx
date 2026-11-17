import { useEffect, useState } from 'react';
import { billingApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, SearchBar, Stat, Tabs,
} from '../../components/ui';
import { compactMoney, date, money, time } from '../../utils/format';

const TABS = [
  { value: 'ALL', label: 'All invoices' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_PAID', label: 'Part paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

const METHODS = ['CASH', 'CARD', 'UPI', 'INSURANCE', 'BANK_TRANSFER'];

export default function AdminBilling() {
  const toast = useToast();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [payInvoice, setPayInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);

  const summary = useApi(() => billingApi.summary(), []);
  const { data, loading, error, refetch } = useApi(
    () => billingApi.list({ limit: 300, ...(status !== 'ALL' ? { status } : {}), ...(query ? { search: query } : {}) }),
    [status, query]
  );

  const invoices = data || [];
  const s = summary.data || {};

  const download = async (invoice) => {
    try {
      await billingApi.pdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const voidInvoice = async (invoice) => {
    if (!window.confirm(`Void invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await billingApi.void(invoice.id);
      toast.success('Invoice voided');
      refetch();
      summary.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Finance"
        title="Billing & invoices"
        description="Consultation and admission invoices, payments and outstanding balances."
        actions={<button type="button" className="btn" onClick={() => { refetch(); summary.refetch(); }}><Icon name="activity" size={15} /> Refresh</button>}
      />

      <div className="stat-row">
        <Stat label="Billed" value={compactMoney(s.billed)} hint="All non-void invoices" icon="receipt" />
        <Stat label="Collected" value={compactMoney(s.collected)} hint={`${compactMoney(s.monthCollected)} this month`} icon="check" tone="success" />
        <Stat label="Outstanding" value={compactMoney(s.outstanding)} hint="Balance still to collect" icon="alert" tone="warning" />
        <Stat label="Invoices" value={(s.pending ?? 0) + (s.partiallyPaid ?? 0) + (s.paid ?? 0)} hint={`${s.pending ?? 0} pending · ${s.partiallyPaid ?? 0} part paid`} icon="file" tone="info" />
      </div>

      <div className="toolbar">
        <Tabs tabs={TABS} value={status} onChange={setStatus} />
        <div className="toolbar__group">
          <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Invoice number or patient" />
          {query ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setSearch(''); setQuery(''); }}>Clear</button> : null}
        </div>
      </div>

      {loading ? <Loader label="Loading invoices…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && invoices.length === 0 ? <Empty icon="receipt" title="No invoices match" message="Invoices are generated automatically when a visit is completed." /> : null}

      {!loading && !error && invoices.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Invoice</th><th>Patient</th><th>Service</th><th>Total</th><th>Balance</th><th>Status</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
                return (
                  <tr key={invoice.id}>
                    <td data-label="Invoice">
                      <strong>{invoice.invoiceNumber}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: 11 }}>{date(invoice.createdAt)}</span>
                    </td>
                    <td data-label="Patient">
                      {invoice.patient?.user?.name}
                      <span className="muted" style={{ display: 'block', fontSize: 11 }}>{invoice.patient?.user?.email}</span>
                    </td>
                    <td data-label="Service">
                      {invoice.appointment
                        ? <>Consultation<span className="muted" style={{ display: 'block', fontSize: 11 }}>{invoice.appointment.doctor?.user?.name} · {date(invoice.appointment.dateTime)}</span></>
                        : invoice.admission
                          ? <>Admission<span className="muted" style={{ display: 'block', fontSize: 11 }}>{invoice.admission.bed?.ward?.name} · bed {invoice.admission.bed?.code}</span></>
                          : 'Hospital services'}
                    </td>
                    <td data-label="Total"><Money value={invoice.totalAmount} /></td>
                    <td data-label="Balance">
                      <span style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{money(balance)}</span>
                      <span className="muted" style={{ display: 'block', fontSize: 11 }}>paid {money(invoice.amountPaid)}</span>
                    </td>
                    <td data-label="Status"><Badge status={invoice.status.toLowerCase()} /></td>
                    <td data-label="Actions">
                      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn--sm" onClick={() => download(invoice)} title="Download PDF"><Icon name="download" size={14} /></button>
                        {invoice.status !== 'VOID' && invoice.status !== 'PAID' ? (
                          <button type="button" className="btn btn--sm btn--primary" onClick={() => setPayInvoice(invoice)}>Pay</button>
                        ) : null}
                        {invoice.status !== 'VOID' && Number(invoice.amountPaid) === 0 ? (
                          <button type="button" className="btn btn--sm" onClick={() => setEditInvoice(invoice)}>Edit</button>
                        ) : null}
                        {invoice.status !== 'VOID' && Number(invoice.amountPaid) === 0 ? (
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => voidInvoice(invoice)}>Void</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <PayModal
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onPaid={() => { setPayInvoice(null); refetch(); summary.refetch(); }}
      />
      <EditModal
        invoice={editInvoice}
        onClose={() => setEditInvoice(null)}
        onSaved={() => { setEditInvoice(null); refetch(); summary.refetch(); }}
      />
    </div>
  );
}

function PayModal({ invoice, onClose, onPaid }) {
  const toast = useToast();
  const balance = invoice ? Number(invoice.totalAmount) - Number(invoice.amountPaid) : 0;
  const [form, setForm] = useState({ amount: '', method: 'CARD', reference: '' });
  const [busy, setBusy] = useState(false);

  const close = () => { setForm({ amount: '', method: 'CARD', reference: '' }); onClose(); };

  const submit = async () => {
    setBusy(true);
    try {
      await billingApi.pay(invoice.id, {
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || null,
      });
      toast.success('Payment recorded');
      setForm({ amount: '', method: 'CARD', reference: '' });
      onPaid();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(invoice)}
      onClose={close}
      title="Record a payment"
      description={invoice ? `${invoice.invoiceNumber} · ${invoice.patient?.user?.name}` : ''}
      footer={(
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy || !form.amount}>{busy ? 'Recording…' : 'Record payment'}</button>
        </>
      )}
    >
      <div className="notice notice--info" style={{ marginBottom: 8 }}>
        <Icon name="receipt" size={16} />
        <div>Outstanding balance <strong>{money(balance)}</strong></div>
      </div>
      <div className="grid-2">
        <Field label="Amount (Rs.)">
          <input type="number" min="0.01" step="0.01" max={balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={balance.toFixed(2)} />
        </Field>
        <Field label="Method">
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((method) => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Reference" hint="Card terminal slip, bank reference or receipt number.">
        <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
      </Field>
    </Modal>
  );
}

function EditModal({ invoice, onClose, onSaved }) {
  const toast = useToast();
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setDiscount(invoice.discount ? String(invoice.discount) : '');
    setNotes(invoice.notes || '');
  }, [invoice]);

  const close = () => { setDiscount(''); setNotes(''); onClose(); };

  const submit = async () => {
    setBusy(true);
    try {
      await billingApi.update(invoice.id, {
        discount: discount === '' ? 0 : Number(discount),
        notes,
      });
      toast.success('Invoice updated');
      setDiscount('');
      setNotes('');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(invoice)}
      onClose={close}
      title="Adjust invoice"
      description={invoice ? `${invoice.invoiceNumber} · subtotal ${money(invoice.subTotal)} · tax ${money(invoice.taxAmount)}` : ''}
      footer={(
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </>
      )}
    >
      <Field label="Discount (Rs.)" hint="Applied before tax. Cannot exceed the subtotal.">
        <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
      </Field>
      <Field label="Notes">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal billing note…" />
      </Field>
      <p className="muted" style={{ fontSize: 12 }}>
        Line items are generated from the service. Editing them is supported by the API
        (<code>PATCH /api/billing/invoice/{'{id}'}</code>) and the invoice is re-totalled server-side.
      </p>
    </Modal>
  );
}
