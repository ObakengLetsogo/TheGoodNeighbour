import { useState } from 'react';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, useLoad } from '../components/ui';
import { dateTime, displayPhone } from '../format';

/** Spreadsheets run text that starts with = + - or @ as a formula. These values come from a public form, so defuse them. */
const csvCell = (v: string | null | undefined, validated = false) => {
  const t = (v ?? '').replace(/\r?\n/g, ' ');
  const safe = !validated && /^[=+\-@\t]/.test(t) ? `'${t}` : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function WaitlistPage() {
  const { data, error, loading, reload, setData } = useLoad(api.waitlist);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<string>();
  const rows = (data ?? []).filter((r) => !q || [r.firstName, r.phone, r.email, r.province].some((v) => (v ?? '').toLowerCase().includes(q.toLowerCase())));
  const byProvince = Object.entries((data ?? []).reduce<Record<string, number>>((m, r) => { const k = r.province || 'Not given'; m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the waiting list? This can't be undone.`)) return;
    setMsg(undefined);
    try { await api.removeWaitlist(id); setData((data ?? []).filter((r) => r.id !== id)); } catch (e) { setMsg((e as Error).message); }
  };
  const exportCsv = () => {
    const lines = ['First name,Mobile,Email,Province,Joined', ...(data ?? []).map((r) => [csvCell(r.firstName), csvCell(r.phone, true), csvCell(r.email), csvCell(r.province), csvCell(r.createdAt, true)].join(','))];
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `tgn-waiting-list-${new Date().toLocaleDateString('en-CA')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Waiting <span className="serif">List</span></h1><p className="muted">People who asked to hear when cover opens, from the website. They agreed to be contacted about this only.</p></div>
        <button className="secondary" onClick={exportCsv} disabled={!data?.length}>Export CSV</button>
      </div>
      {data?.length ? (
        <div className="chips" aria-label="By province">
          <span className="chip on">{data.length} total</span>
          {byProvince.map(([p, n]) => <span key={p} className="chip">{p}: {n}</span>)}
        </div>
      ) : null}
      <Card tab={`${rows.length} people`} accent="gold">
        <label className="f" style={{ maxWidth: 360, marginBottom: 12 }}>Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, number, email or province" /></label>
        {msg ? <p className="err" role="alert">{msg}</p> : null}
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty>{data?.length ? 'No one matches that search.' : 'No one has joined yet.'}</Empty> : (
          <table>
            <thead><tr><th>Joined</th><th>Name</th><th>Mobile</th><th>Email</th><th>Province</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{dateTime(r.createdAt)}</td><td>{r.firstName}</td><td>{r.phone ? displayPhone(r.phone) : '–'}</td><td>{r.email ?? '–'}</td><td>{r.province ?? '–'}</td>
                <td><button className="ghost" onClick={() => remove(r.id, r.firstName)}>Remove</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}
