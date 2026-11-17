import { useState } from 'react';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { label, zar } from '../format';
import type { MemberRule, Plan } from '../types';

export function PlansPage() {
  const { data, error, loading, reload } = useLoad(api.plans);
  return (
    <>
      <div className="page-head">
        <div><h1>Plans &amp; Pricing</h1><p className="muted">Changes apply to new applications and members. Every change is audited. Pricing should follow your underwriter's rules.</p></div>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (data ?? []).map((p) => <PlanEditor key={p.id} plan={p} />)}
    </>
  );
}

const rand = (cents: number) => String(cents / 100);
const toCents = (v: string) => Math.round(Number(v) * 100);

function PlanEditor({ plan }: { plan: Plan }) {
  const [p, setP] = useState<Plan>(plan);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setP({ ...p, [k]: v });
  const rule = (i: number, patch: Partial<MemberRule>) => setP({ ...p, memberRules: p.memberRules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const save = async () => {
    setBusy(true); setMsg(undefined);
    try { setP(await api.updatePlan(p)); setMsg({ ok: true, text: 'Saved.' }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  return (
    <Card tab={`${p.name}${p.active ? '' : ' (hidden)'}`} accent={(['olive', 'ember', 'gold', 'berry'].includes(p.accent) ? p.accent : 'olive') as 'olive'}>
      <div className="form-grid">
        <label className="f">Name<input value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="f">Cover (rand)<input inputMode="decimal" value={rand(p.coverCents)} onChange={(e) => set('coverCents', toCents(e.target.value))} /></label>
        <label className="f">Monthly premium (rand)<input inputMode="decimal" value={rand(p.premiumCents)} onChange={(e) => set('premiumCents', toCents(e.target.value))} /></label>
        <label className="f">Waiting period (days)<input type="number" value={p.waitingPeriodDays} onChange={(e) => set('waitingPeriodDays', Number(e.target.value))} /></label>
        <label className="f">Min age<input type="number" value={p.minAge} onChange={(e) => set('minAge', Number(e.target.value))} /></label>
        <label className="f">Max age<input type="number" value={p.maxAge} onChange={(e) => set('maxAge', Number(e.target.value))} /></label>
      </div>
      <label className="f" style={{ marginTop: 14 }}>Description<textarea value={p.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
      <h3 style={{ margin: '18px 0 6px' }}>Family members</h3>
      <table>
        <thead><tr><th>Type</th><th>Monthly fee (rand)</th><th>Cover (rand)</th><th>Max</th><th>Min age</th><th>Max age</th></tr></thead>
        <tbody>{p.memberRules.map((r, i) => (
          <tr key={r.type}>
            <td>{label(r.type)}</td>
            <td><input inputMode="decimal" value={rand(r.feeCents)} onChange={(e) => rule(i, { feeCents: toCents(e.target.value) })} aria-label={`${r.type} fee`} /></td>
            <td><input inputMode="decimal" value={rand(r.coverCents)} onChange={(e) => rule(i, { coverCents: toCents(e.target.value) })} aria-label={`${r.type} cover`} /></td>
            <td><input type="number" value={r.maxCount} onChange={(e) => rule(i, { maxCount: Number(e.target.value) })} aria-label={`${r.type} max`} /></td>
            <td><input type="number" value={r.minAge} onChange={(e) => rule(i, { minAge: Number(e.target.value) })} aria-label={`${r.type} min age`} /></td>
            <td><input type="number" value={r.maxAge} onChange={(e) => rule(i, { maxAge: Number(e.target.value) })} aria-label={`${r.type} max age`} /></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="row" style={{ marginTop: 16 }}>
        <label className="row small"><input type="checkbox" style={{ width: 18, height: 18 }} checked={p.active} onChange={(e) => set('active', e.target.checked)} /> Available to customers</label>
        <span className="muted small">Currently {zar(p.premiumCents)} a month for {zar(p.coverCents)} cover</span>
        <div style={{ flex: 1 }} />
        {msg ? <span className={msg.ok ? 'ok-msg' : 'err'} role="status">{msg.text}</span> : null}
        <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </Card>
  );
}
