import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { C, R } from '../theme';
import { DashboardIcon, UsersIcon, ParcelIcon, EventIcon, ChatIcon, LogoIcon, BuildingIcon, CalendarCheckIcon, UserPlusIcon } from './Icons';
import ConfirmModal from './ConfirmModal';

const navMain = [
  { to: '/', label: 'แดชบอร์ด', icon: DashboardIcon },
];
const navManage = [
  { to: '/users', label: 'จัดการลูกบ้าน', icon: UsersIcon },
  { to: '/parcels', label: 'จัดการพัสดุ', icon: ParcelIcon },
  { to: '/events', label: 'กิจกรรมและประกาศ', icon: EventIcon },
  { to: '/social', label: 'Social Feed', icon: ChatIcon },
];
const navFacility = [
  { to: '/facilities', label: 'สิ่งอำนวยความสะดวก', icon: BuildingIcon },
  { to: '/bookings', label: 'การจอง', icon: CalendarCheckIcon },
];
const navSettings = [
  { to: '/register-user', label: 'ลงทะเบียนผู้ใช้', icon: UserPlusIcon },
];

const pageTitles = {
  '/': 'แดชบอร์ด', '/users': 'จัดการลูกบ้าน', '/parcels': 'จัดการพัสดุ',
  '/events': 'กิจกรรมและประกาศ', '/social': 'Social Feed',
  '/facilities': 'สิ่งอำนวยความสะดวก', '/bookings': 'การจอง', '/register-user': 'ลงทะเบียนผู้ใช้',
};

function NavSection({ label, items }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 16px 4px', userSelect: 'none' }}>{label}</div>
      {items.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: R.md, textDecoration: 'none',
          fontSize: 14, fontWeight: isActive ? 600 : 400, background: isActive ? C.primary : 'transparent', color: isActive ? '#fff' : C.sub, minHeight: 40,
        })}>
          {({ isActive }) => <><n.icon s={18} c={isActive ? '#fff' : C.muted} />{n.label}</>}
        </NavLink>
      ))}
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const name = user?.full_name || user?.email || 'User';
  const currentPage = pageTitles[location.pathname] || 'Liven';

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg }}>
      <aside style={{ width: 240, background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.borderLight}` }}>
          <LogoIcon size={32} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Liven</div>
            <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.2 }}>Smart Community</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <NavSection label="หลัก" items={navMain} />
          <NavSection label="จัดการ" items={navManage} />
          <NavSection label="Facility" items={navFacility} />
          <NavSection label="ตั้งค่า" items={navSettings} />
        </nav>
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={() => setShowLogout(true)} style={{
            width: '100%', padding: '10px 16px', borderRadius: R.md, border: 'none',
            background: 'transparent', color: C.err, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
          }} aria-label="ออกจากระบบ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.err} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 56, background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{currentPage}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: C.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600,
            }}>{name.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.2 }}>นิติบุคคล</div>
            </div>
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 28, background: C.bg }}><Outlet /></main>
      </div>

      <ConfirmModal
        open={showLogout} title="ออกจากระบบ" message="ต้องการออกจากระบบใช่หรือไม่?"
        confirmLabel="ออกจากระบบ" confirmColor={C.err}
        onConfirm={() => { setShowLogout(false); signOut(); }}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  );
}
