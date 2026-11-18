import { useEffect, useState } from 'react';
import { getLegal, type LegalDoc } from './api';
import { Icon, Logo } from './art';

const WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.replace(/\D/g, '');
const PHONE = (import.meta.env.VITE_SUPPORT_PHONE as string | undefined)?.trim();

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <a href="#top" className="brand light" aria-label="Back to the top"><Logo size={38} /><span className="brand-text"><b>TGN</b><small>The Good Neighbour</small></span></a>
          <p className="serif-tag">Here when it matters.</p>
          <p className="small">Not yet open for applications. We'll tell everyone on the waiting list the day we are.</p>
        </div>
        <nav aria-label="Explore" className="footer-col">
          <h4>Explore</h4>
          <a href="#how">How It Works</a><a href="#bundle">What You Get</a><a href="#price">Your Price</a><a href="#faq">Questions</a><a href="#join">Waiting List</a>
        </nav>
        <nav aria-label="Legal" className="footer-col">
          <h4>Legal</h4>
          <a href="#/legal/terms">Terms</a><a href="#/legal/privacy">Privacy Notice</a>
        </nav>
        {WHATSAPP || PHONE ? (
          <div className="footer-col">
            <h4>Talk to us</h4>
            {WHATSAPP ? <a href={`https://wa.me/${WHATSAPP}`} rel="noopener"><Icon name="chat" size={16} /> WhatsApp</a> : null}
            {PHONE ? <a href={`tel:${PHONE.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> {PHONE}</a> : null}
          </div>
        ) : null}
      </div>
      <div className="wrap footer-base"><span>© {new Date().getFullYear()} TGN. All rights reserved.</span></div>
    </footer>
  );
}

/** Terms and Privacy come straight from the same source the app reads, so they can never disagree. */
export function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setDoc(null); setFailed(false);
    getLegal(slug).then(setDoc).catch(() => setFailed(true));
  }, [slug]);
  const blocks = doc?.body.trim().split(/\n{2,}/) ?? [];
  return (
    <main className="legal wrap" id="main">
      <a href="#" className="back" onClick={(e) => { e.preventDefault(); onBack(); }}><Icon name="arrow" size={16} stroke={2.2} />Back to TGN</a>
      {failed ? <p className="err">We couldn't load this page right now. Please try again in a moment.</p> : !doc ? <p className="muted">Loading…</p> : (
        <article>
          <h1>{doc.title}</h1>
          {doc.draft ? <p className="draft">This is a draft that is still being reviewed. It may change before we open.</p> : null}
          <p className="muted small">Version {doc.version} · Updated {new Date(doc.updatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {blocks.map((b, i) => {
            const t = b.trim();
            if (t.startsWith('## ')) {
              const [head, ...rest] = t.split('\n');
              return <section key={i}><h2>{head.replace(/^##\s+/, '')}</h2>{rest.length ? <p>{rest.join('\n')}</p> : null}</section>;
            }
            return <p key={i}>{t}</p>;
          })}
        </article>
      )}
    </main>
  );
}
