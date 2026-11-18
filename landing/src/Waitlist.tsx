import { useState, type FormEvent } from 'react';
import { apiAvailable, joinWaitlist } from './api';
import { Icon } from './art';
import { isValidEmail, normaliseSAPhone, PROVINCES } from './format';
import { Reveal } from './Reveal';

type Errors = Partial<Record<'name' | 'contact' | 'phone' | 'email' | 'consent' | 'form', string>>;

export function Waitlist() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');   // honeypot: people never see or fill this
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Please tell us your first name.';
    const normalised = phone.trim() ? normaliseSAPhone(phone) : null;
    if (phone.trim() && !normalised) next.phone = 'That doesn\'t look like a South African mobile number.';
    if (email.trim() && !isValidEmail(email)) next.email = 'That email address doesn\'t look right.';
    if (!phone.trim() && !email.trim()) next.contact = 'Please give us a mobile number or an email address, so we can reach you.';
    if (!consent) next.consent = 'Please tick the box so we know it\'s OK to contact you.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await joinWaitlist({ firstName: name.trim(), phone: normalised ?? undefined, email: email.trim() || undefined, province: province || undefined, consent, website });
      setDone(name.trim());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setErrors({ form: !apiAvailable || msg === 'offline' ? "Sign-ups aren't switched on just yet. Please check back soon." : msg || 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="join" id="join">
      <div className="blob blob-berry" aria-hidden="true" />
      <div className="blob blob-gold" aria-hidden="true" />
      <div className="wrap join-grid">
        <Reveal className="join-copy">
          <p className="eyebrow light"><span className="dot gold" />Opening soon</p>
          <h2>Be the first <em>to know.</em></h2>
          <p>Join the waiting list and we'll tell you the day cover opens, with the final prices. No payment, no commitment, and we'll never share your details.</p>
          <ul className="join-points">
            <li><Icon name="check" size={18} stroke={2.4} />Free, and takes under a minute</li>
            <li><Icon name="check" size={18} stroke={2.4} />One message when we open. No spam.</li>
            <li><Icon name="check" size={18} stroke={2.4} />Ask us to remove you any time</li>
          </ul>
        </Reveal>

        <Reveal className="card join-card" delay={100}>
          {done ? (
            <div className="done" role="status">
              <span className="done-icon"><Icon name="check" size={30} stroke={2.6} /></span>
              <h3>You're on the list, {done}.</h3>
              <p>Thank you. We'll be in touch the moment cover opens. Until then, there's nothing you need to do.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate aria-label="Join the waiting list">
              <span className="tab ember">Join the waiting list</span>
              <label className="field">First name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} />
                {errors.name ? <span id="e-name" className="field-err" role="alert">{errors.name}</span> : null}
              </label>
              <div className="two">
                <label className="field">Mobile number
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="082 123 4567" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'e-phone' : undefined} />
                  {errors.phone ? <span id="e-phone" className="field-err" role="alert">{errors.phone}</span> : null}
                </label>
                <label className="field">Email <span className="muted">(optional)</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={120} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'e-email' : undefined} />
                  {errors.email ? <span id="e-email" className="field-err" role="alert">{errors.email}</span> : null}
                </label>
              </div>
              {errors.contact ? <p className="field-err" role="alert">{errors.contact}</p> : null}
              <label className="field">Province <span className="muted">(optional)</span>
                <select value={province} onChange={(e) => setProvince(e.target.value)}>
                  <option value="">Choose a province</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} />
                <span>Yes, TGN may contact me about when cover opens. I can ask to be removed at any time.</span>
              </label>
              {errors.consent ? <p className="field-err" role="alert">{errors.consent}</p> : null}
              {errors.form ? <p className="field-err" role="alert">{errors.form}</p> : null}
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding You…' : 'Add Me To The List'}</button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
