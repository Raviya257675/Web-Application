import { useState } from 'react';
import { billingApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, Stat,
} from '../../components/ui';
import { date, money } from '../../utils/format';

const METHODS = ['CARD', 'CASH', 'UPI', 'INSURANCE', 'BANK_TRANSFER'];

export default function PatientInvoices() {
  const toast = useToast();
  const [payFor, setPayFor] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'CARD', reference: '' });
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useApi(() => billingApi.list({ limit: 100 }), []);
  const invoices = data || [];
  const billed = invoices.filter((i) => i.status !== 'VOID').reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const paid = invoices.filter((i) => i.status !== 'VOID').reduce((sum, i) => sum + Number(i.amountPaid), 0);
  const outstanding = billed - paid;

  const download = async (invoice) => {
    try {
      await billingApi.pdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openPay = (invoice) => {
    setForm({
      amount: String((Number(invoice.totalAmount) - Number(invoice.amountPaid)).toFixed(2)),
      method: 'CARD',
      reference: '',
    });
    setPayFor(invoice);
  };

  const pay = async () => {
    setBusy(true);
    try {
      await billingApi.pay(payFor.id, {
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || null,
      });
      toast.success('Payment recorded');
      setPayFor(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Billing"
        title="My invoices"
        description="Consultation and admission charges, with online payment and PDF statements."
      />

      <div className="stat-row">
        <Stat label="Billed" value={money(billed)} hint="Non-void invoices" icon="receipt" />
        <Stat label="Paid" value={money(paid)} hint="Received to date" icon="check" tone="success" />
        <Stat label="Outstanding" value={money(outstanding)} hint={outstanding > 0 ? 'Please settle at your convenience' : 'All settled'} icon="alert" tone={outstanding > 0 ? 'warning' : 'success'} />
      </div>

      {loading ? <Loader label="Loading your invoices…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && invoices.length === 0 ? <Empty icon="receipt" title="No invoices yet" message="An invoice is generated when a visit is completed." /> : null}

      <div className="stack">
        {invoices.map((invoice) => {
          const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
          return (
            <article className="card" key={invoice.id}>
              <div className="card__head">
                <div>
                  <h3>{invoice.invoiceNumber}</h3>
                  <p className="muted">
                    {invoice.appointment
                      ? `${invoice.appointment.doctor?.user?.name} · ${date(invoice.appointment.dateTime)}`
                      : invoice.admission
                        ? `${invoice.admission.bed?.ward?.name} · bed ${invoice.admission.bed?.code}`
                        : 'Hospital services'}
                  </p>
                </div>
                <Badge status={invoice.status.toLowerCase()} />
              </div>
              <div className="grid-3">
                <div className="detail"><span>Total</span><strong>{money(invoice.totalAmount)}</strong></div>
                <div className="detail"><span>Paid</span><strong>{money(invoice.amountPaid)}</strong></div>
                <div className="detail"><span>Balance</span><strong style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>{money(balance)}</strong></div>
                <div className="detail"><span>Issued</span><strong>{date(invoice.createdAt)}</strong></div>
                <div className="detail"><span>Due</span><strong>{date(invoice.dueDate)}</strong></div>
                <div className="detail"><span>Items</span><strong>{(invoice.items || []).length}</strong></div>
              </div>
              {(invoice.items || []).length ? (
                <ul className="rx__list" style={{ fontSize: 13 }}>
                  {invoice.items.map((item) => (
                    <li key={item.description}>{item.description} ×{item.quantity} — <Money value={item.amount} /></li>
                  ))}
                </ul>
              ) : null}
              <div className="row-end">
                <span className="muted" style={{ fontSize: 11 }}>Tax {money(invoice.taxAmount)} · discount {money(invoice.discount)}</span>
                <div className="row-gap">
                  <button type="button" className="btn btn--sm" onClick={() => download(invoice)}><Icon name="download" size={14} /> PDF</button>
                  {balance > 0 && invoice.status !== 'VOID' ? (
                    <button type="button" className="btn btn--sm btn--primary" onClick={() => openPay(invoice)}>Pay {money(balance)}</button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title="Pay invoice"
        description={payFor ? `${payFor.invoiceNumber} · balance ${money(Number(payFor.totalAmount) - Number(payFor.amountPaid))}` : ''}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setPayFor(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={pay} disabled={busy || !form.amount}>{busy ? 'Processing…' : 'Pay now'}</button>
          </>
        )}
      >
        <div className="notice notice--info">
          <Icon name="shield" size={16} />
          <div>This is a demo payment. No card details are collected; the payment is recorded against the invoice.</div>
        </div>
        <div className="grid-2">
          <Field label="Amount (Rs.)"><input type="number" min="0.01" step="0.01" max={payFor ? Number(payFor.totalAmount) - Number(payFor.amountPaid) : undefined} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Method">
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {METHODS.map((method) => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Reference" hint="Optional card or bank reference">
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="TXN-000000" />
        </Field>
      </Modal>
    </div>
  );
}
