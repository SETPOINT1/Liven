import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { C, R, card, pageTitle, pageSub } from '../theme';
import { DashboardHeroIcon, ParcelIcon, EventIcon, UsersIcon, AlertIcon } from '../components/Icons';

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/analytics/community-health/'); setHealth(data); }
      catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const engagement = health?.engagement_level || {};
  const facilityStats = health?.facility_stats || [];
  const parcelCount = health?.parcel_trends?.reduce?.((s, t) => s + (t.count || 0), 0) || 0;
  const eventCount = health?.event_count || facilityStats.length || 0;
  const reportCount = health?.report_count || engagement.posts || 0;
  const householdCount = health?.household_count || engagement.total_interactions || 0;

  const stats = [
    { value: householdCount, label: 'จำนวนครัวเรือน', icon: UsersIcon, color: C.accent, to: '/users' },
    { value: parcelCount, label: 'พัสดุรอรับ', icon: ParcelIcon, color: C.warn, to: '/parcels' },
    { value: eventCount, label: 'กิจกรรมเดือนนี้', icon: EventIcon, color: C.ok, to: '/events' },
    { value: reportCount, label: 'แจ้งปัญหาใหม่', icon: AlertIcon, color: C.err, to: '/social' },
  ];

  return (
    <div>
      <h1 style={pageTitle}>แดชบอร์ดนิติบุคคล</h1>
      <p style={pageSub}>ภาพรวมและการจัดการชุมชนแบบเรียลไทม์</p>

      <div style={{ ...card, padding: '40px 24px', textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <DashboardHeroIcon size={64} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
          แดชบอร์ดนิติบุคคล
        </h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          Dashboard สำหรับวิเคราะห์ข้อมูลชุมชนแบบเรียลไทม์<br />
          พร้อมเครื่องมือจัดการพัสดุ, กิจกรรม, และสิทธิ์ผู้ใช้
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.to)}
            style={{
              background: C.card, borderRadius: R.lg, padding: '20px 18px',
              textAlign: 'left', border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: R.md,
              background: s.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon s={20} c={s.color} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{s.value ?? '-'}</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
