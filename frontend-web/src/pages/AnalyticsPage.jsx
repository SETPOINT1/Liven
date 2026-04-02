import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { C, R, card, pageTitle, pageSub, btn, inp } from '../theme';
import { FilterIcon } from '../components/Icons';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [facilityUsage, setFacilityUsage] = useState([]);
  const [parcelStats, setParcelStats] = useState([]);
  const [chatbotTrends, setChatbotTrends] = useState([]);
  const [satisfactionRate, setSatisfactionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    try {
      const [fu, ps, ct, ch] = await Promise.all([
        api.get('/analytics/facility-usage/', { params }),
        api.get('/analytics/parcel-stats/', { params }),
        api.get('/analytics/chatbot-trends/', { params }),
        api.get('/analytics/community-health/', { params }),
      ]);
      setFacilityUsage(fu.data?.data || fu.data || []);
      setParcelStats(ps.data?.data || ps.data || []);
      setChatbotTrends(ct.data?.data || ct.data || []);
      setSatisfactionRate(ch.data?.satisfaction_rate ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const facilityChartData = Array.isArray(facilityUsage)
    ? facilityUsage.map((f) => ({ name: f.name || f.facility_name || '-', bookings: f.booking_count ?? f.count ?? 0 }))
    : [];
  const parcelChartData = Array.isArray(parcelStats)
    ? parcelStats.map((p) => ({ date: p.date || p.period || '-', received: p.received ?? p.arrived ?? 0, pickedUp: p.picked_up ?? 0 }))
    : [];
  const chatbotChartData = Array.isArray(chatbotTrends)
    ? chatbotTrends.slice(0, 10).map((t) => ({ question: (t.question || t.keyword || '').substring(0, 30), count: t.count || 0 }))
    : [];

  const satColor = satisfactionRate >= 70 ? C.ok : satisfactionRate >= 40 ? C.warn : C.err;

  return (
    <div>
      <h1 style={pageTitle}>Analytics</h1>
      <p style={pageSub}>สถิติและข้อมูลเชิงลึกของชุมชน</p>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input style={{ ...inp, width: 160, marginBottom: 0 }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span style={{ fontSize: 12, color: C.muted }}>ถึง</span>
        <input style={{ ...inp, width: 160, marginBottom: 0 }} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={fetchAll} style={btn}>
          <FilterIcon s={14} c="#fff" /> กรอง
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>อัตราความพึงพอใจ</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: satColor }}>{satisfactionRate}%</div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>สถิติการใช้ Facility</h3>
        {facilityChartData.length === 0 ? <p style={{ color: C.muted, fontSize: 13 }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={facilityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: C.muted }} />
              <YAxis fontSize={11} tick={{ fill: C.muted }} />
              <Tooltip contentStyle={{ borderRadius: R.sm, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Bar dataKey="bookings" fill={C.primary} name="จำนวนการจอง" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>สถิติพัสดุ</h3>
        {parcelChartData.length === 0 ? <p style={{ color: C.muted, fontSize: 13 }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={parcelChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: C.muted }} />
              <YAxis fontSize={11} tick={{ fill: C.muted }} />
              <Tooltip contentStyle={{ borderRadius: R.sm, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="received" stroke={C.primary} name="รับเข้า" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pickedUp" stroke={C.ok} name="รับแล้ว" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>Top 10 คำถาม Chatbot</h3>
        {chatbotChartData.length === 0 ? <p style={{ color: C.muted, fontSize: 13 }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chatbotChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
              <XAxis type="number" fontSize={11} tick={{ fill: C.muted }} />
              <YAxis dataKey="question" type="category" width={200} fontSize={11} tick={{ fill: C.muted }} />
              <Tooltip contentStyle={{ borderRadius: R.sm, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Bar dataKey="count" fill={C.accent} name="จำนวนครั้ง" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
