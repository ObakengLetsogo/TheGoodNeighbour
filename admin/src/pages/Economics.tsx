import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { zar } from '../format';

/**
 * A simple unit-economics model. EVERY input below is an ASSUMPTION unless it is marked as coming from your data.
 * The defaults are placeholders so the page works; replace them with your underwriter's, your payment provider's
 * and your own farm and staff numbers. It is a planning tool, not a forecast.
 */
interface Inputs {
  customers: number;
  premiumRand: number;          // average monthly premium per cover
  claimRatePct: number;         // chance a cover has a claim in a year
  bundleCostRand: number;       // what a delivered bundle costs the company
  collectionFeeRand: number;    // payment provider fee per collection
  failedRatePct: number;        // share of collections that fail
  failedFeeRand: number;        // extra cost of a failed collection
  uncollectedPct: number;       // premium never collected (arrears, lapses)
  adminRand: number;            // support, admin and compliance cost per cover per month
  fixedRand: number;            // fixed monthly costs: salaries, tech, farm running costs, insurance
}

const DEFAULTS: Inputs = {
  customers: 100, premiumRand: 163, claimRatePct: 4, bundleCostRand: 5300, collectionFeeRand: 5, failedRatePct: 8,
  failedFeeRand: 5, uncollectedPct: 5, adminRand: 10, fixedRand: 25000,
};
const KEY = 'tgn.admin.economics.v1';

function model(i: Inputs) {
  const premium = i.premiumRand;
  const uncollected = premium * (i.uncollectedPct / 100);
  const claims = (i.claimRatePct / 100) * i.bundleCostRand / 12;
  const payments = i.collectionFeeRand + (i.failedRatePct / 100) * i.failedFeeRand;
  const contribution = premium - uncollected - claims - payments - i.adminRand;
  const revenue = premium * i.customers;
  const profit = contribution * i.customers - i.fixedRand;
  return { premium, uncollected, claims, payments, admin: i.adminRand, contribution, revenue, profit, breakEven: contribution > 0 ? Math.ceil(i.fixedRand / contribution) : null };
}

