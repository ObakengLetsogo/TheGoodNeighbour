import { useState } from 'react';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { label, zar } from '../format';
import type { BenefitItem, CoverConfig, RelationshipRule } from '../types';

export function CoverPage() {
  const cfg = useLoad(api.cover);
  const items = useLoad(api.benefits);
  return (
    <>
      <div className="page-head">
        <div><h1>Cover &amp; <span className="serif">Pricing</span></h1>
          <p className="muted">Everything that decides what customers pay and what they can build. Changes apply to new applications and changes. Every change is audited. Final numbers should come from your underwriter.</p></div>
      </div>
      {cfg.loading ? <Loading /> : cfg.error ? <ErrorBox message={cfg.error} onRetry={cfg.reload} /> : cfg.data && <ConfigEditor initial={cfg.data} />}
      <h2 style={{ marginTop: 34 }}>Bundle items</h2>
      <p className="muted small">What customers can include. <strong>Value</strong> is what the family receives and is shown to customers. <strong>Cost</strong> is what it costs the company, drives the premium, and is never shown to customers.</p>
      {items.loading ? <Loading /> : items.error ? <ErrorBox message={items.error} onRetry={items.reload} /> : (items.data ?? []).map((i) => <ItemEditor key={i.id} initial={i} />)}
    </>
  );
}

const cents = (v: string) => Math.round(Number(v) * 100);
const rand = (c: number) => String(c / 100);

