import { useState, type ChangeEvent } from 'react';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, useLoad } from '../components/ui';
import { zar } from '../format';
import { bestPrices, costItems, marginPct, parseQuoteSheet, type Quote } from '../lib/supplierPrices';

const ECON_KEY = 'tgn.admin.economics.v1';

/** Upload the filled-in quote sheet to see what each hamper, sheep and cow really costs us, then apply the costs to the catalogue. */
export function SupplierPricesPage() {
  const { data: items, error, loading, reload } = useLoad(api.benefits);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error || !items) return <ErrorBox message={error ?? 'Could not load the catalogue.'} onRetry={reload} />;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = parseQuoteSheet(await f.text());
    setQuotes(parsed.quotes); setProblems(parsed.problems); setFileName(f.name); setPicked(new Set()); setMsg(undefined);
  };

  const costs = costItems(items, quotes);
  const payment = bestPrices(quotes, 'Payment');
  const collectionFee = payment.get('fee per successful collection');
  const failedFee = payment.get('fee per failed collection');
  const hamper5 = costs.find((c) => c.item.id === 'grocery-5000');
  const sheep = costs.find((c) => c.item.id === 'sheep');
  const typical = hamper5?.costRand != null && sheep?.costRand != null ? hamper5.costRand + sheep.costRand : null;

  const toggle = (id: string) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };
  const apply = async () => {
    const chosen = costs.filter((c) => picked.has(c.item.id) && c.costRand != null);
    if (chosen.length === 0) return;
    const unwritten = chosen.filter((c) => !c.allWritten).length;
    if (!window.confirm(`Update the cost of ${chosen.length} item${chosen.length === 1 ? '' : 's'}?\n\nThis changes the price customers see, because their monthly price follows what each item costs us. It is recorded in the audit log.${unwritten ? `\n\n${unwritten} of these use prices that are not in writing.` : ''}`)) return;
    setBusy(true); setMsg(undefined);
    try {
      for (const c of chosen) await api.updateBenefit({ ...c.item, costCents: Math.round(c.costRand! * 100) });
      setMsg({ ok: true, text: `Updated the cost of ${chosen.length} item${chosen.length === 1 ? '' : 's'}.` });
      setPicked(new Set()); reload();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  const toModel = (patch: Record<string, number>, text: string) => {
    try { const cur = JSON.parse(localStorage.getItem(ECON_KEY) ?? '{}'); localStorage.setItem(ECON_KEY, JSON.stringify({ ...cur, ...patch })); setMsg({ ok: true, text }); }
    catch { setMsg({ ok: false, text: 'Could not save to the profit model on this browser.' }); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Supplier <span className="serif">Prices</span></h1>
        <p className="muted">Upload the filled-in quote sheet. We work out what each hamper, sheep and cow really costs, using the lowest price for each part (prices in writing count first).</p></div></div>

      <Card tab="Upload" accent="gold">
        <label className="f">Quote sheet (CSV)<input type="file" accept=".csv,text/csv" onChange={onFile} /></label>
        {fileName ? <p className="muted small">{fileName}: {quotes.length} prices read{quotes.filter((q) => !q.written).length ? `, ${quotes.filter((q) => !q.written).length} not in writing` : ''}.</p> : <p className="muted small">The sheet is <code>docs/quote-sheet.csv</code>. Fill in the Unit price column (and "Written quote?" Y or N) for the rows you have.</p>}
        {problems.length ? <ul className="err">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      </Card>

      {quotes.length === 0 ? <Empty>Nothing uploaded yet. Until you do, the costs in the system are placeholders.</Empty> : (
        <>
          <Card tab="What each item costs us" accent="olive">
            <table>
              <thead><tr><th /><th>Item</th><th className="num">Now in the system</th><th className="num">From quotes</th><th className="num">Change</th><th className="num">Margin at shop prices</th><th>Status</th></tr></thead>
              <tbody>{costs.map((c) => (
                <tr key={c.item.id}>
                  <td><input type="checkbox" disabled={c.costRand == null} checked={picked.has(c.item.id)} onChange={() => toggle(c.item.id)} aria-label={`Select ${c.item.name}`} style={{ width: 'auto' }} /></td>
                  <td><strong>{c.item.name}</strong><div className="muted small">worth {zar(c.item.valueCents)}</div></td>
                  <td className="num">{zar(c.item.costCents)}</td>
                  <td className="num">{c.costRand != null ? zar(Math.round(c.costRand * 100)) : '–'}</td>
                  <td className="num">{c.costRand != null && c.item.costCents > 0 ? `${c.costRand * 100 >= c.item.costCents ? '+' : ''}${Math.round(((c.costRand * 100 - c.item.costCents) / c.item.costCents) * 100)}%` : '–'}</td>
                  <td className="num">{c.costRand != null ? `${marginPct(c.item.valueCents, c.costRand)}%` : '–'}</td>
                  <td>{c.costRand == null ? <span className="badge warn">Missing: {c.missing.slice(0, 3).join(', ')}{c.missing.length > 3 ? ` +${c.missing.length - 3} more` : ''}</span> : c.allWritten ? <span className="badge ok">Complete, in writing</span> : <span className="badge warn">Complete, not all in writing</span>}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="row" style={{ marginTop: 14 }}>
              <button disabled={busy || picked.size === 0} onClick={apply}>Apply Selected Costs</button>
              <span className="muted small">Only items with every part priced can be applied. This changes customer prices and is audited.</span>
            </div>
            {msg ? <p className={msg.ok ? 'muted' : 'err'} role="status">{msg.text}</p> : null}
          </Card>

          <Card tab="Build-up" accent="ember">
            <p className="muted small">What each total is made of, so you can check the maths.</p>
            {costs.filter((c) => c.lines.some((l) => !l.missing)).map((c) => (
              <details key={c.item.id} style={{ marginBottom: 8 }}>
                <summary>{c.item.name}: {c.costRand != null ? zar(Math.round(c.costRand * 100)) : 'incomplete'}</summary>
                <table><tbody>{c.lines.map((l, i) => (
                  <tr key={i}><td>{l.label}</td><td className="num">{l.qty > 1 ? `× ${l.qty}` : ''}</td><td className="num">{l.missing ? <span className="err">no price</span> : zar(Math.round(l.unitPrice! * 100))}</td><td>{l.missing ? '' : l.written ? 'in writing' : 'not in writing'}</td></tr>
                ))}</tbody></table>
              </details>
            ))}
          </Card>

          <Card tab="Into the profit model" accent="berry">
            <ul style={{ display: 'grid', gap: 10 }}>
              {typical != null ? (
                <li className="row">A typical bundle (R5 000 hamper and one sheep) costs us <strong>{zar(Math.round(typical * 100))}</strong>.{' '}
                  <button className="secondary" onClick={() => toModel({ bundleCostRand: Math.round(typical) }, 'Set the cost of a delivered bundle in the profit model.')}>Use As Bundle Cost</button></li>
              ) : <li className="muted">Price every part of the R5 000 hamper and the sheep to get a typical bundle cost.</li>}
              {collectionFee ? (
                <li className="row">The payment provider charges <strong>{zar(Math.round(collectionFee.price * 100))}</strong> per collection{failedFee ? ` and ${zar(Math.round(failedFee.price * 100))} per failed one` : ''}.{' '}
                  <button className="secondary" onClick={() => toModel({ collectionFeeRand: collectionFee.price, ...(failedFee ? { failedFeeRand: failedFee.price } : {}) }, 'Set the payment fees in the profit model.')}>Use As Payment Fee</button></li>
              ) : <li className="muted">No payment provider price yet (the "Payment" rows in the sheet).</li>}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
