import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateShort, displayPhone } from '../format';

export function CustomersPage() {
  const { data, error, loading, reload } = useLoad(api.customers);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const rows = (data ?? []).filter((c) => !q.trim() || `${c.fullName} ${c.phone} ${c.email ?? ''} ${c.policyReference ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="page-head">
        <div><h1>Customers</h1><p className="muted">Everyone who has signed up, and their latest cover.</p></div>
        <label className="f" style={{ minWidth: 260 }}>Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email or reference" /></label>
      </div>
      <Card tab={`${rows.length} customers`} accent="gold">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty>No customers found.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Verified</th><th>Joined</th><th>Cover</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id} className={c.policyId ? 'click' : ''} onClick={() => c.policyId && navigate(`/policies/${c.policyId}`)}>
                <td><strong>{c.fullName}</strong></td><td>{displayPhone(c.phone)}</td><td className="small">{c.email ?? '–'}</td>
                <td>{c.phoneVerified ? <span className="badge ok">Verified</span> : <span className="badge warn">Not yet</span>}</td>
                <td>{dateShort(c.createdAt)}</td>
                <td>{c.policyReference ? <>{c.policyReference} <StatusBadge status={c.policyStatus ?? ''} /></> : <span className="muted">No cover</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}