function ConfigEditor({ initial }: { initial: CoverConfig }) {
  const [c, setC] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CoverConfig>(k: K, v: CoverConfig[K]) => setC({ ...c, [k]: v });
  const num = (k: keyof CoverConfig, l: string, hint?: string) => (
    <label className="f">{l}<input type="number" value={c[k] as number} onChange={(e) => set(k, Number(e.target.value) as never)} />{hint ? <span className="muted small">{hint}</span> : null}</label>
  );
  const rule = (i: number, patch: Partial<RelationshipRule>) => set('relationships', c.relationships.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = async () => {
    setBusy(true); setMsg(undefined);
    try { setC(await api.updateCover(c)); setMsg({ ok: true, text: 'Saved.' }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  return (
    <>
      <Card tab="Pricing" accent="gold">
        <div className="form-grid">
          <label className="f">Monthly rate (% of bundle cost)
            <input inputMode="decimal" value={c.baseRateBps / 100} onChange={(e) => set('baseRateBps', Math.round(Number(e.target.value) * 100))} />
            <span className="muted small">The main member's monthly price is the bundle's cost × this rate.</span></label>
          <label className="f">Minimum bundle value (rand)<input inputMode="decimal" value={rand(c.minBundleValueCents)} onChange={(e) => set('minBundleValueCents', cents(e.target.value))} /></label>
          {num('escalationCapBps', 'Yearly increase cap (basis points)', `${c.escalationCapBps / 100}% maximum`)}
        </div>
      </Card>
      <Card tab="Waiting periods &amp; billing" accent="ember">
        <div className="form-grid">
          {num('naturalWaitingDays', 'Natural causes (days)')}
          {num('accidentalWaitingDays', 'Accidents (days)')}
          {num('upgradeWaitingDays', 'After an upgrade (days)')}
          {num('lapseAfterMissedPayments', 'Lapse after missed payments')}
          {num('reinstateWithinDays', 'Reinstate within (days)')}
        </div>
      </Card>
      <Card tab="Who can be covered" accent="berry">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          {num('mainMinAge', 'Main member min age')}{num('mainMaxAge', 'Main member max age')}{num('mainCoverEndAge', 'Main member cover ends at')}
          {num('maxMembers', 'Max family members')}
        </div>
        <table>
          <thead><tr><th>Relationship</th><th>Fee (% of main member's price)</th><th>Join from</th><th>Join up to</th><th>Cover ends at</th><th>Max</th></tr></thead>
          <tbody>{c.relationships.map((r, i) => (
            <tr key={r.relationship}>
              <td><strong>{label(r.relationship)}</strong></td>
              <td><input inputMode="decimal" value={r.multiplierBps / 100} onChange={(e) => rule(i, { multiplierBps: Math.round(Number(e.target.value) * 100) })} aria-label={`${r.relationship} fee percent`} /></td>
              <td><input type="number" value={r.minAge} onChange={(e) => rule(i, { minAge: Number(e.target.value) })} aria-label={`${r.relationship} min age`} /></td>
              <td><input type="number" value={r.maxAge} onChange={(e) => rule(i, { maxAge: Number(e.target.value) })} aria-label={`${r.relationship} max age`} /></td>
              <td><input type="number" value={r.coverEndAge} onChange={(e) => rule(i, { coverEndAge: Number(e.target.value) })} aria-label={`${r.relationship} cover end age`} /></td>
              <td><input type="number" value={r.maxCount} onChange={(e) => rule(i, { maxCount: Number(e.target.value) })} aria-label={`${r.relationship} max count`} /></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      <Card tab="Herd" accent="olive">
        <div className="form-grid">
          {num('maxCommitmentMultiple', 'Animals we may promise per animal on the farm', 'Few covers claim at once, so one animal can back many promises. Lower this to be more cautious.')}
        </div>
      </Card>
      <div className="row" style={{ marginTop: 18 }}>
        <div style={{ flex: 1 }} />
        {msg ? <span className={msg.ok ? 'ok-msg' : 'err'} role="status">{msg.text}</span> : null}
        <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Cover Rules'}</button>
      </div>
    </>
  );
}

function ItemEditor({ initial }: { initial: BenefitItem }) {
  const [i, setI] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BenefitItem>(k: K, v: BenefitItem[K]) => setI({ ...i, [k]: v });
  const save = async () => {
    setBusy(true); setMsg(undefined);
    try { setI(await api.updateBenefit(i)); setMsg({ ok: true, text: 'Saved.' }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const livestock = i.kind === 'livestock';
  return (
    <Card tab={`${i.name}${i.active ? '' : ' (hidden)'}`} accent={livestock ? (i.id === 'cattle' ? 'berry' : 'ember') : 'gold'}>
      <div className="form-grid">
        <label className="f">Name<input value={i.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="f">Value to the family (rand)<input inputMode="decimal" value={rand(i.valueCents)} onChange={(e) => set('valueCents', cents(e.target.value))} /></label>
        <label className="f">Cost to the company (rand)<input inputMode="decimal" value={rand(i.costCents)} onChange={(e) => set('costCents', cents(e.target.value))} /></label>
        <label className="f">Most a customer can choose<input type="number" value={i.maxQty} onChange={(e) => set('maxQty', Number(e.target.value))} /></label>
        {livestock ? <label className="f">Animals on the farm<input type="number" value={i.onFarm ?? 0} onChange={(e) => set('onFarm', Number(e.target.value))} /></label> : null}
      </div>
      <label className="f" style={{ marginTop: 12 }}>Description<input value={i.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
      {!livestock ? (
        <label className="f" style={{ marginTop: 12 }}>What's in it (one line per item, shown to customers)
          <textarea style={{ height: 160 }} value={i.contents.join('\n')} onChange={(e) => set('contents', e.target.value.split('\n').filter((l) => l.trim()))} />
        </label>
      ) : null}
      <div className="row" style={{ marginTop: 14 }}>
        <label className="row small"><input type="checkbox" style={{ width: 18, height: 18 }} checked={i.active} onChange={(e) => set('active', e.target.checked)} /> Available to customers</label>
        <span className="muted small">Margin on value: {i.valueCents ? Math.round(((i.valueCents - i.costCents) / i.valueCents) * 100) : 0}% · {zar(i.valueCents)} worth, {zar(i.costCents)} cost</span>
        <div style={{ flex: 1 }} />
        {msg ? <span className={msg.ok ? 'ok-msg' : 'err'} role="status">{msg.text}</span> : null}
        <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Item'}</button>
      </div>
    </Card>
  );
}
