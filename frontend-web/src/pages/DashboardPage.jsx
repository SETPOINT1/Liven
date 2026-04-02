import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { C, R, card, pageTitle, btn, inp, pageHeader } from '../theme';
import { UsersIcon, ParcelIcon, EventIcon, ChatIcon, FilterIcon, BarChartIcon, DashboardIcon } from '../components/Icons';

function EmptyChart({ label }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:C.muted }}>
      <BarChartIcon s={40} c={C.borderLight}/>
      <div style={{ marginTop:12, fontSize:13 }}>ยังไม่มีข้อมูล{label}</div>
      <div style={{ fontSize:11, color:C.border, marginTop:4 }}>ข้อมูลจะแสดงเมื่อมีการใช้งาน</div>
    </div>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [facilityUsage, setFacilityUsage] = useState([]);
  const [parcelStats, setParcelStats] = useState(null);
  const [chatbotTrends, setChatbotTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [parcelPendingCount, setParcelPendingCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (!startDate && !endDate) fetchAll();
  }, [startDate, endDate]);

  async function fetchAll() {
    setLoading(true);
    // Build analytics params with proper ISO datetime format
    const params = {};
    if (startDate) params.start_date = `${startDate}T00:00:00`;
    if (endDate) params.end_date = `${endDate}T23:59:59`;
    try {
      const [ch, fu, ps, ct, ev, parcels, users] = await Promise.all([
        api.get('/analytics/community-health/', { params }),
        api.get('/analytics/facility-usage/', { params }),
        api.get('/analytics/parcel-stats/', { params }),
        api.get('/analytics/chatbot-trends/', { params }),
        api.get('/events/'),
        api.get('/parcels/'),
        api.get('/users/'),
      ]);
      setHealth(ch.data);
      setEventCount((ev.data?.results || ev.data || []).length);

      // Parcel count from actual parcels list
      const parcelList = parcels.data?.results || parcels.data || [];
      setParcelPendingCount(Array.isArray(parcelList) ? parcelList.filter(p => p.status === 'pending').length : 0);

      // User count from actual users list
      const userList = users.data?.results || users.data || [];
      setUserCount(Array.isArray(userList) ? userList.length : 0);

      // Analytics data — map to correct response fields
      setFacilityUsage(fu.data?.facilities || fu.data?.data || fu.data || []);
      setParcelStats(ps.data);
      setChatbotTrends(ct.data?.top_questions || ct.data?.data || ct.data || []);
    } catch { /* analytics may not be available yet */ }
    setLoading(false);
  }

  if (loading) return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',height:'60vh' }}><div className="spinner"/></div>;

  const engagement = health?.engagement_level || {};
  const satisfactionRate = health?.satisfaction_rate ?? 0;
  const satColor = satisfactionRate >= 70 ? C.ok : satisfactionRate >= 40 ? C.warn : C.err;

  // Parcel stats from analytics API (filtered by date)
  const parcelReceived = parcelStats?.total_received ?? 0;
  const parcelPickedUp = parcelStats?.total_picked_up ?? 0;

  const stats = [
    { value: userCount, label: 'จำนวนผู้ใช้', icon: UsersIcon, color: '#2B6CB0', bg: '#EBF4FF', to: '/users' },
    { value: parcelPendingCount, label: 'พัสดุรอรับ', icon: ParcelIcon, color: '#D69E2E', bg: '#FFFFF0', to: '/parcels' },
    { value: eventCount, label: 'กิจกรรม', icon: EventIcon, color: '#38A169', bg: '#F0FFF4', to: '/events' },
    { value: engagement.post_count ?? 0, label: 'โพสต์ชุมชน', icon: ChatIcon, color: '#E53E3E', bg: '#FFF5F5', to: '/social' },
  ];

  // Chart data mapped from actual API response fields
  const facilityChartData = Array.isArray(facilityUsage)
    ? facilityUsage.map(f => ({ name: f.facility_name || f.name || '-', bookings: f.booking_count ?? f.count ?? 0 })) : [];

  const chatbotData = Array.isArray(chatbotTrends)
    ? chatbotTrends.slice(0, 5).map(t => ({ q: (t.question || t.keyword || '').substring(0, 40), count: t.count || 0 })) : [];
  const maxChatbot = Math.max(...chatbotData.map(d => d.count), 1);

  const isFiltered = startDate || endDate;

  return (
    <div>
      <div style={pageHeader(C.primary)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:42, height:42, borderRadius:R.md, background:C.primary+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <DashboardIcon s={22} c={C.primary}/>
            </div>
            <div>
              <h1 style={pageTitle}>แดชบอร์ดนิติบุคคล</h1>
              <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>ภาพรวมและสถิติชุมชน{isFiltered ? ' (กรองตามช่วงเวลา)' : ''}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input style={{ ...inp, width:150, marginBottom:0, fontSize:13 }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label="วันเริ่มต้น" />
            <span style={{ fontSize:12, color:C.muted }}>ถึง</span>
            <input style={{ ...inp, width:150, marginBottom:0, fontSize:13 }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label="วันสิ้นสุด" />
            <button onClick={fetchAll} style={{ ...btn, padding:'8px 14px', fontSize:13 }} aria-label="กรองข้อมูล"><FilterIcon s={14} c="#fff"/> กรอง</button>
            {isFiltered && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ ...btn, padding:'8px 14px', fontSize:13, background:'transparent', color:C.sub, border:`1px solid ${C.border}` }} aria-label="ล้างตัวกรอง">ล้าง</button>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => navigate(s.to)} style={{
            background: s.bg, borderRadius:R.lg, padding:'20px 18px',
            textAlign:'left', border:'none', cursor:'pointer',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)',
            display:'flex', flexDirection:'column', gap:8,
            borderLeft:`4px solid ${s.color}`,
            transition:'box-shadow 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width:38, height:38, borderRadius:R.md, background:s.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <s.icon s={20} c={s.color}/>
            </div>
            <div style={{ fontSize:26, fontWeight:700, color:C.text }}>{s.value ?? '-'}</div>
            <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Engagement Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
        {[
          { label: 'โพสต์', value: engagement.post_count ?? 0, color: C.info },
          { label: 'ความคิดเห็น', value: engagement.comment_count ?? 0, color: C.accent },
          { label: 'การจอง Facility', value: engagement.booking_count ?? 0, color: C.ok },
          { label: 'Engagement รวม', value: engagement.total ?? 0, color: C.primary },
        ].map(e => (
          <div key={e.label} style={{ ...card, padding:'16px 20px', borderTop:`3px solid ${e.color}`, textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:700, color:e.color }}>{e.value}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{e.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={{ ...card, borderTop:`3px solid ${C.primary}` }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>สถิติการใช้ Facility</h3>
          {facilityChartData.length === 0 ? <EmptyChart label=" Facility"/> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={facilityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis dataKey="name" fontSize={11} tick={{ fill:C.muted }}/>
                <YAxis fontSize={11} tick={{ fill:C.muted }}/>
                <Tooltip contentStyle={{ borderRadius:R.sm, border:`1px solid ${C.border}`, fontSize:12 }}/>
                <Bar dataKey="bookings" fill={C.accent} name="การจอง" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ ...card, borderTop:`3px solid ${C.ok}` }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>สถิติพัสดุ</h3>
          <div style={{ display:'flex', gap:20, justifyContent:'center', marginBottom:16 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:700, color:C.warn }}>{parcelReceived}</div>
              <div style={{ fontSize:12, color:C.muted }}>รอรับ</div>
            </div>
            <div style={{ width:1, background:C.borderLight }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:700, color:C.ok }}>{parcelPickedUp}</div>
              <div style={{ fontSize:12, color:C.muted }}>รับแล้ว</div>
            </div>
            <div style={{ width:1, background:C.borderLight }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:700, color:C.text }}>{parcelReceived + parcelPickedUp}</div>
              <div style={{ fontSize:12, color:C.muted }}>ทั้งหมด</div>
            </div>
          </div>
          {parcelReceived + parcelPickedUp === 0 && <EmptyChart label="พัสดุ"/>}
        </div>
      </div>

      {/* Satisfaction + Chatbot */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 20px', borderTop:`3px solid ${satColor}` }}>
          <div style={{ fontSize:12, fontWeight:600, color:satColor, marginBottom:12, textTransform:'uppercase', letterSpacing:'.03em' }}>อัตราความพึงพอใจ</div>
          <div style={{ position:'relative', width:130, height:130 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="56" fill="none" stroke={C.borderLight} strokeWidth="12"/>
              <circle cx="65" cy="65" r="56" fill="none" stroke={satColor} strokeWidth="12"
                strokeDasharray={`${(satisfactionRate/100)*352} 352`}
                strokeLinecap="round" transform="rotate(-90 65 65)"
                style={{ transition:'stroke-dasharray 0.5s ease' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
              <span style={{ fontSize:32, fontWeight:700, color:satColor }}>{satisfactionRate}</span>
              <span style={{ fontSize:12, color:C.muted }}>%</span>
            </div>
          </div>
          <div style={{ fontSize:13, color:C.sub, marginTop:12, fontWeight:500 }}>
            {satisfactionRate >= 70 ? 'ดีมาก' : satisfactionRate >= 40 ? 'ปานกลาง' : 'ต้องปรับปรุง'}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
            คำนวณจากอัตราส่วน engagement ต่อ report
          </div>
        </div>

        <div style={{ ...card, borderTop:`3px solid ${C.accent}` }}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>Top 5 คำถาม Chatbot</h3>
          {chatbotData.length === 0 ? <EmptyChart label=" Chatbot"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {chatbotData.map((d, i) => (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:C.sub, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.q}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.accent, marginLeft:8 }}>{d.count}</span>
                  </div>
                  <div style={{ height:8, background:C.borderLight, borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(d.count/maxChatbot)*100}%`, background:`linear-gradient(90deg, ${C.accent}, ${C.info})`, borderRadius:4, transition:'width 0.3s ease' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