export function EconomicsPage() {
  const dash = useLoad(api.dashboard);
  const [i, setI] = useState<Inputs>(() => { try { const s = localStorage.getItem(KEY); return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS; } catch { return DEFAULTS; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(i)); } catch { /* ignore */ } }, [i]);
  const m = useMemo(() => model(i), [i]);
  const set = (k: keyof Inputs, v: number) => setI({ ...i, [k]: Number.isFinite(v) ? v : 0 });

  if (dash.loading) return <Loading />;
  if (dash.error) return <ErrorBox message={dash.error} onRetry={dash.reload} />;
  const active = dash.data?.active ?? 0;
  const actualAvg = active > 0 ? Math.round(dash.data!.monthlyRecurringCents / active) / 100 : null;

  const num = (k: keyof Inputs, label: string, hint: string, step = 1) => (
    <label className="f">{label}<input type="number" step={step} value={i[k]} onChange={(e) => set(k, Number(e.target.value))} /><span className="muted small">{hint}</span></label>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Profit <span className="serif">Model</span></h1>
          <p className="muted">What each cover earns and costs, and how many customers you need to break even.</p></div>
      </div>
      <div className="notice warn" role="note"><strong>Assumptions, not forecasts.</strong> Apart from the figures marked "from your data", every number here is a placeholder. Replace them with your underwriter's claims figures, your payment provider's quote, and your own farm, staff and compliance costs before showing this to anyone.</div>

      <div className="grid two">
        <Card tab="Your cover" accent="olive">
          <div className="form-grid">
            {num('customers', 'Customers (covers)', actual(active))}
            {num('premiumRand', 'Average monthly premium (R)', actualAvg ? `From your data: ${zar(actualAvg * 100)} across ${active} active covers` : 'No active covers yet', 0.01)}
            {num('bundleCostRand', 'Cost of one delivered bundle (R)', 'Assumption. Include animal, transport, preparation if you cover it, and losses.')}
          </div>
        </Card>
        <Card tab="Claims" accent="berry">
          <div className="form-grid">
            {num('claimRatePct', 'Chance of a claim, per cover per year (%)', 'Assumption. Ask your underwriter. It depends heavily on ages.', 0.1)}
          </div>
          <p className="muted small">Each claim delivers one bundle, whoever on the cover passes away.</p>
        </Card>
        <Card tab="Payments" accent="gold">
          <div className="form-grid">
            {num('collectionFeeRand', 'Provider fee per collection (R)', 'Assumption. Get a written quote.', 0.1)}
            {num('failedRatePct', 'Collections that fail (%)', 'Assumption.', 0.5)}
            {num('failedFeeRand', 'Extra cost of a failed collection (R)', 'Assumption.', 0.1)}
            {num('uncollectedPct', 'Premium never collected (%)', 'Assumption: arrears and lapses.', 0.5)}
          </div>
        </Card>
        <Card tab="Running costs" accent="ember">
          <div className="form-grid">
            {num('adminRand', 'Admin per cover per month (R)', 'Assumption: support, SMS, compliance.', 0.5)}
            {num('fixedRand', 'Fixed costs per month (R)', 'Assumption: salaries, tech, farm running costs, insurance, accounting.', 500)}
          </div>
        </Card>
      </div>

      <Card tab="Per cover, per month" accent="olive" tint>
        <table>
          <tbody>
            <Row label="Premium" value={m.premium} />
            <Row label="Premium not collected" value={-m.uncollected} />
            <Row label="Expected claims (bundle cost × claim chance ÷ 12)" value={-m.claims} />
            <Row label="Payment provider costs" value={-m.payments} />
            <Row label="Admin" value={-m.admin} />
            <Row label="Left over to cover fixed costs and profit" value={m.contribution} bold />
          </tbody>
        </table>
      </Card>

      <div className="grid stats" style={{ marginTop: 6 }}>
        <Card tab="Monthly income" accent="gold" tint><div className="stat"><div className="n">{zar(m.revenue * 100)}</div><div className="l">{i.customers} covers</div></div></Card>
        <Card tab={m.profit >= 0 ? 'Monthly profit' : 'Monthly loss'} accent={m.profit >= 0 ? 'olive' : 'berry'} tint><div className="stat"><div className="n">{zar(m.profit * 100)}</div><div className="l">After fixed costs</div></div></Card>
        <Card tab="Break-even" accent="ember" tint><div className="stat"><div className="n">{m.breakEven ?? '–'}</div><div className="l">covers needed</div></div></Card>
      </div>

      <Card tab="What if you had…" accent="gold">
        <table>
          <thead><tr><th className="num">Covers</th><th className="num">Monthly income</th><th className="num">Left after variable costs</th><th className="num">Monthly profit</th></tr></thead>
          <tbody>{[50, 100, 250, 500, 1000, 2500].map((n) => {
            const s = model({ ...i, customers: n });
            return <tr key={n}><td className="num">{n}</td><td className="num">{zar(s.revenue * 100)}</td><td className="num">{zar(s.contribution * n * 100)}</td><td className="num" style={{ color: s.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{zar(s.profit * 100)}</td></tr>;
          })}</tbody>
        </table>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="secondary" onClick={() => setI(DEFAULTS)}>Reset To Placeholders</button>
          {actualAvg ? <button className="secondary" onClick={() => setI({ ...i, customers: active, premiumRand: actualAvg })}>Use My Real Customers And Premium</button> : null}
        </div>
      </Card>
    </>
  );
}

const actual = (n: number) => `From your data: ${n} active ${n === 1 ? 'cover' : 'covers'} today`;

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <tr><td style={bold ? { fontWeight: 800 } : undefined}>{label}</td><td className="num" style={bold ? { fontWeight: 800 } : undefined}>{zar(Math.round(value * 100))}</td></tr>;
}
