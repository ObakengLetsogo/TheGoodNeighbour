import { useEffect, useMemo, useRef, useState } from 'react';
import { apiAvailable, getQuote, RELATIONSHIP_LABEL, type Cover, type Quote, type Relationship } from './api';
import { Icon } from './art';
import { dobForAge, formatZAR, pct } from './format';
import { useCover } from './hooks';
import { Reveal } from './Reveal';

interface Row { key: number; relationship: Relationship; age: string }

const clampInt = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : NaN; };

export function Calculator() {
  const cover = useCover();
  return (
    <section className="section" id="price">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="eyebrow"><span className="dot gold" />Your price</p>
          <h2>Build it. <em>See the price.</em></h2>
          <p className="section-lead">Everyone on your cover has their own price, worked out from your bundle, who they are to you, and their age. Try it. These are the same rules our app uses.</p>
        </Reveal>
        {cover ? <Builder cover={cover} /> : <Offline />}
      </div>
    </section>
  );
}

function Offline() {
  return (
    <Reveal className="card offline">
      <span className="tab gold">Live prices</span>
      <p>{apiAvailable ? 'Loading live prices…' : "Live prices appear here as soon as we open. Join the waiting list and we'll tell you the day they do."}</p>
      {!apiAvailable ? <a href="#join" className="btn btn-primary">Join The Waiting List</a> : null}
    </Reveal>
  );
}

