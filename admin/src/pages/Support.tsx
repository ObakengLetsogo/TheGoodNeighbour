import { useState } from 'react';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateTime, displayPhone, label } from '../format';
import type { SupportItem } from '../types';

const FILTERS: [string, string][] = [['', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['resolved', 'Resolved']];

export function SupportPage() {
  const { data, error, loading, reload, setData } = useLoad(api.support);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string>();
  const rows = (data ?? []).filter((r) => !status || r.status === status);
  const replace = (r: SupportItem) => setData((data ?? []).map((x) => (x.id === r.id ? r : x)));
  const openCount = (data ?? []).filter((r) => r.status === 'open').length;

  return (
    <>
      <div className="page-head"><div><h1>Support <span className="serif">Inbox</span></h1><p className="muted">Questions, problems and account deletion requests from customers. {openCount} open.</p></div></div>
      <div className="chips" role="group" aria-label="Filter by status">
        {FILTERS.map(([v, l]) => <button key={v} className={`chip${v === status ? ' on' : ''}`} onClick={() => setStatus(v)}>{l}</button>)}
      </div>
      <Card tab={`${rows.length} requests`} accent="berry">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty>Nothing here.</Empty> : (
          <table>
            <thead><tr><th>When</th><th>Type</th><th>Customer</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => <Rows key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? undefined : r.id)} onChange={replace} />)}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Rows({ r, open, onToggle, onChange }: { r: SupportItem; open: boolean; onToggle: () => void; onChange: (r: SupportItem) => void }) {
  const [note, setNote] = useState(r.staffNote ?? '');
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const act = async (status: string) => {
    setBusy(true); setMsg(undefined);
    try { onChange(await api.setSupportStatus(r.id, status, note || undefined)); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const deletion = r.kind === 'deletion_request';
  const cancel = r.kind === 'cancellation_request';
  const reinstate = r.kind === 'reinstatement_request';
  return (
    <>
      <tr className="click" onClick={onToggle} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()} aria-expanded={open}>
        <td>{dateTime(r.createdAt)}</td>
        <td><span className={`badge ${deletion || cancel ? 'bad' : reinstate ? 'ok' : ''}`}>{label(r.kind)}</span></td>
        <td>{r.customer?.fullName ?? 'Deleted customer'}<div className="muted small">{displayPhone(r.contactPhone)}</div></td>
        <td className="small" style={{ maxWidth: 360 }}>{r.message.length > 90 ? `${r.message.slice(0, 90)}…` : r.message}</td>
        <td><StatusBadge status={r.status} /></td>
      </tr>
      {open ? (
        <tr><td colSpan={5} style={{ background: 'var(--bg)' }}>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>{r.message}</p>
          <dl className="dl" style={{ marginBottom: 12 }}>
            <dt>Contact</dt><dd>{displayPhone(r.contactPhone)}{r.customer?.email ? ` · ${r.customer.email}` : ''}</dd>
            {r.reference ? <><dt>Reference</dt><dd>{r.reference}</dd></> : null}
          </dl>
          {cancel ? <p className="small" style={{ fontWeight: 600 }}>Open the policy ({r.reference}) to confirm the cancellation. Check whether it is inside the cooling-off period.</p> : null}
          {reinstate ? <p className="small" style={{ fontWeight: 600 }}>Lapsed cover. Record a payment on the policy ({r.reference}) to reinstate it, if it is inside the reinstatement period.</p> : null}
          {deletion ? <p className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>POPIA deletion request. Check what records must be kept (cover and claims), delete or anonymise the rest, and tell the customer the outcome. Record it in the note.</p> : null}
          <label className="f">Note<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="row" style={{ marginTop: 10 }}>
            {r.status !== 'in_progress' ? <button className="secondary" disabled={busy} onClick={() => act('in_progress')}>Start Working</button> : null}
            {r.status !== 'resolved' ? <button disabled={busy} onClick={() => act('resolved')}>Mark Resolved</button> : <button className="secondary" disabled={busy} onClick={() => act('open')}>Reopen</button>}
            {msg ? <span className="err" role="alert">{msg}</span> : null}
          </div>
        </td></tr>
      ) : null}
    </>
  );
}
