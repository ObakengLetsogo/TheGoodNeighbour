import { useEffect, useState } from 'react';
import { Calculator } from './Calculator';
import { Footer, LegalPage } from './Footer';
import { Hero, Nav } from './Hero';
import { Bundle, How } from './How';
import { Faq, Rules, Trust } from './Info';
import { Waitlist } from './Waitlist';

const LEGAL = /^#\/legal\/(terms|privacy)$/;

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const legal = LEGAL.exec(hash)?.[1];
  useEffect(() => { if (legal) window.scrollTo(0, 0); }, [legal]);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Nav />
      {legal ? <LegalPage slug={legal} onBack={() => { window.location.hash = ''; window.scrollTo(0, 0); }} /> : (
        <main id="main">
          <Hero />
          <How />
          <Bundle />
          <Calculator />
          <Rules />
          <Trust />
          <Faq />
          <Waitlist />
        </main>
      )}
      <Footer />
    </>
  );
}
