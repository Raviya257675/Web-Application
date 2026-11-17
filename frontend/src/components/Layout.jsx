import { useEffect, useRef, useState } from 'react';
import './workspace-polish.css';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { Avatar, Icon } from './ui';

const NAV = {
  RECEPTIONIST: [
    { to: '/receptionist', label: 'Front desk today', icon: 'dashboard', end: true },
    { to: '/receptionist/patients', label: 'Patient registration', icon: 'users' },
    { to: '/receptionist/appointments', label: 'Appointments & check-in', icon: 'calendar' },
    { to: '/receptionist/billing', label: 'Payments & receipts', icon: 'receipt' },
    { to: '/receptionist/beds', label: 'Available beds', icon: 'bed' },
  ],
  PHARMACIST: [
    { to: '/pharmacist', label: 'Pharmacy workspace', icon: 'pill', end: true },
  ],
  ADMIN: [
    { to: '/admin/approvals', label: 'Staff approvals', icon: 'shield' },
    { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/admin/appointments', label: 'Appointments', icon: 'calendar' },
    { to: '/admin/doctors', label: 'Doctors', icon: 'activity' },
    { to: '/admin/departments', label: 'Departments', icon: 'building' },
    { to: '/admin/patients', label: 'Patients', icon: 'users' },
    { to: '/admin/billing', label: 'Billing', icon: 'receipt' },
    { to: '/admin/pharmacy', label: 'Pharmacy', icon: 'pill' },
    { to: '/admin/laboratory', label: 'Laboratory', icon: 'flask' },
    { to: '/admin/wards', label: 'Wards & beds', icon: 'bed' },
    { to: '/admin/leaves', label: 'Leave requests', icon: 'clock' },
    { to: '/admin/staff', label: 'Staff & access', icon: 'shield' },
    { to: '/admin/audit', label: 'Audit trail', icon: 'file' },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'Today', icon: 'dashboard', end: true },
    { to: '/doctor/appointments', label: 'Appointments', icon: 'calendar' },
    { to: '/doctor/patients', label: 'My patients', icon: 'users' },
    { to: '/doctor/records', label: 'Clinical records', icon: 'file' },
    { to: '/doctor/lab', label: 'Lab orders', icon: 'flask' },
    { to: '/doctor/availability', label: 'Availability & leave', icon: 'clock' },
  ],
  PATIENT: [
    { to: '/patient', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/patient/book', label: 'Book a visit', icon: 'plus' },
    { to: '/patient/appointments', label: 'Appointments', icon: 'calendar' },
    { to: '/patient/records', label: 'Medical records', icon: 'file' },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: 'pill' },
    { to: '/patient/invoices', label: 'Invoices', icon: 'receipt' },
    { to: '/patient/lab', label: 'Lab results', icon: 'flask' },
    { to: '/patient/admissions', label: 'Admissions', icon: 'bed' },
  ],
};

const PORTAL = { ADMIN: 'Admin portal', DOCTOR: 'Doctor portal', PATIENT: 'Patient portal', RECEPTIONIST: 'Reception desk', PHARMACIST: 'Pharmacist portal' };

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const [navSearch, setNavSearch] = useState('');

  useEffect(() => {
    const root = contentRef.current;
    if (!root || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('workspace-enter');
        observer.unobserve(target);
      });
    }, { threshold: 0.08 });
    const observe = () => root.querySelectorAll('.page__head, .stat, .card, .empty-box').forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      el.style.setProperty('--entrance-delay', `${Math.min(Array.from(el.parentElement.children).indexOf(el), 3) * 55}ms`);
      observer.observe(el);
    });
    observe();
    const mutations = new MutationObserver(observe);
    mutations.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setNavSearch('');
  }, [location.pathname]);

  const links = [...(NAV[role] || []), {to: `/${role.toLowerCase()}/notifications`, label:'Notifications', icon:'bell'}, {to:'/account',label:'Profile & password',icon:'shield'}];
  const portal = PORTAL[role] || 'Portal';

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell" data-workspace-role={role?.toLowerCase()}>
      <header className="navbar">
        <div className="navbar__left">
          <button
            type="button"
            className="icon-btn navbar__burger"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="workspace-navigation"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <NavLink to={`/${role.toLowerCase()}`} className="brand">
            <span className="brand__mark">M</span>
            <span>Meridian <em>HMS</em></span>
          </NavLink>
        </div>
        <div className="navbar__right">
          <NotificationBell />
          <span className="badge badge--role">{role}</span>
          <div className="who">
            <Avatar name={user?.name || ''} size="sm" />
            <span className="who__name">{user?.name}</span>
          </div>
          <button type="button" className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="shell__body">
        <aside className={`sidebar sidebar--${role.toLowerCase()} ${menuOpen ? 'sidebar--open' : ''}`}>
          <span className="sidebar__portal">{portal}</span>
          <label className="workspace-nav-search">
            <span>Find a page</span>
            <input type="search" placeholder="Search navigation…" value={navSearch} onChange={event => setNavSearch(event.target.value)} />
          </label>
          <nav id="workspace-navigation" aria-label={portal}>
            {links.filter(link => link.label.toLowerCase().includes(navSearch.trim().toLowerCase())).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
              >
                <span className="sidebar__icon"><Icon name={link.icon} size={17} /></span>
                {link.label}
              </NavLink>
            ))}
          </nav>
          {navSearch && !links.some(link => link.label.toLowerCase().includes(navSearch.trim().toLowerCase())) ? <p className="workspace-nav-empty" role="status">No matching pages.</p> : null}
          <div className="sidebar__note">
            <strong>Meridian HMS v2</strong>
            <span>Connected patient care</span>
          </div>
        </aside>

        {menuOpen ? <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}

        <main className="content" ref={contentRef}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
