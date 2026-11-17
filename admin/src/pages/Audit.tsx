import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, useLoad } from '../components/ui';
import { dateTime } from '../format';

export function AuditPage() {
  const { data, error, loading, reload } = useLoad(api.audit);
  return (
    <>
      <div className="page-head"><div><h1>Audit Log</h1><p className="muted">The last 200 staff actions. Entries can't be edited.</p></div></div>
      <Card tab="Staff activity" accent="gold">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No activity yet.</Empty> : (
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Detail</th></tr></thead>
            <tbody>{data.map((e, i) => (
              <tr key={i}><td>{dateTime(e.at)}</td><td>{e.actor}</td><td><span className="badge">{e.action}</span></td><td className="muted small">{e.entityType} {e.entityId.slice(0, 8)}</td><td className="small">{e.detail}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}
