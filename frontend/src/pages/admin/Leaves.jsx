import { useState } from 'react';
import { doctorApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import { Avatar, Badge, Empty, ErrorState, Loader, PageHead, Tabs } from '../../components/ui';
import { date } from '../../utils/format';

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function AdminLeaves() {
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const { data, loading, error, refetch } = useApi(() => doctorApi.allLeaves(), []);
  const leaves = (data || []).filter((leave) => leave.status === status);

  const decide = async (leave, decision) => {
    try {
      await doctorApi.decideLeave(leave.id, decision);
      toast.success(`Leave ${decision.toLowerCase()}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const days = (leave) => {
    const ms = new Date(leave.endDate) - new Date(leave.startDate);
    return Math.floor(ms / 86_400_000) + 1;
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Rota management"
        title="Leave requests"
        description="Approved leave blocks new bookings for that consultant on those dates."
      />

      <Tabs tabs={TABS} value={status} onChange={setStatus} />

      {loading ? <Loader label="Loading leave requests…" /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {!loading && !error && leaves.length === 0 ? <Empty icon="clock" title={`No ${status.toLowerCase()} requests`} message="Requests from consultants appear here for approval." /> : null}

      {!loading && !error && leaves.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Consultant</th><th>Dates</th><th>Duration</th><th>Reason</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id}>
                  <td data-label="Consultant">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={leave.doctor?.user?.name} />
                      <div>
                        <strong>{leave.doctor?.user?.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{leave.doctor?.department?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Dates">{date(leave.startDate)} → {date(leave.endDate)}</td>
                  <td data-label="Duration">{days(leave)} day{days(leave) > 1 ? 's' : ''}</td>
                  <td data-label="Reason"><span className="muted" style={{ fontSize: 12 }}>{leave.reason}</span></td>
                  <td data-label="Status"><Badge status={leave.status.toLowerCase()} /></td>
                  <td data-label="Actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                      {leave.status === 'PENDING' ? (
                        <>
                          <button type="button" className="btn btn--sm btn--success" onClick={() => decide(leave, 'APPROVED')}>Approve</button>
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => decide(leave, 'REJECTED')}>Reject</button>
                        </>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>Decided {date(leave.createdAt)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
