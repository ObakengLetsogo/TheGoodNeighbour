import type { ReactNode } from 'react';

const PATHS = {
  basket: 'M4 9h16l-1.6 9a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6L4 9Z M8 9l3-5 M16 9l-3-5 M9.5 13v3 M14.5 13v3',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4 M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  truck: 'M3 6h11v10H3z M14 10h4l3 3v3h-7 M7.5 19.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M17.5 19.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3Z M8.5 12l2.5 2.5 4.5-5',
  lock: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  userx: 'M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20 M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M16 8.5l4 4 M20 8.5l-4 4',
  doc: 'M7 3h7l4 4v14H7z M14 3v4h4 M10 12h5 M10 16h5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12 M18 6L6 18',
  chev: 'M6 9l6 6 6-6',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name].split(' M').map((d, i) => <path key={i} d={i === 0 ? d : `M${d}`} />)}
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return <img src="/favicon.svg" width={size * 0.88} height={size} alt="" style={{ display: 'block' }} />;
}

/** A flat, friendly sheep in brand colours. */
export function Sheep({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 150" role="img" aria-label="A sheep" fill="none">
      <ellipse cx="112" cy="138" rx="78" ry="7" fill="#15171C" opacity=".08" />
      {[78, 94, 128, 144].map((x) => <rect key={x} x={x} y="96" width="9" height="40" rx="4.5" fill="#15171C" />)}
      <g fill="#CDD6A8">
        <circle cx="84" cy="76" r="27" /><circle cx="110" cy="64" r="30" /><circle cx="140" cy="74" r="28" /><circle cx="100" cy="94" r="25" /><circle cx="128" cy="95" r="25" /><circle cx="156" cy="90" r="20" />
      </g>
      <g fill="#B9C58C" opacity=".7"><circle cx="118" cy="58" r="9" /><circle cx="94" cy="80" r="8" /><circle cx="140" cy="86" r="8" /></g>
      <ellipse cx="52" cy="82" rx="17" ry="20" fill="#15171C" />
      <ellipse cx="40" cy="64" rx="10" ry="6" fill="#D45B38" transform="rotate(-25 40 64)" />
      <ellipse cx="66" cy="62" rx="10" ry="6" fill="#D45B38" transform="rotate(20 66 62)" />
      <circle cx="46" cy="78" r="2.6" fill="#FAFBF6" />
    </svg>
  );
}

/** A flat, friendly cow in brand colours. */
export function Cow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 160" role="img" aria-label="A cow" fill="none">
      <ellipse cx="124" cy="148" rx="88" ry="7" fill="#15171C" opacity=".08" />
      {[88, 104, 150, 166].map((x) => <rect key={x} x={x} y="100" width="10" height="46" rx="5" fill="#15171C" />)}
      <rect x="74" y="54" width="120" height="58" rx="26" fill="#F6DDD3" />
      <path d="M186 64c14 0 22 6 22 18 0 8-6 14-14 14" stroke="#15171C" strokeWidth="5" strokeLinecap="round" />
      <g fill="#D45B38"><ellipse cx="108" cy="76" rx="15" ry="11" /><ellipse cx="150" cy="94" rx="17" ry="10" /><ellipse cx="170" cy="68" rx="9" ry="7" /></g>
      <rect x="26" y="52" width="62" height="50" rx="22" fill="#F6DDD3" />
      <rect x="22" y="78" width="40" height="26" rx="12" fill="#CD1364" opacity=".9" />
      <ellipse cx="34" cy="92" rx="2.8" ry="3.4" fill="#15171C" /><ellipse cx="50" cy="92" rx="2.8" ry="3.4" fill="#15171C" />
      <circle cx="56" cy="68" r="3" fill="#15171C" /><circle cx="80" cy="68" r="3" fill="#15171C" />
      <path d="M44 56c-10-12-14-18-10-24M78 56c8-12 14-16 12-24" stroke="#EBB111" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="46" cy="58" rx="14" ry="6" fill="#D45B38" transform="rotate(-10 46 58)" opacity="0" />
    </svg>
  );
}

/** A grocery hamper with a few things peeking out. */
export function Hamper({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 160" role="img" aria-label="A grocery hamper" fill="none">
      <ellipse cx="110" cy="148" rx="80" ry="7" fill="#15171C" opacity=".08" />
      <rect x="64" y="34" width="22" height="58" rx="10" fill="#EBB111" /><rect x="68" y="26" width="14" height="14" rx="4" fill="#4A5728" />
      <rect x="96" y="26" width="26" height="66" rx="8" fill="#CD1364" /><rect x="96" y="44" width="26" height="14" fill="#FAFBF6" opacity=".9" />
      <path d="M134 94c-2-24 6-44 20-50 6 10 4 34-4 50Z" fill="#4A5728" />
      <path d="M150 46c6-8 14-10 20-8" stroke="#2F8A5A" strokeWidth="5" strokeLinecap="round" />
      <path d="M38 88h144l-14 48a14 14 0 0 1-13.4 10H65.4A14 14 0 0 1 52 136L38 88Z" fill="#D45B38" />
      <g stroke="#FAFBF6" strokeWidth="4" strokeLinecap="round" opacity=".55"><path d="M60 100l8 40M86 100l4 44M112 100v44M138 100l-4 44M164 100l-8 40" /><path d="M46 112h128M52 128h116" /></g>
      <rect x="32" y="82" width="156" height="14" rx="7" fill="#B84A29" />
    </svg>
  );
}

export function Tick({ children }: { children: ReactNode }) {
  return <li className="tick"><span className="tick-dot"><Icon name="check" size={14} stroke={2.6} /></span><span>{children}</span></li>;
}
