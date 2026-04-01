import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { colors, radius } from '../theme';
import {
  DashboardIcon, UsersIcon, ParcelIcon, EventIcon,
  ChatIcon, BellIcon, LogoIcon, PlusIcon, BarChartIcon,
} from './Icons';

const navItems = [
  { to: '/', label: 'แดชบอร์ด', icon: DashboardIcon },
  { to: '/users', label: 'จัดการลูกบ้าน', icon: UsersIcon },
  { to: '/parcels', label: 'จัดการพัสดุ', icon: ParcelIcon },
  { to: '/events', label: 'จัดการกิจกรรม', icon: EventIcon },
  { to: '/social', label: 'Social Feed', icon: ChatIcon },
  { to: '/analytics', label: 'Analytics', icon: BarChartIcon },
  { to: '/register-user', label: 'ลงทะเบียน', icon: PlusIcon },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const displayName = user?.full_name || user?.email || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 250, background: colors.card, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${colors.border}`, flexShrink: 0,
      }}>
        <nav style={{ flex: 1, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: radius.md, textDecoration: 'none',
                fontSize: 15, fontWeight: isActive ? 600 : 400,
                background: isActive ? colors.primary : 'transparent',
                color: isActive ? '#fff' : colors.textSecondary,
                minHeight: 44,
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} color={isActive ? '#fff' : colors.textMuted} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: 60, background: colors.card, borderBottom: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoIcon size={36} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>Liven</div>
              <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.2 }}>Smart Community</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', cursor: 'pointer', padding: 6 }}>
              <BellIcon size={22} color={colors.textSecondary} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={signOut}
                title="ออกจากระบบ"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: colors.accent, color: '#fff', border: 'none',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {initials}
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, lineHeight: 1.2 }}>{displayName}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.2 }}>นิติบุคคล</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 28, background: colors.bg }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
