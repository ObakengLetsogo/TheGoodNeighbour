import { useEffect, useState } from 'react';
import { getCover, getQuote, type Cover, type Quote } from './api';
import { Cow, Hamper, Icon, Logo, Sheep } from './art';
import { dobForAge, formatZAR, months } from './format';

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a href="#top" className="brand" aria-label="TGN, The Good Neighbour, home">
          <Logo size={34} />
          <span className="brand-text"><b>TGN</b><small>The Good Neighbour</small></span>
        </a>
        <nav aria-label="Main" className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#bundle">What You Get</a>
          <a href="#price">Your Price</a>
          <a href="#faq">Questions</a>
        </nav>
        <a href="#join" className="btn btn-primary btn-sm">Join The Waiting List</a>
      </div>
    </header>
  );
}

/** One live quote for the hero: the smallest hamper, and a sample family for the phone. */
function useHeroQuotes() {
  const [state, setState] = useState<{ cover: Cover; from: Quote; sample: Quote; sampleNames: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const cover = await getCover();
        const hamper = cover.items.filter((i) => i.kind === 'grocery' && i.available).sort((a, b) => a.valueCents - b.valueCents)[0];
        const stock = cover.items.find((i) => i.kind === 'livestock' && i.available);
        if (!hamper) return;
        const holder = dobForAge(35);
        const from = await getQuote([{ itemId: hamper.id, quantity: 1 }], [], holder);
        const sampleItems = [{ itemId: hamper.id, quantity: 1 }, ...(stock ? [{ itemId: stock.id, quantity: 1 }] : [])];
        const sample = await getQuote(sampleItems, [{ relationship: 'spouse', dateOfBirth: dobForAge(32) }], holder);
        if (live && from.valid) setState({ cover, from, sample: sample.valid ? sample : from, sampleNames: [hamper.name, ...(stock ? [stock.name] : [])] });
      } catch { /* the page reads fine without live prices */ }
    })();
    return () => { live = false; };
  }, []);
  return state;
}

export function Hero() {
  const q = useHeroQuotes();
  return (
    <section className="hero" id="top">
      <div className="blob blob-ember" aria-hidden="true" />
      <div className="blob blob-olive" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="dot" />Funeral cover, rebuilt for families</p>
          <h1>Here when it <em>matters.</em></h1>
          <p className="lead">
            Funeral cover that turns up as what your family actually needs: groceries for the gathering, and a sheep or a cow from our farm,
            delivered to your door. You build it. You see exactly what's in it.
          </p>
          <div className="cta-row">
            <a href="#join" className="btn btn-primary">Join The Waiting List<Icon name="arrow" size={18} stroke={2.2} /></a>
            <a href="#price" className="btn btn-secondary">Build Your Price</a>
          </div>
          {q ? (
            <p className="from-chip" aria-live="polite"><span className="from-dot" /><span>From <b>{formatZAR(q.from.totalMonthlyCents)}</b> a month for a {q.sampleNames[0]}</span></p>
          ) : null}
          <ul className="hero-points">
            <li><Icon name="basket" size={18} />See every item before you pay</li>
            <li><Icon name="users" size={18} />A price for each person, never a surprise</li>
            <li><Icon name="shield" size={18} />{q ? `${months(q.cover.coolingOffDays)} to change your mind` : 'Time to change your mind'}</li>
          </ul>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="ps-head"><Logo size={22} /><span>Build Your Cover</span></div>
              <div className="ps-card">
                <span className="ps-tab ember">Your bundle</span>
                <div className="ps-row"><span className="ps-ico gold"><Icon name="basket" size={18} /></span><div><b>{q?.sampleNames[0] ?? 'Grocery Hamper'}</b><small>See the list</small></div></div>
                <div className="ps-row"><span className="ps-ico ember"><Icon name="heart" size={18} /></span><div><b>{q?.sampleNames[1] ?? 'Sheep'}</b><small>From our farm</small></div></div>
              </div>
              <div className="ps-card">
                <span className="ps-tab berry">Your family</span>
                <div className="ps-line"><span>You</span><span>{q ? formatZAR(q.sample.main.feeCents) : '—'}</span></div>
                <div className="ps-line"><span>Spouse</span><span>{q && q.sample.members[0] ? formatZAR(q.sample.members[0].feeCents) : '—'}</span></div>
              </div>
              <div className="ps-total"><small>Your monthly price</small><b>{q ? formatZAR(q.sample.totalMonthlyCents) : 'Live prices'}</b></div>
              <div className="ps-btn">Continue</div>
            </div>
          </div>
          <div className="float float-a"><Hamper className="float-art" /></div>
          <div className="float float-b"><Sheep className="float-art" /></div>
          <div className="float float-c"><Cow className="float-art" /></div>
          <div className="chip chip-delivery"><Icon name="truck" size={16} />Delivered to your door</div>
        </div>
      </div>
    </section>
  );
}
