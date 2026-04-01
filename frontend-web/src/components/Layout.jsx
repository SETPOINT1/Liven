import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', label: '📊 แดชบอร์ด' },
  { to: '/users', label: '👥 ผู้ใช้งาน' },
  { to: '/parcels', label: '📦 พัสดุ' },
  { to: '/events', label: '📅 กิจกรรม' },
  { to: '/social', label: '💬 Social Feed' },
  { to: '/analytics', label: '📈 Analytics' },
  { to: '/facilities', label: '🏢 สิ่งอำนวยความสะดวก' },
  { to: '/bookings', label: '📋 การจอง' },
  { to: '/register-user', label: '📝 ลงทะเบียน' },
];

const sidebarStyle = {
  width: 220,
  background: '#1a1a2e',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 0',
  flexShrink: 0,
};

const linkStyle = {
  display: 'block',
  padding: '12px 24px',
  color: '#ccc',
  textDecoration: 'none',
  fontSize: 14,
};

const activeLinkStyle = {
  ...linkStyle,
  color: '#fff',
  background: '#16213e',
  borderLeft: '3px solid #0f3460',
};

const headerStyle = {
  height: 56,
  background: '#fff',
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
};

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={sidebarStyle}>
        <div style={{ padding: '0 24px 20px', fontSize: 20, fontWeight: 'bold' }}>🏠 Liven</div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={headerStyle}>
          <span style={{ fontWeight: 600 }}>Liven Smart Community Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>{user?.full_name || user?.email || ''}</span>
            <button onClick={signOut} style={{ padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4, background: '#fff' }}>
              ออกจากระบบ
            </button>
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
