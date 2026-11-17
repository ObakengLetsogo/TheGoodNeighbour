import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateShort, displayPhone, zar } from '../format';

const FILTERS: [string, string][] = [['', 'All'], ['pending_review', 'Pending Review'], ['approved', 'Approved'], ['active', 'Active'], ['lapsed', 'Lapsed'], ['declined', 'Declined'], ['cancelled', 'Cancelled']];

export function PoliciesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.policies(status), [status]);

  return (
    <>
      <div className="page-head"><h1>Policies</h1></div>
      <div className="chips" role="group" aria-label="Filter by status">
        {FILTERS.map(([v, l]) => <button key={v} className={`chip${v === status ? ' on' : ''}`} onClick={() => setParams(v ? { status: v } : {})}>{l}</button>)}
      </div>
      <Card tab={`${data?.length ?? 0} policies`}>
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No policies here yet.</Empty> : (
          <table>
            <thead><tr><th>Reference</th><th>Customer</th><th className="num">Bundle worth</th><th>Status</th><th className="num">Monthly</th><th className="num">Family</th><th>Applied</th></tr></thead>
            <tbody>
              {data.map(({ policy: p, customer: c }) => (
                <tr key={p.id} className="click" tabIndex={0} onClick={() => navigate(`/policies/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/policies/${p.id}`)}>
                  <td><strong>{p.reference}</strong></td>
                  <td>{p.holder.name}<div className="muted small">{c ? displayPhone(c.phone) : ''}</div></td>
                  <td className="num">{zar(p.bundle.bundleValueCents)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="num">{zar(p.monthlyTotalCents)}</td>
                  <td className="num">{p.members.length}</td>
                  <td>{dateShort(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
