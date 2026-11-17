import { pharmacyApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { Badge, Empty, ErrorState, Loader, PageHead, Stat } from '../../components/ui';
import { date } from '../../utils/format';

export default function PatientPrescriptions() {
  const prescriptions = useApi(() => recordApi.prescriptions(), []);
  const dispenses = useApi(() => pharmacyApi.dispenses(), []);

  const list = prescriptions.data || [];
  const dispensed = Object.fromEntries((dispenses.data || []).map((dispenseRecord) => [dispenseRecord.prescription?.id, dispenseRecord]));
  const pending = list.filter((prescription) => !dispensed[prescription.id]).length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Medicines"
        title="Prescriptions"
        description="What your doctor prescribed, and whether the pharmacy has dispensed it."
      />

      <div className="stat-row">
        <Stat label="Prescriptions" value={list.length} hint="Issued to you" icon="pill" />
        <Stat label="Dispensed" value={list.length - pending} hint="Collected from pharmacy" icon="check" tone="success" />
        <Stat label="Awaiting pharmacy" value={pending} hint="Not dispensed yet" icon="clock" tone={pending ? 'warning' : 'success'} />
      </div>

      {prescriptions.loading ? <Loader label="Loading prescriptions…" /> : null}
      {prescriptions.error ? <ErrorState error={prescriptions.error} onRetry={prescriptions.refetch} /> : null}
      {!prescriptions.loading && !prescriptions.error && list.length === 0 ? <Empty icon="pill" title="No prescriptions" message="Prescriptions issued during a consultation appear here." /> : null}

      <div className="split split--even">
        {list.map((prescription) => {
          const dispenseRecord = dispensed[prescription.id];
          return (
            <article className="card" key={prescription.id}>
              <div className="card__head">
                <div>
                  <h3>{prescription.doctor?.user?.name}</h3>
                  <p className="muted">{date(prescription.createdAt)} · {prescription.doctor?.department?.name}</p>
                </div>
                {dispenseRecord ? <Badge tone="success">Dispensed</Badge> : <Badge tone="warning">Awaiting pharmacy</Badge>}
              </div>
              <div className="tile-list">
                {(prescription.items || []).map((item) => (
                  <div className="tile" key={item.medicineName}>
                    <div className="tile__main">
                      <strong>{item.medicineName}</strong>
                      <span>{item.dosage} · {item.frequency} · {item.durationDays} days</span>
                    </div>
                    <span className="muted">qty {item.quantity}</span>
                  </div>
                ))}
              </div>
              {prescription.advice ? <p className="muted" style={{ fontSize: 13 }}>Advice: {prescription.advice}</p> : null}
              {dispenseRecord ? (
                <p className="muted" style={{ fontSize: 11 }}>
                  Dispensed {date(dispenseRecord.createdAt)} by {dispenseRecord.dispensedBy} · total {dispenseRecord.totalAmount}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
