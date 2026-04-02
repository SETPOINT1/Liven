import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { C, R, card, pageTitle, btn, inp, pageHeader, statCard, emptyState } from '../theme';
import { FilterIcon, BarChartIcon, LayersIcon } from '../components/Icons';

function EmptyChart({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: C.muted }}>
      <BarChartIcon s={40} c={C.borderLight} />
      <div style={{ marginTop: 12, fontSize: 13 }}>ยังไม่มีข้อมูล{label}</div>
      <div style={{ fontSize: 11, color: C.border, marginTop: 4 }}>ข้อมูลจะแสดงเมื่อมีการใช้งาน</div>
    </div>
  );
}

const PIE_COLORS = [C.accent, C.ok, C.warn, C.err, '#7c3aed', C.info];

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [facilityUsage, setFacilityUsage] = useState([]);
  const [parcelStats, setParcelStats] = useState([]);
  const [chatbotTrends, setChatbotTrends] = useState([]);
  const [satisfactionRate, setSatisfactionRate] = useState(0);
  const [health, setHealth] = useState(null);
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
      setHealth(ch.data);
    } catch {}
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const facilityChartData = Array.isArray(facilityUsage)
    ? facilityUsage.map((f) => ({ name: f.name || f.facility_name || '-', bookings: f.booking_count ?? f.count ?? 0 })) : [];
  const parcelChartData = Array.isArray(parcelStats)
    ? parcelStats.map((p) => ({ date: p.date || p.period || '-', received: p.received ?? p.arrived ?? 0, pickedUp: p.picked_up ?? 0 })) : [];
  const chatbotChartData = Array.isArray(chatbotTrends)
    ? chatbotTrends.slice(0, 10).map((t) => ({ question: (t.question || t.keyword || '').substring(0, 30), count: t.count || 0 })) : [];

  const satColor = satisfactionRate >= 70 ? C.ok : satisfactionRate >= 40 ? C.warn : C.err;
  const engagement = health?.engagement_level || {};
  const totalParcels = parcelChartData.reduce((s, p) => s + (p.received || 0), 0);
  const totalBookings = facilityChartData.reduce((s, f) => s + (f.bookings || 0), 0);

  // Pie data for facility distribution
  const facilityPieData = facilityChartData.filter(f => f.bookings > 0);

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.primary)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.primary + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChartIcon s={22} c={C.primary} />
            </div>
            <div>
              <h1 style={pageTitle}>Analytics</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>สถิติและข้อมูลเชิงลึกของชุมชน</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input style={{ ...inp, width: 150, marginBottom: 0, fontSize: 13 }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="วันเริ่มต้น" />
            <span style={{ fontSize: 12, color: C.muted }}>ถึง</span>
            <input style={{ ...inp, width: 150, marginBottom: 0, fontSize: 13 }} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="วันสิ้นสุด" />
            <button onClick={fetchAll} style={btn} aria-label="กรองข้อมูล"><FilterIcon s={14} c="#fff" /> กรอง</button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={statCard(satColor)}>
          <div style={{ width: 40, height: 40, borderRadius: R.md, background: satColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LayersIcon s={20} c={satColor} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: satColor, lineHeight: 1.2 }}>{satisfactionRate}%</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>ความพึงพอใจ</div>
          </div>
        </div>
        <div style={statCard(C.accent)}>
          <div style={{ width: 40, height: 40, borderRadius: R.md, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChartIcon s={20} c={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{totalBookings}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>การจองทั้งหมด</div>
          </div>
        </div>
        <div style={statCard(C.ok)}>
          <div style={{ width: 40, height: 40, borderRadius: R.md, background: C.ok + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChartIcon s={20} c={C.ok} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{totalParcels}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>พัสดุรับเข้า</div>
          </div>
        </div>
        <div style={statCard(C.info)}>
          <div style={{ width: 40, height: 40, borderRadius: R.md, background: C.info + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChartIcon s={20} c={C.info} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{chatbotChartData.reduce((s, c) => s + c.count, 0)}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>คำถาม Chatbot</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ ...card, borderTop: `3px solid ${C.primary}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>สถิติการใช้ Facility</h3>
          {facilityChartData.length === 0 ? <EmptyChart label=" Facility" /> : (
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
        <div style={{ ...card, borderTop: `3px solid ${C.accent}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>สัดส่วนการใช้ Facility</h3>
          {facilityPieData.length === 0 ? <EmptyChart label="" /> : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={facilityPieData} dataKey="bookings" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {facilityPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: R.sm, border: `1px solid ${C.border}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {facilityPieData.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.sub }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ ...card, borderTop: `3px solid ${C.ok}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>สถิติพัสดุ</h3>
          {parcelChartData.length === 0 ? <EmptyChart label="พัสดุ" /> : (
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
        <div style={{ ...card, borderTop: `3px solid ${C.info}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: C.text }}>Top 10 คำถาม Chatbot</h3>
          {chatbotChartData.length === 0 ? <EmptyChart label=" Chatbot" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chatbotChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                <XAxis type="number" fontSize={11} tick={{ fill: C.muted }} />
                <YAxis dataKey="question" type="category" width={180} fontSize={11} tick={{ fill: C.muted }} />
                <Tooltip contentStyle={{ borderRadius: R.sm, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Bar dataKey="count" fill={C.accent} name="จำนวนครั้ง" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Satisfaction Gauge */}
      <div style={{ ...card, borderTop: `3px solid ${satColor}`, display: 'flex', alignItems: 'center', gap: 32, padding: '28px 32px' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke={C.borderLight} strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={satColor} strokeWidth="10"
              strokeDasharray={`${(satisfactionRate / 100) * 327} 327`}
              strokeLinecap="round" transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: satColor }}>{satisfactionRate}</span>
            <span style={{ fontSize: 11, color: C.muted }}>%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>อัตราความพึงพอใจ</div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
            {satisfactionRate >= 70 ? 'ชุมชนมีความพึงพอใจในระดับดีมาก ควรรักษามาตรฐานนี้ไว้' :
             satisfactionRate >= 40 ? 'ความพึงพอใจอยู่ในระดับปานกลาง มีโอกาสปรับปรุงได้อีก' :
             'ความพึงพอใจต่ำ ควรเร่งปรับปรุงบริการและสื่อสารกับลูกบ้าน'}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            ครัวเรือนทั้งหมด: {health?.household_count || engagement.total || '-'} | โพสต์: {engagement.post_count || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
