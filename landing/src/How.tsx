import { useMemo, useState } from 'react';
import { Cow, Hamper, Icon, Sheep, Tick, type IconName } from './art';
import { formatZAR } from './format';
import { useCover } from './hooks';
import { Reveal } from './Reveal';

const STEPS: { n: string; accent: string; icon: IconName; title: string; text: string }[] = [
  { n: '1', accent: 'ember', icon: 'basket', title: 'Build your bundle', text: 'Choose a grocery hamper, then add a sheep, a cow, or both. You see the full grocery list and what each choice adds to your price.' },
  { n: '2', accent: 'gold', icon: 'users', title: 'Add your family', text: 'Add your spouse, children and parents with their ID numbers. Each person has their own clear price, based on who they are to you and their age.' },
  { n: '3', accent: 'berry', icon: 'truck', title: 'We deliver when it matters', text: 'When someone on your cover passes away, we call you, confirm the details, and deliver your bundle to your family. No forms to chase, no waiting for a payout.' },
];

export function How() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="eyebrow"><span className="dot berry" />How it works</p>
          <h2>Three steps. <em>Nothing hidden.</em></h2>
          <p className="section-lead">Most funeral cover is a promise of cash, later, after paperwork. Ours is a bundle you choose today and we deliver in person.</p>
        </Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} className={`card step ${s.accent}`} delay={i * 90}>
              <span className={`tab ${s.accent}`}>Step {s.n}</span>
              <span className={`step-icon ${s.accent}`}><Icon name={s.icon} size={26} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STOCK_FALLBACK = [
  { id: 'sheep', name: 'Sheep', description: 'A sheep from our farm, delivered to your family.' },
  { id: 'cow', name: 'Cow', description: 'A cow from our farm, for larger gatherings.' },
];

export function Bundle() {
  const cover = useCover();
  const hampers = useMemo(() => (cover?.items ?? []).filter((i) => i.kind === 'grocery' && i.available).sort((a, b) => a.valueCents - b.valueCents), [cover]);
  const stock = useMemo(() => (cover?.items ?? []).filter((i) => i.kind === 'livestock' && i.available), [cover]);
  const [picked, setPicked] = useState<string | null>(null);
  const hamper = hampers.find((h) => h.id === picked) ?? hampers[Math.min(1, hampers.length - 1)] ?? hampers[0];
  const stockCards = stock.length ? stock : STOCK_FALLBACK.map((s) => ({ ...s, valueCents: 0, unitLabel: '' }));

  return (
    <section className="section tinted" id="bundle">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="eyebrow"><span className="dot" />What your family receives</p>
          <h2>A bundle you can <em>see and count.</em></h2>
          <p className="section-lead">When the time comes, families need food on the table and the means to host. So that's what we deliver.</p>
        </Reveal>

        <div className="bundle-grid">
          <Reveal className="card hamper-card">
            <span className="tab gold">Grocery hamper</span>
            <div className="hamper-top">
              <Hamper className="hamper-art" />
              <div>
                <h3>{hamper ? hamper.name : 'Grocery hamper'}</h3>
                <p className="muted">{hamper ? `${hamper.contents.length} items, worth ${formatZAR(hamper.valueCents)}.` : 'A full hamper of everyday groceries for the gathering.'}</p>
              </div>
            </div>
            {hampers.length > 1 ? (
              <div className="seg" role="group" aria-label="Choose a hamper size">
                {hampers.map((h) => (
                  <button key={h.id} type="button" className={h.id === hamper?.id ? 'on' : ''} aria-pressed={h.id === hamper?.id} onClick={() => setPicked(h.id)}>{formatZAR(h.valueCents)}</button>
                ))}
              </div>
            ) : null}
            {hamper ? (
              <ul className="ticks cols" aria-live="polite">{hamper.contents.map((c) => <Tick key={c}>{c}</Tick>)}</ul>
            ) : (
              <p className="muted small">The full grocery list shows here, item by item, so you know exactly what your family will receive.</p>
            )}
          </Reveal>

          <div className="stock-col">
            {stockCards.map((s, i) => (
              <Reveal key={s.id} className="card stock-card" delay={(i + 1) * 90}>
                <span className={`tab ${i === 0 ? 'ember' : 'berry'}`}>From our farm</span>
                {/cow|cattle|beef|bull/i.test(s.name) ? <Cow className="stock-art" /> : <Sheep className="stock-art" />}
                <div>
                  <h3>{s.name}</h3>
                  <p className="muted">{s.description}</p>
                </div>
              </Reveal>
            ))}
            <Reveal className="note" delay={300}>
              <Icon name="heart" size={18} />
              <p>Slaughter and dressing is not included. Our team arranges it separately with your family, so it's done the way you want.</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
