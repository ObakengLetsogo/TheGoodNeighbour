import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, useLoad } from '../components/ui';
import type { Herd } from '../types';

export function HerdPage() {
  const { data, error, loading, reload } = useLoad(api.herd);
  return (
    <>
      <div className="page-head">
        <div><h1>Herd &amp; <span className="serif">Capacity</span></h1>
          <p className="muted">Animals on the farm against animals promised to customers. When a limit is reached, customers can no longer choose that livestock. Update the herd counts and the promise limit under Cover &amp; Pricing.</p></div>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Card tab="Herd"><Empty>No livestock items yet.</Empty></Card> : (
        <div className="grid two">{data.map((h) => <HerdCard key={h.itemId} h={h} />)}</div>
      )}
    </>
  );
}

export function HerdCard({ h }: { h: Herd }) {
  const used = h.capacity ? Math.min(100, Math.round((h.promised / h.capacity) * 100)) : 100;
  const tone = used >= 90 ? 'var(--danger)' : used >= 70 ? 'var(--warning)' : 'var(--success)';
  return (
    <Card tab={h.name} accent={h.itemId === 'cattle' ? 'berry' : 'ember'}>
      <dl className="dl">
        <dt>On the farm</dt><dd>{h.onFarm}</dd>
        <dt>Promised to customers</dt><dd>{h.promised}</dd>
        <dt>We may promise up to</dt><dd>{h.capacity}</dd>
        <dt>Room left</dt><dd>{h.remaining}</dd>
      </dl>
      <div className="meter" role="img" aria-label={`${used}% of the promise limit used`}><div style={{ width: `${used}%`, background: tone }} /></div>
      <p className="muted small">{used}% of the promise limit used</p>
    </Card>
  );
}
