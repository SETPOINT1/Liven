import { useState, useEffect } from 'react';
import api from '../services/api';

const statCard = { background: '#fff', borderRadius: 8, padding: 20, flex: 1, minWidth: 200, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const gridStyle = { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 };
const sectionStyle = { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get('/analytics/community-health/');
        setHealth(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return <div>กำลังโหลด...</div>;
  if (!health) return <div>ไม่สามารถโหลดข้อมูลได้</div>;

  const engagement = health.engagement_level || {};
  const facilityStats = health.facility_stats || [];
  const chatbotTrends = health.chatbot_trends || [];
  const satisfactionRate = health.satisfaction_rate ?? 0;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Community Health Overview</h2>

      <div style={gridStyle}>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#999' }}>Engagement Level</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{engagement.total_interactions ?? '-'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>โพสต์: {engagement.posts ?? 0} | คอมเมนต์: {engagement.comments ?? 0}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#999' }}>อัตราความพึงพอใจ</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: satisfactionRate >= 70 ? '#52c41a' : satisfactionRate >= 40 ? '#faad14' : '#ff4d4f' }}>
            {satisfactionRate}%
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#999' }}>Facility ที่ใช้งาน</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{facilityStats.length}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#999' }}>คำถาม Chatbot</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{chatbotTrends.reduce?.((sum, t) => sum + (t.count || 0), 0) || 0}</div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 12 }}>สถิติ Facility</h3>
        {facilityStats.length === 0 ? <p style={{ color: '#999' }}>ไม่มีข้อมูล</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontSize: 13 }}>Facility</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontSize: 13 }}>จำนวนการจอง</th>
              </tr>
            </thead>
            <tbody>
              {facilityStats.map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f5f5f5' }}>{f.name || f.facility_name || '-'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f5f5f5' }}>{f.booking_count ?? f.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 12 }}>แนวโน้มคำถาม Chatbot</h3>
        {chatbotTrends.length === 0 ? <p style={{ color: '#999' }}>ไม่มีข้อมูล</p> : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {chatbotTrends.slice(0, 10).map((t, i) => (
              <li key={i} style={{ marginBottom: 4, fontSize: 14 }}>
                {t.question || t.keyword || '-'} — <strong>{t.count || 0}</strong> ครั้ง
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
