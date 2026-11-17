import { billingApi, wardApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge, Empty, ErrorState, Icon, Loader, Money, PageHead } from '../../components/ui';
import { date, dateTime, money } from '../../utils/format';

export default function PatientAdmissions() {
  const toast = useToast();
  const admissions = useApi(() => wardApi.admissions(), []);
  const invoices = useApi(() => billingApi.list({ limit: 100 }), []);

  const list = admissions.data || [];
  const invoiceByAdmission = Object.fromEntries(
    (invoices.data || []).filter((invoice) => invoice.admission).map((invoice) => [invoice.admission.id, invoice])
  );

  const download = async (invoice) => {
    try {
      await billingApi.pdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="In-patient care"
        title="Admissions"
        description="Hospital stays, treating consultants, bed charges and the discharge invoice."
      />

      {admissions.loading ? <Loader label="Loading your admissions…" /> : null}
      {admissions.error ? <ErrorState error={admissions.error} onRetry={admissions.refetch} /> : null}
      {!admissions.loading && !admissions.error && list.length === 0 ? <Empty icon="bed" title="No admissions" message="If you are admitted to hospital, your stay appears here." /> : null}

      <div className="stack">
        {list.map((admission) => {
          const invoice = invoiceByAdmission[admission.id];
          const days = Math.max(1, Math.ceil(((admission.dischargedAt ? new Date(admission.dischargedAt) : new Date()) - new Date(admission.admittedAt)) / 86_400_000));
          return (
            <article className="card" key={admission.id}>
              <div className="card__head">
                <div>
                  <h3>{admission.bed?.ward?.name} · bed {admission.bed?.code}</h3>
                  <p className="muted">Admitted {dateTime(admission.admittedAt)} · {admission.doctor?.user?.name}</p>
                </div>
                <Badge status={admission.status.toLowerCase()} />
              </div>
              <div className="grid-3">
                <div className="detail"><span>Diagnosis</span><strong>{admission.diagnosis || '—'}</strong></div>
                <div className="detail"><span>Daily charge</span><strong>{money(admission.dailyCharge)}</strong></div>
                <div className="detail"><span>Stay</span><strong>{days} night{days > 1 ? 's' : ''}</strong></div>
                <div className="detail"><span>Discharged</span><strong>{admission.dischargedAt ? date(admission.dischargedAt) : 'Still admitted'}</strong></div>
                <div className="detail"><span>Consultant</span><strong>{admission.doctor?.specialization}</strong></div>
                <div className="detail"><span>Invoice</span><strong>{invoice ? invoice.invoiceNumber : 'On discharge'}</strong></div>
              </div>
              {admission.notes ? <p className="record__notes">{admission.notes}</p> : null}
              {invoice ? (
                <div className="row-end">
                  <span className="muted" style={{ fontSize: 12 }}>Total {money(invoice.totalAmount)} · balance {money(Number(invoice.totalAmount) - Number(invoice.amountPaid))}</span>
                  <div className="row-gap">
                    <button type="button" className="btn btn--sm" onClick={() => download(invoice)}><Icon name="download" size={14} /> Invoice PDF</button>
                    <a className="btn btn--sm btn--primary" href="/patient/invoices">Pay invoice</a>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
