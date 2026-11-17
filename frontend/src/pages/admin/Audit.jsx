import { useState } from 'react';
import { auditApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { Empty, ErrorState, Loader, PageHead, SearchBar } from '../../components/ui';
import { dateTime } from '../../utils/format';

export default function AdminAudit() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [query, setQuery] = useState({ actor: '', action: '', entity: '' });

  const { data, loading, error, refetch } = useApi(
    () => auditApi.list({ ...query, limit: 300 }),
    [query]
  );
  const logs = data || [];

  const apply = () => setQuery({ actor: actor.trim(), action: action.trim(), entity: entity.trim() });

  return (
    <div className="page">
      <PageHead
        eyebrow="Governance"
        title="Audit trail"
        description="Every sensitive action is written here by a Spring AOP aspect — who did what, to which record, from where."
      />

      <div className="toolbar">
        <div className="toolbar__group">
          <SearchBar value={actor} onChange={setActor} onSubmit={apply} placeholder="Actor name" />
          <input style={{ maxWidth: 180 }} value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action e.g. BOOK_APPOINTMENT" />
          <input style={{ maxWidth: 160 }} value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Entity e.g. Invoice" />
          <button type="button" className="btn btn--primary btn--sm" onClick={apply}>Filter</button>
          {(query.actor || query.action || query.entity) ? (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setActor(''); setAction(''); setEntity(''); setQuery({ actor: '', action: '', entity: '' }); }}>Clear</button>
          ) : null}
        </div>
        <button type="button" className="btn btn--sm" onClick={refetch}>Refresh</button>
      </div>

      {loading ? <Loader label="Loading audit entries…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && logs.length === 0 ? <Empty icon="file" title="No audit entries match" message="Try clearing the filters." /> : null}

      {!loading && !error && logs.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="When">{dateTime(entry.createdAt)}</td>
                  <td data-label="Actor">
                    <strong>{entry.actorName}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>{entry.actorRole}</span>
                  </td>
                  <td data-label="Action"><code>{entry.action}</code></td>
                  <td data-label="Entity">
                    {entry.entityType}
                    <span className="muted" style={{ display: 'block', fontSize: 11 }}>#{entry.entityId || '—'}</span>
                  </td>
                  <td data-label="Details"><span className="muted" style={{ fontSize: 12 }}>{entry.details || '—'}</span></td>
                  <td data-label="IP"><span className="muted" style={{ fontSize: 11 }}>{entry.ipAddress || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
