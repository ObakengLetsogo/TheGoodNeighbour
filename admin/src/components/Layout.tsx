import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="30" cy="12" r="7" fill="#D45B38" /><circle cx="55" cy="20" r="7" fill="#4A5728" />
      <path d="M42 64 V46 A15 15 0 0 1 72 46 V64" stroke="#4A5728" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M10 64 V42 A17 17 0 0 1 44 42" stroke="#D45B38" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M42 52 V46" stroke="#4A5728" strokeWidth="8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/policies', label: 'Policies' },
  { to: '/claims', label: 'Claims' },
  { to: '/plans', label: 'Plans & Pricing' },
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