function Builder({ cover }: { cover: Cover }) {
  const hampers = useMemo(() => cover.items.filter((i) => i.kind === 'grocery' && i.available).sort((a, b) => a.valueCents - b.valueCents), [cover]);
  const stock = useMemo(() => cover.items.filter((i) => i.kind === 'livestock' && i.available), [cover]);
  const [age, setAge] = useState('35');
  const [hamperId, setHamperId] = useState<string>(hampers[Math.min(1, hampers.length - 1)]?.id ?? '');
  const [qty, setQty] = useState<Record<string, number>>({});
  const nextKey = useRef(3);
  const [rows, setRows] = useState<Row[]>([{ key: 1, relationship: 'spouse', age: '33' }, { key: 2, relationship: 'child', age: '6' }]);
  const [priced, setPriced] = useState<{ quote: Quote; rows: Row[] } | null>(null);
  const quote = priced?.quote ?? null;
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const holderAge = clampInt(age);
  const memberAges = rows.map((r) => clampInt(r.age));
  const ready = Number.isFinite(holderAge) && memberAges.every((a) => Number.isFinite(a)) && (hamperId !== '' || Object.values(qty).some((q) => q > 0));

  const items = useMemo(() => [
    ...(hamperId ? [{ itemId: hamperId, quantity: 1 }] : []),
    ...Object.entries(qty).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity })),
  ], [hamperId, qty]);

  const rowsKey = rows.map((r) => `${r.relationship}:${r.age}`).join('|');
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    setPending(true);
    const sent = rows;   // the family this quote is for, so the breakdown is labelled from it and not from whatever is on screen now
    const t = setTimeout(() => {
      getQuote(items, sent.map((r) => ({ relationship: r.relationship, dateOfBirth: dobForAge(clampInt(r.age)) })), dobForAge(holderAge), ctl.signal)
        .then((q) => { setPriced({ quote: q, rows: sent }); setFailed(false); setPending(false); })
        .catch((e) => { if (e?.name !== 'AbortError') { setFailed(true); setPending(false); } });
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, age, rowsKey, ready]);

  // On phones the price card sits below the form, so a slim bar keeps the total in view while the form is on screen.
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [formIn, setFormIn] = useState(false);
  const [resultIn, setResultIn] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const mk = (el: HTMLElement | null, set: (b: boolean) => void) => { if (!el) return undefined; const io = new IntersectionObserver(([e]) => set(e.isIntersecting), { threshold: 0.05 }); io.observe(el); return io; };
    const a = mk(formRef.current, setFormIn); const b = mk(resultRef.current, setResultIn);
    return () => { a?.disconnect(); b?.disconnect(); };
  }, []);

  const countOf = (r: Relationship) => rows.filter((x) => x.relationship === r).length;
  const addRow = (r: Relationship) => {
    const sample: Record<string, string> = { spouse: '33', child: '6', parent: '60', parent_in_law: '62', grandparent: '75', sibling: '30', other: '40' };
    setRows((x) => [...x, { key: nextKey.current++, relationship: r, age: sample[r] ?? '30' }]);
  };
  const total = rows.length;
  const labelIn = (list: Row[], i: number) => {
    const row = list[i];
    if (!row) return 'Family member';
    const same = list.filter((x) => x.relationship === row.relationship);
    return same.length > 1 ? `${RELATIONSHIP_LABEL[row.relationship]} ${same.indexOf(row) + 1}` : RELATIONSHIP_LABEL[row.relationship];
  };
  const labelFor = (i: number) => labelIn(rows, i);

  return (
    <div className="calc">
      <div className={`mini-total ${formIn && !resultIn && quote && ready ? 'show' : ''}`} aria-hidden="true">
        <span>Your monthly price</span><b>{quote ? formatZAR(quote.totalMonthlyCents) : ''}</b>
      </div>
      <div ref={formRef} className="calc-form-wrap"><Reveal className="card calc-form">
        <span className="tab ember">Your cover</span>

        <fieldset>
          <legend>How old are you?</legend>
          <div className="age-input">
            <input id="age" type="number" inputMode="numeric" min={cover.mainMinAge} max={cover.mainMaxAge} value={age} onChange={(e) => setAge(e.target.value)} aria-describedby="age-hint" />
            <span id="age-hint" className="muted small">You can join between {cover.mainMinAge} and {cover.mainMaxAge}.</span>
          </div>
        </fieldset>

        <fieldset>
          <legend>Grocery hamper</legend>
          <div className="seg" role="group" aria-label="Grocery hamper">
            <button type="button" className={hamperId === '' ? 'on' : ''} aria-pressed={hamperId === ''} onClick={() => setHamperId('')}>None</button>
            {hampers.map((h) => <button key={h.id} type="button" className={hamperId === h.id ? 'on' : ''} aria-pressed={hamperId === h.id} onClick={() => setHamperId(h.id)}>{formatZAR(h.valueCents)}</button>)}
          </div>
        </fieldset>

        <fieldset>
          <legend>From our farm</legend>
          <div className="steppers">
            {stock.map((s) => {
              const q = qty[s.id] ?? 0;
              return (
                <div key={s.id} className="stepper">
                  <div><b>{s.name}</b><small>{formatZAR(s.valueCents)} each</small></div>
                  <div className="step-btns" role="group" aria-label={`${s.name} quantity`}>
                    <button type="button" aria-label={`Fewer ${s.name}`} disabled={q === 0} onClick={() => setQty({ ...qty, [s.id]: q - 1 })}><Icon name="minus" size={18} stroke={2.4} /></button>
                    <output aria-live="polite">{q}</output>
                    <button type="button" aria-label={`More ${s.name}`} disabled={q >= Math.min(s.maxQty, 5)} onClick={() => setQty({ ...qty, [s.id]: q + 1 })}><Icon name="plus" size={18} stroke={2.4} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Your family <span className="muted">({total} of {cover.maxMembers})</span></legend>
          <ul className="family">
            {rows.map((r, i) => (
              <li key={r.key}>
                <span className="fam-name">{labelFor(i)}</span>
                <label className="fam-age"><span className="sr">Age of {labelFor(i)}</span>
                  <input type="number" inputMode="numeric" min={0} max={120} value={r.age} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, age: e.target.value } : y)))} />
                  <small>years</small>
                </label>
                <button type="button" className="icon-btn" aria-label={`Remove ${labelFor(i)}`} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><Icon name="x" size={16} stroke={2.4} /></button>
              </li>
            ))}
          </ul>
          <div className="add-chips">
            {cover.relationships.map((rule) => (
              <button key={rule.relationship} type="button" className="chip-btn" disabled={countOf(rule.relationship) >= rule.maxCount || total >= cover.maxMembers} onClick={() => addRow(rule.relationship)}>
                <Icon name="plus" size={14} stroke={2.6} />{RELATIONSHIP_LABEL[rule.relationship]}
              </button>
            ))}
          </div>
        </fieldset>
      </Reveal></div>

      <Reveal className="calc-result-wrap" delay={100}>
        <div ref={resultRef} className={`card calc-result ${pending ? 'busy' : ''}`}>
          <span className="tab gold">Your monthly price</span>
          <div role="status" aria-live="polite">
            {!ready ? <p className="muted">Choose a hamper or something from our farm to see a price.</p> : failed ? <p className="err">We couldn't load live prices just now. Please try again in a moment.</p> : quote ? (
              <>
                <div className="total"><b>{formatZAR(quote.totalMonthlyCents)}</b><span>a month</span></div>
                {quote.problems.length > 0 ? <ul className="problems">{quote.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
                <p className="muted small">Your family receives a bundle worth <b>{formatZAR(quote.bundleValueCents)}</b>.</p>
                <div className="breakdown">
                  <div className="bd-base"><span>Base price for this bundle</span><b>{formatZAR(quote.baseMonthlyCents)}</b></div>
                  <ul>
                    <li><span><b>You</b><small>{pct(quote.main.relationshipBps)} of base · {pct(quote.main.ageBps)} for age {quote.main.age ?? holderAge}</small></span><b>{formatZAR(quote.main.feeCents)}</b></li>
                    {quote.members.map((m, i) => (
                      <li key={i}><span><b>{labelIn(priced!.rows, i)}</b><small>{pct(m.relationshipBps)} of base · {pct(m.ageBps)} for age {m.age ?? priced!.rows[i]?.age}</small></span><b>{formatZAR(m.feeCents)}</b></li>
                    ))}
                  </ul>
                </div>
                <p className="muted tiny">Everyone's price is the base price × their relationship % × their age %. An example only: your price is confirmed when you apply.</p>
              </>
            ) : <p className="muted">Working out your price…</p>}
          </div>
          <a href="#join" className="btn btn-primary">Tell Me When You Open<Icon name="arrow" size={18} stroke={2.2} /></a>
        </div>
      </Reveal>
    </div>
  );
}
