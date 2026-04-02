import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { C, R } from '../theme';
import { DashboardIcon, UsersIcon, ParcelIcon, EventIcon, ChatIcon, BarChartIcon, PlusIcon, BellIcon, LogoIcon, BuildingIcon, CalendarCheckIcon } from './Icons';

const nav = [
  { to:'/',label:'แดชบอร์ด',icon:DashboardIcon },
  { to:'/users',label:'จัดการลูกบ้าน',icon:UsersIcon },
  { to:'/parcels',label:'จัดการพัสดุ',icon:ParcelIcon },
  { to:'/events',label:'จัดการกิจกรรม',icon:EventIcon },
  { to:'/social',label:'Social Feed',icon:ChatIcon },
  { to:'/analytics',label:'Analytics',icon:BarChartIcon },
  { to:'/facilities',label:'สิ่งอำนวยความสะดวก',icon:BuildingIcon },
  { to:'/bookings',label:'การจอง',icon:CalendarCheckIcon },
  { to:'/register-user',label:'ลงทะเบียน',icon:PlusIcon },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const name = user?.full_name || user?.email || 'User';
  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg }}>
      <aside style={{ width:240, background:C.card, borderRight:`1px solid ${C.border}`, flexShrink:0 }}>
        <nav style={{ flex:1, padding:'20px 14px', display:'flex', flexDirection:'column', gap:4 }}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'} style={({isActive})=>({
              display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:R.md,textDecoration:'none',
              fontSize:15,fontWeight:isActive?600:400,background:isActive?C.primary:'transparent',color:isActive?'#fff':C.sub,minHeight:44,
            })}>
              {({isActive})=><><n.icon s={20} c={isActive?'#fff':C.muted}/>{n.label}</>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <header style={{ height:60, background:C.card, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <LogoIcon size={36}/>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, lineHeight:1.2 }}>Liven</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.2 }}>Smart Community</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ position:'relative', cursor:'pointer', padding:6 }}><BellIcon s={22} c={C.sub}/></div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button style={{ width:36, height:36, borderRadius:'50%', background:C.accent, color:'#fff', border:'none', fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>{name.charAt(0).toUpperCase()}</button>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.2 }}>{name}</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.2 }}>นิติบุคคล</div>
              </div>
            </div>
          </div>
        </header>
        <main style={{ flex:1, overflow:'auto', padding:28, background:C.bg }}><Outlet/></main>
      </div>
    </div>
  );
}
