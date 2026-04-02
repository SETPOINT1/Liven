import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { C, R, card, pageTitle, pageSub, btn, inp } from '../theme';
import { UsersIcon, ParcelIcon, EventIcon, AlertIcon, FilterIcon } from '../components/Icons';

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [facilityUsage, setFacilityUsage] = useState([]);
  const [parcelStats, setParcelStats] = useState([]);
  const [chatbotTrends, setChatbotTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    try {
      const [ch, fu, ps, ct] = await Promise.all([
        api.get('/analytics/community-health/', { params }),
        api.get('/analytics/facility-usage/', { params }),
        api.get('/analytics/parcel-stats/', { params }),
        api.get('/analytics/chatbot-trends/', { params }),
      ]);
      setHealth(ch.data);
      setFacilityUsage(fu.data?.data || fu.data || []);
      setParcelStats(ps.data?.data || ps.data || []);
      setChatbotTrends(ct.data?.data || ct.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (loading) return <div style={{ display:'flex',justifyContent:'center',alignItems:'center',height:'60vh' }}><div className="spinner"/></div>;

  const engagement = health?.engagement_level || {};
  const satisfactionRate = health?.satisfaction_rate ?? 0;
  const facilityStats = health?.facility_stats || [];
  const householdCount = health?.household_count || engagement.total || 0;
  const parcelCount = health?.parcel_trends?.reduce?.((s,t) => s+(t.count||0), 0) || 0;
  const eventCount = health?.event_count || facilityStats.length || 0;
  const reportCount = health?.report_count || engagement.post_count || 0;
  const satColor = satisfactionRate >= 70 ? C.ok : satisfactionRate >= 40 ? C.warn : C.err;

  const stats = [
    { value: householdCount, label: 'จำนวนครัวเรือน', icon: UsersIcon, color: C.accent, to: '/users' },
    { value: parcelCount, label: 'พัสดุรอรับ', icon: ParcelIcon, color: C.warn, to: '/parcels' },
    { value: eventCount, label: 'กิจกรรมเดือนนี้', icon: EventIcon, color: C.ok, to: '/events' },
    { value: reportCount, label: 'แจ้งปัญหาใหม่', icon: AlertIcon, color: C.err, to: '/social' },
  ];

  const facilityChartData = Array.isArray(facilityUsage)
    ? facilityUsage.map(f => ({ name: f.name || f.facility_name || '-', bookings: f.booking_count ?? f.count ?? 0 })) : [];
  const parcelChartData = Array.isArray(parcelStats)
    ? parcelStats.map(p => ({ date: p.date || p.period || '-', received: p.received ?? p.arrived ?? 0, pickedUp: p.picked_up ?? 0 })) : [];
  const chatbotData = Array.isArray(chatbotTrends)
    ? chatbotTrends.slice(0, 5).map(t => ({ q: (t.question || t.keyword || '').substring(0, 40), count: t.count || 0 })) : [];
  const maxChatbot = Math.max(...chatbotData.map(d => d.count), 1);

  return (
    <div>
      {/* Row 1: Title + Date Filter */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={pageTitle}>แดชบอร์ดนิติบุคคล</h1>
          <p style={{ ...pageSub, margin:'4px 0 0' }}>ภาพรวมและสถิติชุมชนแบบเรียลไทม์</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input style={{ ...inp, width:150, marginBottom:0, fontSize:13 }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ fontSize:12, color:C.muted }}>ถึง</span>
          <input style={{ ...inp, width:150, marginBottom:0, fontSize:13 }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button onClick={fetchAll} style={{ ...btn, padding:'8px 14px', fontSize:13 }}><FilterIcon s={14} c="#fff"/> กรอง</button>
        </div>
      </div>

      {/* Row 2: Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => navigate(s.to)} style={{
            ...card, padding:'18px 16px', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', gap:8, textAlign:'left',
          }}>
            <div style={{ width:36, height:36, borderRadius:R.md, background:s.color+'14', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <s.icon s={18} c={s.color}/>
            </div>
            <div style={{ fontSize:24, fontWeight:700, color:C.text }}>{s.value ?? '-'}</div>
            <div style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Row 3: Charts side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        <div style={card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>สถิติการใช้ Facility</h3>
          {facilityChartData.length === 0 ? <p style={{ color:C.muted, fontSize:13 }}>ไม่มีข้อมูล</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={facilityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis dataKey="name" fontSize={11} tick={{ fill:C.muted }}/>
                <YAxis fontSize={11} tick={{ fill:C.muted }}/>
                <Tooltip contentStyle={{ borderRadius:R.sm, border:`1px solid ${C.border}`, fontSize:12 }}/>
                <Bar dataKey="bookings" fill={C.primary} name="การจอง" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>สถิติพัสดุ</h3>
          {parcelChartData.length === 0 ? <p style={{ color:C.muted, fontSize:13 }}>ไม่มีข้อมูล</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={parcelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight}/>
                <XAxis dataKey="date" fontSize={11} tick={{ fill:C.muted }}/>
                <YAxis fontSize={11} tick={{ fill:C.muted }}/>
                <Tooltip contentStyle={{ borderRadius:R.sm, border:`1px solid ${C.border}`, fontSize:12 }}/>
                <Line type="monotone" dataKey="received" stroke={C.primary} name="รับเข้า" strokeWidth={2} dot={{ r:3 }}/>
                <Line type="monotone" dataKey="pickedUp" stroke={C.ok} name="รับแล้ว" strokeWidth={2} dot={{ r:3 }}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4: Satisfaction + Chatbot Trends */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Satisfaction Rate with circular progress */}
        <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 20px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:C.muted, marginBottom:12, textTransform:'uppercase', letterSpacing:'.03em' }}>อัตราความพึงพอใจ</div>
          <div style={{ position:'relative', width:120, height:120 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke={C.borderLight} strokeWidth="10"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke={satColor} strokeWidth="10"
                strokeDasharray={`${(satisfactionRate/100)*327} 327`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition:'stroke-dasharray 0.5s ease' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
              <span style={{ fontSize:28, fontWeight:700, color:satColor }}>{satisfactionRate}</span>
              <span style={{ fontSize:11, color:C.muted }}>%</span>
            </div>
          </div>
          <div style={{ fontSize:12, color:C.sub, marginTop:10 }}>
            {satisfactionRate >= 70 ? 'ดีมาก' : satisfactionRate >= 40 ? 'ปานกลาง' : 'ต้องปรับปรุง'}
          </div>
        </div>

        {/* Chatbot Trends - horizontal bars */}
        <div style={card}>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 14px', color:C.text }}>Top 5 คำถาม Chatbot</h3>
          {chatbotData.length === 0 ? <p style={{ color:C.muted, fontSize:13 }}>ไม่มีข้อมูล</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {chatbotData.map((d, i) => (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, color:C.sub, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.q}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:C.text, marginLeft:8 }}>{d.count}</span>
                  </div>
                  <div style={{ height:6, background:C.borderLight, borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(d.count/maxChatbot)*100}%`, background:C.accent, borderRadius:3, transition:'width 0.3s ease' }}/>
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
