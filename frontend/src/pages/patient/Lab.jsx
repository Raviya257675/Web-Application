import { labApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { Badge, Empty, ErrorState, Loader, PageHead, Stat } from '../../components/ui';
import { dateTime, relative } from '../../utils/format';

export default function PatientLab() {
  const { data, loading, error, refetch } = useApi(() => labApi.orders(), []);
  const orders = data || [];
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  const pending = orders.filter((order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED');

  return (
    <div className="page">
      <PageHead
        eyebrow="Diagnostics"
        title="Laboratory results"
        description="Samples your doctor ordered, their progress and published results."
        actions={<button type="button" className="btn" onClick={refetch}>Refresh</button>}
      />

      <div className="stat-row">
        <Stat label="Results ready" value={completed.length} hint="Published by the lab" icon="check" tone="success" />
        <Stat label="In progress" value={pending.length} hint="Awaiting collection or analysis" icon="flask" tone={pending.length ? 'warning' : 'success'} />
        <Stat label="Total tests" value={orders.length} hint="All time" icon="file" />
      </div>

      {loading ? <Loader label="Loading your lab tests…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && orders.length === 0 ? <Empty icon="flask" title="No laboratory tests" message="When your doctor orders a test it will appear here with its progress." /> : null}

      {pending.length ? (
        <section className="stack">
          <h3>In progress</h3>
          <div className="split split--even">
            {pending.map((order) => (
              <article className="card" key={order.id}>
                <div className="card__head">
                  <div><h3>{order.test?.name}</h3><p className="muted">{order.test?.code} · {order.test?.sampleType}</p></div>
                  <Badge status={order.status.toLowerCase()} />
                </div>
                <div className="grid-2">
                  <div className="detail"><span>Ordered</span><strong>{relative(order.orderedAt)}</strong></div>
                  <div className="detail"><span>By</span><strong>{order.doctor?.user?.name}</strong></div>
                  <div className="detail"><span>Priority</span><strong>{order.priority}</strong></div>
                  <div className="detail"><span>Turnaround</span><strong>{order.test?.turnaroundHours}h</strong></div>
                </div>
                <div className="notice notice--info">
                  <span className="spinner" />
                  <div>{order.status === 'ORDERED' ? 'Waiting for sample collection at the laboratory.' : 'Sample received — analysis in progress.'}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {completed.length ? (
        <section className="stack">
          <h3>Results</h3>
          <div className="split split--even">
            {completed.map((order) => (
              <article className="card" key={order.id}>
                <div className="card__head">
                  <div><h3>{order.test?.name}</h3><p className="muted">Reported {dateTime(order.completedAt)}</p></div>
                  <Badge status="completed" />
                </div>
                <div className="lab-result">
                  <div>
                    <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Result</span>
                    <div className="lab-result__value">{order.resultValue} <span style={{ fontSize: 14, fontWeight: 500 }}>{order.resultUnit || ''}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reference</span>
                    <div className="lab-result__range">{order.referenceRange || '—'}</div>
                  </div>
                </div>
                {order.remarks ? <p className="record__notes">{order.remarks}</p> : null}
                <p className="muted" style={{ fontSize: 11 }}>Ordered by {order.doctor?.user?.name} · technician {order.technician || '—'}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
