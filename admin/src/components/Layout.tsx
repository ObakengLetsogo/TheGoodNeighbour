import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

/** The TGN mark, from brand/logo-mark.svg. */
function Mark() {
  return (
    <svg height="34" viewBox="12 12 406 462" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARK }} />
  );
}

const MARK = `<circle cx="111" cy="60" r="43" fill="#D45B38"/><circle cx="310" cy="114" r="39" fill="#4A5728"/><path d="M319 392L370.9 441Q395.8 464.5 395.8 430.2L395.8 294.5A115 115 0 0 0 165.8 294.5L165.8 294.5A84.5 84.5 0 0 0 324.5 334.8" stroke="#4A5728" fill="none" stroke-width="36.2" stroke-linejoin="round"/><circle cx="324.5" cy="334.8" r="18.1" fill="#4A5728"/><path d="M118.5 327.5L60.9 380.5Q35.8 403.8 35.8 369.5L35.8 236.2A112.8 112.8 0 0 1 261.2 236.2L261.2 236.2A77.5 77.5 0 0 1 108.9 256.3" stroke="#D45B38" fill="none" stroke-width="36.2" stroke-linejoin="round"/><circle cx="108.9" cy="256.3" r="18.1" fill="#D45B38"/><clipPath id="tgn-weave"><circle cx="167" cy="311" r="38"/></clipPath><path d="M319 392L370.9 441Q395.8 464.5 395.8 430.2L395.8 294.5A115 115 0 0 0 165.8 294.5L165.8 294.5A84.5 84.5 0 0 0 324.5 334.8" stroke="#4A5728" fill="none" stroke-width="36.2" stroke-linejoin="round" clip-path="url(#tgn-weave)"/>`;

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/policies', label: 'Policies' },
  { to: '/claims', label: 'Claims' },
  { to: '/customers', label: 'Customers' },
  { to: '/support', label: 'Support Inbox' },
  { to: '/cover', label: 'Cover & Pricing' },
  { to: '/herd', label: 'Herd & Capacity' },
  { to: '/legal', label: 'Terms & Privacy' },
  { to: '/audit', label: 'Audit Log' },
];

export function Layout() {
  const { staff, logout } = useAuth();
  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand"><Mark />TGN</div>
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav${isActive ? ' active' : ''}`}>{n.label}</NavLink>)}
        <div className="spacer" />
        <div className="small muted" style={{ padding: '0 12px' }}>{staff?.email}</div>
        <button className="ghost" onClick={logout} style={{ justifySelf: 'start' }}>Sign Out</button>
      </nav>
      <main className="main"><Outlet /></main>
    </div>
  );
}
