import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui';
import { dateShort, displayPhone, label, ordinal, today, zar } from '../format';
import type { AdminPolicy, BundleLine } from '../types';

export function PolicyPage() {
  const { id = '' } = useParams();
  const { data, error, loading, reload, setData } = useLoad(() => api.policy(id), [id]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  return <Detail value={data} onChange={setData} />;
}

function Detail({ value, onChange }: { value: AdminPolicy; onChange: (p: AdminPolicy) => void }) {
  const { policy: p, customer: c } = value;
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [pay, setPay] = useState({ amount: String(p.monthlyTotalCents / 100), paidOn: today(), reference: '' });

  const run = async (fn: () => Promise<AdminPolicy>, ok: string) => {
    setBusy(true); setMsg(undefined);
    try { onChange(await fn()); setMsg({ ok: true, text: ok }); setDeclining(false); setReason(''); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(pay.amount) * 100);
    if (!cents || cents <= 0) return setMsg({ ok: false, text: 'Enter the amount received.' });
    run(() => api.recordPayment(p.id, cents, pay.paidOn, pay.reference), 'Payment recorded.');
  };

  const canPay = ['approved', 'active', 'lapsed'].includes(p.status);

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/policies" className="small">← Policies</Link>
          <h1>{p.reference} <StatusBadge status={p.status} /></h1>
          <p className="muted">{zar(p.bundle.bundleValueCents)} bundle · {zar(p.monthlyTotalCents)} a month · applied {dateShort(p.createdAt)}</p>
        </div>
      </div>
      {msg ? <p className={msg.ok ? 'ok-msg' : 'err'} role="status">{msg.text}</p> : null}

      <div className="grid two">
        <Card tab="Customer">
          <dl className="dl">
            <dt>Name</dt><dd>{c?.fullName ?? p.holder.name}</dd>
            <dt>Mobile</dt><dd>{c ? displayPhone(c.phone) : '–'}</dd>
            <dt>Email</dt><dd>{c?.email ?? '–'}</dd>
            <dt>ID number</dt><dd>{p.holder.idNumber}</dd>
            <dt>Date of birth</dt><dd>{dateShort(p.holder.dateOfBirth)}</dd>
          </dl>
          <p className="muted small">Full ID numbers are shown to staff only. Opening this page is recorded in the audit log.</p>
        </Card>
        <Card tab="Billing" accent="gold">
          <dl className="dl">
            <dt>Main member</dt><dd>{zar(p.baseMonthlyCents)}</dd>
            <dt>Every month</dt><dd>{zar(p.monthlyTotalCents)}</dd>
            <dt>Debit day</dt><dd>The {ordinal(p.debitDay)}</dd>
            <dt>Debit order</dt><dd>{label(p.mandateStatus)}</dd>
            <dt>Next debit</dt><dd>{dateShort(p.nextDebitDate)}</dd>
            <dt>Cover started</dt><dd>{dateShort(p.startDate)}</dd>
            <dt>Waiting ends</dt><dd>{dateShort(p.waitingEndsOn)}</dd>
            <dt>Accepted terms</dt><dd>{p.consentAt ? `v${p.termsVersion} / privacy v${p.privacyVersion} on ${dateShort(p.consentAt)}` : '–'}</dd>
          </dl>
        </Card>
      </div>

      <Card tab={`Bundle (version ${p.bundle.version})`} accent="ember">
        <BundleList lines={p.bundle.lines} />
        {p.bundle.upgradeWaitingEndsOn ? <p className="muted small">The increase in this version only applies to natural-cause claims from {dateShort(p.bundle.upgradeWaitingEndsOn)}. Before then the previous version applies.</p> : null}
        {p.bundleHistory.length > 1 ? (
          <details style={{ marginTop: 10 }}><summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Bundle history ({p.bundleHistory.length} versions)</summary>
            <table style={{ marginTop: 8 }}>
              <thead><tr><th>Version</th><th>From</th><th>Waiting ends</th><th className="num">Worth</th><th>Items</th></tr></thead>
              <tbody>{p.bundleHistory.map((v) => (
                <tr key={v.version}><td>{v.version}</td><td>{dateShort(v.effectiveFrom)}</td><td>{dateShort(v.upgradeWaitingEndsOn)}</td><td className="num">{zar(v.bundleValueCents)}</td><td className="small">{v.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}</td></tr>
              ))}</tbody>
            </table>
          </details>
        ) : null}
      </Card>

      <Card tab="Decision" accent="ember">
        {p.status === 'pending_review' ? (
          declining ? (
            <div className="grid" style={{ gap: 12 }}>
              <label className="f">Reason for declining (shown to the customer)<textarea value={reason} onChange={(e) => setReason(e.target.value)} /></label>
              <div className="row">
                <button className="danger" disabled={busy || reason.trim().length < 3} onClick={() => run(() => api.setPolicyStatus(p.id, 'declined', reason), 'Application declined.')}>Confirm Decline</button>
                <button className="ghost" onClick={() => setDeclining(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row">
              <button disabled={busy} onClick={() => run(() => api.setPolicyStatus(p.id, 'approved'), 'Application approved. Cover starts when the first payment is recorded.')}>Approve Application</button>
              <button className="danger" onClick={() => setDeclining(true)}>Decline…</button>
            </div>
          )
        ) : (
          <div className="row">
            {p.status === 'active' ? <button className="secondary" disabled={busy} onClick={() => confirm('Mark this policy as lapsed?') && run(() => api.setPolicyStatus(p.id, 'lapsed'), 'Marked as lapsed.')}>Mark As Lapsed</button> : null}
            {['approved', 'active', 'lapsed'].includes(p.status) ? <button className="danger" disabled={busy} onClick={() => confirm('Cancel this policy? This cannot be undone.') && run(() => api.setPolicyStatus(p.id, 'cancelled'), 'Policy cancelled.')}>Cancel Policy</button> : null}
            {!['approved', 'active', 'lapsed'].includes(p.status) ? <span className="muted">No further actions.</span> : null}
          </div>
        )}
      </Card>

      <Card tab={`Family (${p.members.length})`} accent="ember">
        {p.members.length === 0 ? <Empty>No family members on this plan.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Relationship to member</th><th>ID number</th><th>Born</th><th className="num">Monthly fee</th><th>Covered from</th></tr></thead>
            <tbody>{p.members.map((m) => (
              <tr key={m.id}><td>{m.fullName}</td><td>{label(m.relationship)}</td><td>{m.idNumber ?? '–'}</td><td>{dateShort(m.dateOfBirth)}</td><td className="num">{zar(m.feeCents)}</td><td>{dateShort(m.coverStartsOn)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      <Card tab="Payments" accent="gold">
        {p.payments.length === 0 ? <Empty>No payments recorded yet.</Empty> : (
          <table>
            <thead><tr><th>Paid on</th><th>Reference</th><th>Source</th><th>Status</th><th className="num">Amount</th></tr></thead>
            <tbody>{p.payments.map((x) => (
              <tr key={x.id}><td>{dateShort(x.paidOn)}</td><td>{x.reference}</td><td>{label(x.source)}</td><td><span className="badge money">{label(x.status)}</span></td><td className="num">{zar(x.amountCents)}</td></tr>
            ))}</tbody>
          </table>
        )}
        {canPay ? (
          <form onSubmit={submitPayment} style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <h3>Record a payment received</h3>
            <p className="muted small">Only record money that has actually arrived (e.g. an EFT). {p.status !== 'active' ? 'The first payment, covering the monthly total, starts cover.' : ''} This is audited.</p>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="f">Amount (rand)<input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
              <label className="f">Paid on<input type="date" max={today()} value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} /></label>
              <label className="f">Bank reference<input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} required /></label>
            </div>
            <button type="submit" disabled={busy || !pay.reference.trim()} style={{ marginTop: 14 }}>Record Payment</button>
          </form>
        ) : null}
      </Card>
    </>
  );
}

export function BundleList({ lines }: { lines: BundleLine[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {lines.map((l) => (
        <div key={l.itemId}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.name}</strong><span>{zar(l.valueCents)}</span>
          </div>
          {l.contents.length ? (
            <details><summary className="small muted" style={{ cursor: 'pointer' }}>Grocery list ({l.contents.length} items)</summary>
              <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 20 }}>{l.contents.map((c) => <li key={c}>{c}</li>)}</ul>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}
