import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const sectionStyle = { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const inputStyle = { padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginRight: 8 };
const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f38181', '#fce38a', '#95e1d3', '#aa96da', '#fcbad3'];

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

  function handleFilter() { fetchAll(); }

  if (loading) return <div>กำลังโหลด...</div>;

  const facilityChartData = Array.isArray(facilityUsage)
    ? facilityUsage.map((f) => ({ name: f.name || f.facility_name || '-', bookings: f.booking_count ?? f.count ?? 0 }))
    : [];

  const parcelChartData = Array.isArray(parcelStats)
    ? parcelStats.map((p) => ({ date: p.date || p.period || '-', received: p.received ?? p.arrived ?? 0, pickedUp: p.picked_up ?? 0 }))
    : [];

  const chatbotChartData = Array.isArray(chatbotTrends)
    ? chatbotTrends.slice(0, 10).map((t) => ({ question: (t.question || t.keyword || '').substring(0, 30), count: t.count || 0 }))
    : [];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Analytics</h2>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center' }}>
        <label style={{ fontSize: 13, marginRight: 8 }}>ช่วงเวลา:</label>
        <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span style={{ marginRight: 8 }}>ถึง</span>
        <input style={inputStyle} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={handleFilter} style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          กรอง
        </button>
      </div>

      <div style={{ ...sectionStyle }}>
        <h3 style={{ marginBottom: 12 }}>อัตราความพึงพอใจ</h3>
        <div style={{ fontSize: 48, fontWeight: 700, color: satisfactionRate >= 70 ? '#52c41a' : satisfactionRate >= 40 ? '#faad14' : '#ff4d4f' }}>
          {satisfactionRate}%
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 12 }}>สถิติการใช้ Facility</h3>
        {facilityChartData.length === 0 ? <p style={{ color: '#999' }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={facilityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookings" fill="#1a1a2e" name="จำนวนการจอง" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 12 }}>สถิติพัสดุ</h3>
        {parcelChartData.length === 0 ? <p style={{ color: '#999' }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={parcelChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="received" stroke="#1a1a2e" name="รับเข้า" />
              <Line type="monotone" dataKey="pickedUp" stroke="#52c41a" name="รับแล้ว" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 12 }}>Top 10 คำถาม Chatbot</h3>
        {chatbotChartData.length === 0 ? <p style={{ color: '#999' }}>ไม่มีข้อมูล</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chatbotChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="question" type="category" width={200} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f3460" name="จำนวนครั้ง" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
