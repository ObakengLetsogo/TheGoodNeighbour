import type { ReactNode } from 'react';
import { RELATIONSHIP_LABEL, type Cover } from './api';
import { Icon, type IconName } from './art';
import { months, monthsAdj } from './format';
import { useCover } from './hooks';
import { Reveal } from './Reveal';

interface RuleCard { accent: string; title: string; text: ReactNode }

function rules(c: Cover | null): RuleCard[] {
  return [
    { accent: 'gold', title: 'When cover starts', text: c
      ? `After we approve your application and receive your first payment. Natural causes carry a ${monthsAdj(c.naturalWaitingDays)} waiting period. ${c.accidentalWaitingDays === 0 ? 'Accidents have no waiting period.' : `Accidents carry a ${monthsAdj(c.accidentalWaitingDays)} waiting period.`}`
      : 'After we approve your application and receive your first payment. Natural causes carry a waiting period; accidents are treated more generously.' },
    { accent: 'ember', title: 'Who you can cover', text: c
      ? `You, plus up to ${c.maxMembers} family members: ${c.relationships.map((r) => RELATIONSHIP_LABEL[r.relationship].toLowerCase()).join(', ')}. Each is priced by their age and relationship to you.`
      : 'You, plus your spouse, children, parents and other family. Each is priced by their age and relationship to you.' },
    { accent: 'berry', title: 'If you miss a payment', text: c
      ? `Your cover lapses after ${c.lapseAfterMissedPayments} missed ${c.lapseAfterMissedPayments === 1 ? 'payment' : 'payments'}. Get back on track within ${months(c.reinstateWithinDays)} and we reinstate it without a new waiting period.`
      : 'Cover lapses after missed payments. Catch up within a few months and we reinstate it without a new waiting period.' },
    { accent: 'olive', title: 'Changing your bundle', text: c
      ? `Make it smaller and it applies straight away. Make it bigger and the increase pays out after a new ${monthsAdj(c.upgradeWaitingDays)} waiting period. Until then, your earlier bundle applies.`
      : 'Make it smaller and it applies straight away. Make it bigger and the increase has its own waiting period.' },
    { accent: 'ember', title: 'Time to change your mind', text: c
      ? `You have ${months(c.coolingOffDays)} after your cover starts to cancel and think again.`
      : 'You have a cooling-off period after your cover starts to cancel and think again.' },
    { accent: 'gold', title: 'Price changes', text: c
      ? `We review prices once a year. Any increase is capped at ${c.escalationCapPercent}% and you get notice first.`
      : 'We review prices once a year. Any increase is capped and you get notice first.' },
  ];
}

export function Rules() {
  const cover = useCover();
  return (
    <section className="section tinted" id="rules">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="eyebrow"><span className="dot ember" />The fine print, in plain language</p>
          <h2>No small print <em>to squint at.</em></h2>
          <p className="section-lead">These are the rules that matter, written the way we'd explain them across a table. The full Terms are in the app, and you'll see them before you apply.</p>
        </Reveal>
        <div className="rules">
          {rules(cover).map((r, i) => (
            <Reveal key={r.title} className="card rule" delay={(i % 3) * 80}>
              <span className={`tab ${r.accent}`}>{r.title}</span>
              <p>{r.text}</p>
            </Reveal>
          ))}
        </div>
        <p className="muted small center">These are our current rules and can change with notice. They are set out in full, with exact dates for your cover, in the app.</p>
      </div>
    </section>
  );
}

const TRUST: { icon: IconName; accent: string; title: string; text: string }[] = [
  { icon: 'shield', accent: 'olive', title: 'We never see your bank details', text: 'Monthly payments are debit orders that your own bank asks you to approve. We never ask for your card or your banking password.' },
  { icon: 'lock', accent: 'ember', title: 'Your ID number is locked away', text: 'ID numbers are encrypted where we keep them, and the app only ever shows the last four digits.' },
  { icon: 'doc', accent: 'gold', title: 'Read it before you sign', text: 'A plain-language summary and the full Terms come before you apply, and we record exactly which version you agreed to.' },
  { icon: 'userx', accent: 'berry', title: 'Your data, your call', text: 'You can delete your account from the app any time. If you have no cover or claims, it happens straight away.' },
];

