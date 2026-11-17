import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { dateTime, zar } from '../format';

export function DashboardPage() {
  const d = useLoad(api.dashboard);
  const audit = useLoad(api.audit);
  return (
    <>
      <div className="page-head"><h1>Good day, <span className="serif">team</span>.</h1></div>
      {d.loading ? <Loading /> : d.error ? <ErrorBox message={d.error} onRetry={d.reload} /> : d.data && (
        <div className="grid stats">
          <Stat tab="To review" accent="ember" n={d.data.pendingReview} l="Applications waiting" to="/policies?status=pending_review" />
          <Stat tab="Awaiting payment" accent="gold" n={d.data.approvedAwaitingPayment} l="Approved, not yet paid" to="/policies?status=approved" />
          <Stat tab="Active" n={d.data.active} l="Active policies" to="/policies?status=active" />
          <Stat tab="Lapsed" accent="berry" n={d.data.lapsed} l="Need attention" to="/policies?status=lapsed" />
          <Stat tab="Claims" accent="berry" n={d.data.openClaims} l="Open claims" to="/claims" />
          <Card tab="Recurring" accent="olive"><div className="stat"><div className="n">{zar(d.data.monthlyRecurringCents)}</div><div className="l">Monthly premiums on active policies</div></div></Card>
        </div>
      )}
      <Card tab="Recent activity" accent="gold">
        {audit.loading ? <Loading /> : audit.error ? <p className="err">{audit.error}</p> : (audit.data ?? []).length === 0 ? <p className="muted">Nothing yet.</p> : (
          <table>
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead>
            <tbody>{(audit.data ?? []).slice(0, 8).map((e, i) => (
              <tr key={i}><td>{dateTime(e.at)}</td><td>{e.actor}</td><td>{e.action}</td><td className="muted small">{e.detail}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Stat({ tab, n, l, to, accent }: { tab: string; n: number; l: string; to: string; accent?: 'ember' | 'gold' | 'berry' }) {
  return (
    <Card tab={tab} accent={accent}>
      <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }}><div className="stat"><div className="n">{n}</div><div className="l">{l}</div></div></Link>
    </Card>
  );
}
