import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, useLoad } from '../components/ui';
import { dateShort, displayPhone, zar } from '../format';

const FILTERS: [string, string][] = [['all', 'Everyone'], ['behind', 'Behind'], ['lapse', 'Reached the limit'], ['soon', 'Due this week']];

export function CollectionsPage() {
  const { data, error, loading, reload } = useLoad(api.collections);
  const [filter, setFilter] = useState('all');
  const rows = (data?.rows ?? []).filter((r) => filter === 'all' || (filter === 'behind' && r.missed > 0) || (filter === 'lapse' && r.shouldLapse) || (filter === 'soon' && r.dueSoon));

  return (
    <>
      <div className="page-head"><div><h1>Collec<span className="serif">tions</span></h1>
        <p className="muted">Who is behind on payments and who is due this week. A cover counts as behind when it has received fewer payments than debit dates have passed. Lapsing stays your decision.</p></div></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data && (
        <>
          <div className="grid stats">
            <Card tab="Active" accent="olive"><div className="stat"><div className="n">{data.active}</div><div className="l">Active covers</div></div></Card>
            <Card tab="Behind" accent="ember"><div className="stat"><div className="n">{data.behind}</div><div className="l">Missed at least one payment</div></div></Card>
            <Card tab="Reached the limit" accent="berry"><div className="stat"><div className="n">{data.shouldLapse}</div><div className="l">{data.lapseAfter}+ missed. Consider lapsing</div></div></Card>
            <Card tab="Due this week" accent="gold"><div className="stat"><div className="n">{data.dueSoon}</div><div className="l">Worth {zar(data.dueSoonCents)}</div></div></Card>
            <Card tab="Owed" accent="berry" tint><div className="stat"><div className="n">{zar(data.owedCents)}</div><div className="l">Missed premiums to collect</div></div></Card>
          </div>
          <div className="chips" role="group" aria-label="Filter" style={{ marginTop: 24 }}>
            {FILTERS.map(([v, l]) => <button key={v} className={`chip${v === filter ? ' on' : ''}`} onClick={() => setFilter(v)}>{l}</button>)}
          </div>
          <Card tab={`${rows.length} covers`} accent="gold">
            {rows.length === 0 ? <Empty>{data.rows.length === 0 ? 'Everyone is up to date and nobody is due this week.' : 'Nothing matches that filter.'}</Empty> : (
              <table>
                <thead><tr><th>Cover</th><th>Customer</th><th>Monthly</th><th>Next debit</th><th>Missed</th><th>Owed</th><th /></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.policyId}>
                    <td><Link to={`/policies/${r.policyId}`}><strong>{r.reference}</strong></Link></td>
                    <td>{r.holderName}<div className="muted small"><a href={`tel:${r.phone}`}>{displayPhone(r.phone)}</a></div></td>
                    <td>{zar(r.monthlyCents)}<div className="muted small">on the {r.debitDay}th</div></td>
                    <td>{dateShort(r.nextDebitDate)}{r.dueSoon ? <span className="badge warn" style={{ marginLeft: 6 }}>This week</span> : null}</td>
                    <td>{r.missed > 0 ? <><span className={`badge ${r.shouldLapse ? 'bad' : 'warn'}`}>{r.missed} missed</span><div className="muted small">since {dateShort(r.oldestUnpaidSince)}</div></> : '–'}</td>
                    <td>{r.owedCents > 0 ? zar(r.owedCents) : '–'}</td>
                    <td><Link to={`/policies/${r.policyId}`}>{r.missed > 0 ? 'Record Payment Or Lapse' : 'Open'}</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