export function Trust() {
  return (
    <section className="section" id="trust">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="eyebrow"><span className="dot" />Trust, built in</p>
          <h2>Careful with <em>what matters most.</em></h2>
          <p className="section-lead">You're trusting us with your family. These are the promises we've built into the product itself.</p>
        </Reveal>
        <div className="trust-grid">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} className="trust-item" delay={(i % 2) * 80}>
              <span className={`step-icon ${t.accent}`}><Icon name={t.icon} size={24} /></span>
              <div><h3>{t.title}</h3><p>{t.text}</p></div>
            </Reveal>
          ))}
        </div>
        <Reveal className="callout">
          <Icon name="heart" size={22} />
          <div>
            <b>We're not open yet, and we'll say so plainly.</b>
            <p>We're still arranging our insurer and the registrations we need. We won't take a cent or sign anyone up until that's done. Join the waiting list and we'll tell you the day we open.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function faqs(c: Cover | null): { q: string; a: ReactNode }[] {
  return [
    { q: 'Is TGN open yet?', a: "Not yet. We're arranging our insurer and the registrations we need, and we won't take payments or sign anyone up until that's done. Join the waiting list and you'll hear from us first." },
    { q: 'Why a bundle instead of cash?', a: 'In the first days after a loss, families need food for the gathering and the means to host. A bundle is exactly that, delivered to the door, so there are no claim forms to chase and no cash to stretch.' },
    { q: 'Who can I cover?', a: c ? `You, plus up to ${c.maxMembers} family members: ${c.relationships.map((r) => RELATIONSHIP_LABEL[r.relationship].toLowerCase()).join(', ')}. Everyone is added with their ID number and how they're related to you.` : 'You, plus your spouse, children, parents and other family, added with their ID numbers and how they are related to you.' },
    { q: 'How is my price worked out?', a: "Your bundle sets a base price. Each person's monthly price is that base × a percentage for how they're related to you × a percentage for their age. You can see every person's price before you apply, and try it in the price builder above." },
    { q: 'When can my family claim?', a: c ? `After cover starts, natural causes carry a ${monthsAdj(c.naturalWaitingDays)} waiting period. ${c.accidentalWaitingDays === 0 ? 'Accidents have no waiting period.' : `Accidents carry a ${monthsAdj(c.accidentalWaitingDays)} waiting period.`}` : 'Natural causes carry a waiting period after cover starts. Accidents are treated more generously.' },
    { q: 'What happens if I miss a payment?', a: c ? `Your cover lapses after ${c.lapseAfterMissedPayments} missed ${c.lapseAfterMissedPayments === 1 ? 'payment' : 'payments'}, but you can reinstate it within ${months(c.reinstateWithinDays)} without a new waiting period.` : 'Cover lapses after missed payments, but you can reinstate it within a few months without a new waiting period.' },
    { q: 'What does the sheep or cow include?', a: "We deliver the animal from our farm to your family. Slaughter and dressing isn't included. Our team arranges it separately with you, so it's done the way your family wants." },
    { q: 'Can I cancel?', a: c ? `Yes. You can ask to cancel in the app at any time, and you have ${months(c.coolingOffDays)} after your cover starts to change your mind.` : 'Yes. You can ask to cancel in the app at any time, and you get a cooling-off period after your cover starts.' },
    { q: 'Is my information safe?', a: "ID numbers are encrypted where we store them, we never see your bank details, and you can delete your account from the app whenever you like. Our Privacy Notice explains the rest." },
  ];
}

export function Faq() {
  const cover = useCover();
  const list = faqs(cover);
  return (
    <section className="section tinted" id="faq">
      <div className="wrap faq-wrap">
        <Reveal className="section-head left">
          <p className="eyebrow"><span className="dot berry" />Questions</p>
          <h2>Good questions. <em>Straight answers.</em></h2>
          <p className="section-lead">Can't see yours? Ask us once we open, and we'll answer it here.</p>
        </Reveal>
        <Reveal className="faq">
          {list.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary><span>{f.q}</span><Icon name="chev" size={20} stroke={2.2} /></summary>
              <div className="faq-a"><p>{f.a}</p></div>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
