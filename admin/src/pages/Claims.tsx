import { useState } from 'react';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateShort, displayPhone } from '../format';
import { BundleList } from './Policy';
import type { Claim } from '../types';

const DOC_LABEL = { death_certificate: 'Death certificate', deceased_id: "Deceased's ID", other: 'Other' } as const;

const NEXT: Record<string, { status: string; label: string; needsNote?: boolean; tone?: 'danger' }[]> = {
  submitted: [{ status: 'under_review', label: 'Start Review' }, { status: 'declined', label: 'Decline…', needsNote: true, tone: 'danger' }],
  under_review: [{ status: 'approved', label: 'Approve' }, { status: 'declined', label: 'Decline…', needsNote: true, tone: 'danger' }],
  approved: [{ status: 'delivered', label: 'Mark As Delivered' }],
};

export function ClaimsPage() {
  const { data, error, loading, reload, setData } = useLoad(api.claims);
  const [open, setOpen] = useState<string>();
  const replace = (c: Claim) => setData((data ?? []).map((x) => (x.id === c.id ? c : x)));
  return (
    <>
      <div className="page-head"><h1>Claims</h1></div>
      <Card tab={`${data?.length ?? 0} claims`} accent="berry">
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? <Empty>No claims yet.</Empty> : (
          <table>
            <thead><tr><th>Reference</th><th>Deceased</th><th>Passed away</th><th>Cause</th><th>Policy</th><th>Status</th><th>Flags</th></tr></thead>
            <tbody>{data.map((c) => (
              <ClaimRows key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? undefined : c.id)} onChange={replace} />
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function ClaimRows({ c, open, onToggle, onChange }: { c: Claim; open: boolean; onToggle: () => void; onChange: (c: Claim) => void }) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<string>();
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const act = async (status: string) => {
    setBusy(true); setMsg(undefined);
    try { onChange(await api.setClaimStatus(c.id, status, note || undefined)); setPending(undefined); setNote(''); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <tr className="click" onClick={onToggle} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()} aria-expanded={open}>
        <td><strong>{c.reference}</strong></td><td>{c.deceasedName}</td><td>{dateShort(c.dateOfDeath)}</td><td>{c.causeOfDeath === 'accidental' ? 'Accident' : 'Natural'}</td><td>{c.policyReference}</td>
        <td><StatusBadge status={c.status} /></td>
        <td>{c.withinWaitingPeriod ? <span className="badge warn">{c.causeOfDeath === 'accidental' ? 'Before cover started' : 'Within waiting period'}</span> : null}{c.overAgeLimit ? <span className="badge bad" style={{ marginLeft: 6 }}>Over age limit</span> : null}</td>
      </tr>
      {open ? (
        <tr><td colSpan={7} style={{ background: 'var(--bg)' }}>
          <div className="grid two" style={{ marginBottom: 12 }}>
            <div>
              <h3>What to deliver (bundle version {c.bundle.version})</h3>
              <BundleList lines={c.bundle.lines} />
            </div>
            <div>
              <h3>Deliver to</h3>
              <dl className="dl" style={{ marginTop: 8 }}>
                <dt>Recipient</dt><dd>{c.delivery.recipientName} · {displayPhone(c.delivery.recipientPhone)}</dd>
                <dt>Address</dt><dd>{c.delivery.addressLine}, {c.delivery.suburb}<br />{c.delivery.city}, {c.delivery.province} {c.delivery.postalCode}</dd>
                {c.delivery.instructions ? <><dt>Instructions</dt><dd>{c.delivery.instructions}</dd></> : null}
              </dl>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <h3>Documents</h3>
            {c.documents.length === 0 ? <p className="muted">Nothing uploaded yet.</p> : (
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                {c.documents.map((d) => (
                  <li key={d.id}>{DOC_LABEL[d.type]}: {d.fileName} ({Math.max(1, Math.round(d.sizeBytes / 1024))} KB){' '}
                    <button className="ghost" onClick={() => api.openClaimDocument(c.id, d.id).catch((e) => setMsg(e.message))}>View</button></li>
                ))}
              </ul>
            )}
            {c.missingDocuments.length > 0 ? <p className="err">Still needed: {c.missingDocuments.map((t) => DOC_LABEL[t]).join(', ')}</p> : null}
          </div>
          <dl className="dl" style={{ marginBottom: 12 }}>
            <dt>Claimant</dt><dd>{c.claimantName} · {displayPhone(c.claimantPhone)}</dd>
            <dt>Submitted</dt><dd>{dateShort(c.createdAt)}</dd>
            {c.staffNote ? <><dt>Staff note</dt><dd>{c.staffNote}</dd></> : null}
          </dl>
          {pending ? (
            <div className="grid" style={{ gap: 10 }}>
              <label className="f">Reason (shown to the customer)<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <div className="row"><button className="danger" disabled={busy || note.trim().length < 3} onClick={() => act(pending)}>Confirm Decline</button><button className="ghost" onClick={() => setPending(undefined)}>Cancel</button></div>
            </div>
          ) : (
            <div className="row">
              {(NEXT[c.status] ?? []).map((a) => (
                <button key={a.status} className={a.tone === 'danger' ? 'danger' : ''} disabled={busy} onClick={() => (a.needsNote ? setPending(a.status) : act(a.status))}>{a.label}</button>
              ))}
              {!NEXT[c.status] ? <span className="muted">No further actions.</span> : null}
            </div>
          )}
          {msg ? <p className="err" role="alert">{msg}</p> : null}
        </td></tr>
      ) : null}
    </>
  );
}
