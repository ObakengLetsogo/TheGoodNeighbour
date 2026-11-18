import { Fragment, useState, type ChangeEvent } from 'react';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { zar } from '../format';
import { bestPrices, costItems, marginPct, parseQuoteSheet, type Quote } from '../lib/supplierPrices';

const ECON_KEY = 'tgn.admin.economics.v1';

const Upload = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>;
const FileIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" /></svg>;
const Chevron = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

/** Upload the filled-in quote sheet to see what each hamper, sheep and cow really costs us, then apply the costs to the catalogue. */
export function SupplierPricesPage() {
  const { data: items, error, loading, reload } = useLoad(api.benefits);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string>();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error || !items) return <ErrorBox message={error ?? 'Could not load the catalogue.'} onRetry={reload} />;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = parseQuoteSheet(await f.text());
    setQuotes(parsed.quotes); setProblems(parsed.problems); setFileName(f.name); setPicked(new Set()); setMsg(undefined); setOpen(undefined);
    e.target.value = '';   // so the same file can be chosen again after editing it
  };

  const costs = costItems(items, quotes);
  const loaded = fileName != null;
  const written = quotes.filter((q) => q.written).length;
  const complete = costs.filter((c) => c.costRand != null).length;
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

  const fileInput = <input type="file" accept=".csv,text/csv" onChange={onFile} className="visually-hidden" />;

  return (
    <>
      <div className="page-head">
        <div><h1>Supplier <span className="serif">Prices</span></h1>
          <p className="muted">Upload your filled-in quote sheet to see what each hamper, sheep and cow really costs us.</p></div>
        <a className="btn secondary" href="/quote-sheet.csv" download="tgn-quote-sheet.csv">Download Blank Sheet</a>
      </div>

      {!loaded ? (
        <div className="drop" style={{ marginTop: 22 }}>
          <span className="ico"><Upload /></span>
          <h3>Upload your quote sheet</h3>
          <p className="muted">A CSV file. Fill in the <strong>Unit price</strong> column, and Y or N under <strong>Written quote</strong>, for every row you have a price for. We use the lowest price for each part, and prices in writing count first.</p>
          <label className="btn">{fileInput}<Upload />Choose Quote Sheet</label>
        </div>
      ) : (
        <Card accent="olive">
          <div className="filebar">
            <span className="ico"><FileIcon /></span>
            <div className="grow">
              <span className="name">{fileName}</span>
              <div className="row" style={{ gap: 8 }}>
                <span className="badge">{quotes.length} prices read</span>
                <span className={`badge ${written === quotes.length && quotes.length > 0 ? 'ok' : 'warn'}`}>{written} in writing</span>
                <span className={`badge ${complete > 0 ? 'ok' : ''}`}>{complete} of {costs.length} items fully priced</span>
              </div>
            </div>
            <label className="btn secondary">{fileInput}Replace File</label>
          </div>
          {problems.length ? <div className="notice bad" role="alert"><strong>Please check these rows</strong><ul className="plain" style={{ marginTop: 6 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul></div> : null}
        </Card>
      )}

      {loaded && quotes.length > 0 ? (
        <>
          <Card tab="What each item costs us" accent="olive">
            <table className="pricetable">
              <thead><tr><th /><th>Item</th><th className="num">In the system now</th><th className="num">From your quotes</th><th className="num">Change</th><th className="num">Margin</th><th>Status</th><th /></tr></thead>
              <tbody>{costs.map((c) => {
                const change = c.costRand != null && c.item.costCents > 0 ? Math.round(((c.costRand * 100 - c.item.costCents) / c.item.costCents) * 100) : null;
                const isOpen = open === c.item.id;
                return (
                  <Fragment key={c.item.id}>
                    <tr>
                      <td className="check"><input type="checkbox" disabled={c.costRand == null} checked={picked.has(c.item.id)} onChange={() => toggle(c.item.id)} aria-label={`Select ${c.item.name}`} /></td>
                      <td className="item"><strong>{c.item.name}</strong><span className="muted small">worth {zar(c.item.valueCents)} at shop prices</span></td>
                      <td className="num">{zar(c.item.costCents)}</td>
                      <td className="num">{c.costRand != null ? <strong>{zar(Math.round(c.costRand * 100))}</strong> : <span className="muted">–</span>}</td>
                      <td className="num">{change != null ? <span style={{ color: change > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{change > 0 ? '+' : ''}{change}%</span> : <span className="muted">–</span>}</td>
                      <td className="num">{c.costRand != null ? `${marginPct(c.item.valueCents, c.costRand)}%` : <span className="muted">–</span>}</td>
                      <td>{c.costRand == null
                        ? <span className="badge bad" title={`Still needs a price: ${c.missing.join(', ')}`}>{c.missing.length} {c.missing.length === 1 ? 'part' : 'parts'} missing</span>
                        : c.allWritten ? <span className="badge ok">Ready</span> : <span className="badge warn" title="Some of these prices are not in writing">Not all in writing</span>}</td>
                      <td className="toggle"><button className="iconbtn" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} how ${c.item.name} adds up`} onClick={() => setOpen(isOpen ? undefined : c.item.id)}><Chevron /></button></td>
                    </tr>
                    {isOpen ? (
                      <tr className="expand"><td colSpan={8}>
                        <table><tbody>{c.lines.map((l, i) => (
                          <tr key={i}>
                            <td>{l.label}{l.qty > 1 ? <span className="muted"> × {l.qty}</span> : null}</td>
                            <td className="num">{l.missing ? <span className="badge bad">no price</span> : zar(Math.round(l.unitPrice! * l.qty * 100))}</td>
                            <td className="muted">{l.missing ? '' : l.written ? 'in writing' : 'not in writing'}</td>
                          </tr>
                        ))}</tbody></table>
                      </td></tr>
                    ) : null}
                  </Fragment>
                );
              })}</tbody>
            </table>
            <div className="actionbar">
              <span className="muted small">{picked.size > 0 ? `${picked.size} selected. ` : ''}Only items with every part priced can be applied. Applying changes customer prices and is recorded in the audit log.</span>
              <button disabled={busy || picked.size === 0} onClick={apply}>Apply Selected Costs</button>
            </div>
            {msg ? <p className={msg.ok ? 'notice warn' : 'notice bad'} role="status" style={{ marginBottom: 0 }}>{msg.text}</p> : null}
          </Card>

          <Card tab="Into the profit model" accent="berry">
            <div className="kv">
              <div><div className="what">A typical bundle</div><div className="detail">{typical != null ? <>The R5 000 hamper and one sheep cost us <strong>{zar(Math.round(typical * 100))}</strong>.</> : 'Price every part of the R5 000 hamper and the sheep to see this.'}</div></div>
              <button className="secondary" disabled={typical == null} onClick={() => typical != null && toModel({ bundleCostRand: Math.round(typical) }, 'Set the cost of a delivered bundle in the profit model.')}>Use As Bundle Cost</button>
            </div>
            <div className="kv">
              <div><div className="what">Payment fees</div><div className="detail">{collectionFee ? <>The payment provider charges <strong>{zar(Math.round(collectionFee.price * 100))}</strong> per collection{failedFee ? ` and ${zar(Math.round(failedFee.price * 100))} per failed one` : ''}.</> : 'No payment provider price yet (the Payment rows in the sheet).'}</div></div>
              <button className="secondary" disabled={!collectionFee} onClick={() => collectionFee && toModel({ collectionFeeRand: collectionFee.price, ...(failedFee ? { failedFeeRand: failedFee.price } : {}) }, 'Set the payment fees in the profit model.')}>Use As Payment Fee</button>
            </div>
          </Card>
        </>
      ) : null}
    </>
  );
}
