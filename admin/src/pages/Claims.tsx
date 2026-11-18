import { useState } from 'react';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateShort, displayPhone, zar } from '../format';
import { BundleList, WishLines } from './Policy';
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
  const [inError, setInError] = useState(false);
  const act = async (status: string) => {
    setBusy(true); setMsg(undefined);
    try { onChange(await api.setClaimStatus(c.id, status, note || undefined, status === 'declined' ? inError : undefined)); setPending(undefined); setNote(''); setInError(false); }
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
          {c.wishes ? <div style={{ marginBottom: 12 }}><h3>{c.deceasedName}'s funeral wishes</h3><WishLines w={c.wishes} /></div> : null}
          <div style={{ marginBottom: 12 }}>
            <h3>What the family receives</h3>
            <dl className="dl" style={{ marginTop: 8 }}>
              <dt>Their choice</dt><dd>{c.benefitChoice === 'cash' ? `Cash: ${zar(c.cashAlternativeCents)}` : 'The bundle (delivered)'}</dd>
              {c.ourCostCents != null ? <><dt>Our cost</dt><dd>{zar(c.ourCostCents)} <span className="muted small">· bundle worth {zar(c.bundle.bundleValueCents)} at shop prices · cash alternative {zar(c.cashAlternativeCents)}</span></dd></> : null}
            </dl>
          </div>
          {(c.status === 'approved' || c.status === 'delivered') && c.benefitChoice !== 'cash' ? <DeliveryPlan c={c} onChange={onChange} /> : null}
          {c.status === 'approved' && c.benefitChoice === 'cash' ? <p className="muted" style={{ marginBottom: 12 }}>The family chose cash. Call them to arrange the payment, then mark the claim as delivered once it has been paid.</p> : null}
          {pending ? (
            <div className="grid" style={{ gap: 10 }}>
              <label className="f">Reason (shown to the customer)<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <label className="row" style={{ gap: 8, alignItems: 'flex-start' }}><input type="checkbox" checked={inError} onChange={(e) => setInError(e.target.checked)} style={{ width: 'auto' }} />
                <span className="small">This claim was made in error and nobody has passed away. If you leave this unticked, the person's cover and premium end because they have died, even though the claim is declined.</span></label>
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

const WINDOWS: [string, string][] = [['day', 'Some time during the day'], ['morning', 'In the morning'], ['afternoon', 'In the afternoon']];

/** Staff pick the day the family can expect the bundle. The family sees it in the app. */
function DeliveryPlan({ c, onChange }: { c: Claim; onChange: (c: Claim) => void }) {
  const [date, setDate] = useState(c.deliveryDate ?? '');
  const [window, setWindow] = useState<string>(c.deliveryWindow ?? 'day');
  const [note, setNote] = useState(c.deliveryNote ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  if (c.status === 'delivered') return <p className="muted" style={{ marginBottom: 12 }}>Delivered{c.deliveredAt ? ` on ${dateShort(c.deliveredAt)}` : ''}{c.deliveryDate ? ` (planned for ${dateShort(c.deliveryDate)})` : ''}.</p>;
  const save = async () => {
    setBusy(true); setMsg(undefined);
    try { onChange(await api.scheduleDelivery(c.id, date, window, note || undefined)); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <h3>Delivery plan</h3>
      <p className="muted small">The family sees this in the app. Call them first to agree the day.</p>
      <div className="grid two" style={{ marginTop: 8 }}>
        <label className="f">Delivery date<input type="date" value={date} min={new Date().toLocaleDateString('en-CA')} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="f">Time of day<select value={window} onChange={(e) => setWindow(e.target.value)}>{WINDOWS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      <label className="f" style={{ marginTop: 8 }}>Note for the family (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></label>
      <div className="row" style={{ marginTop: 8 }}><button disabled={busy || !date} onClick={save}>{c.deliveryDate ? 'Update Delivery Plan' : 'Save Delivery Plan'}</button>{c.deliveryDate ? <span className="muted small">Planned for {dateShort(c.deliveryDate)}</span> : null}</div>
      {msg ? <p className="err" role="alert">{msg}</p> : null}
    </div>
  );
}
