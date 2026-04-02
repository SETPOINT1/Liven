import { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, pageTitle, pageSub, th, td, btnSm } from '../theme';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    try { const { data } = await api.get('/manage/bookings/'); setBookings(data); } catch {}
    setLoading(false);
  }

  function handleCancel(b) {
    const name = b.facility?.name || 'Facility';
    const user = b.user?.full_name || 'User';
    setConfirm({
      open: true, title: 'ยกเลิกการจอง',
      message: `ต้องการยกเลิกการจอง "${name}" ของ "${user}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.patch(`/manage/bookings/${b.id}/cancel/`); showToast('ยกเลิกการจองสำเร็จ'); fetchBookings(); } catch {}
        setConfirm({ open: false });
      },
    });
  }

  const fmt = (d) => d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  return (
    <div>
      <h1 style={pageTitle}>จัดการการจอง</h1>
      <p style={pageSub}>รายการจองสิ่งอำนวยความสะดวกทั้งหมดในโครงการ</p>

      {toast && <div style={{ padding: '10px 16px', marginBottom: 14, borderRadius: R.sm, background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', fontSize: 14 }}>{toast}</div>}

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 15 }}>ยังไม่มีการจอง</div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>สิ่งอำนวยความสะดวก</th>
              <th style={th}>ผู้จอง</th>
              <th style={th}>เริ่ม</th>
              <th style={th}>สิ้นสุด</th>
              <th style={th}>สถานะ</th>
              <th style={th}>การดำเนินการ</th>
            </tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{b.facility?.name || '-'}</td>
                  <td style={{ ...td, color: C.sub }}>{b.user?.full_name || '-'}</td>
                  <td style={{ ...td, fontSize: 13, color: C.sub }}>{fmt(b.start_time)}</td>
                  <td style={{ ...td, fontSize: 13, color: C.sub }}>{fmt(b.end_time)}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: 12, fontWeight: 500, padding: '2px 10px', borderRadius: 99,
                      background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'cancelled' ? '#fee2e2' : '#fef9c3',
                      color: b.status === 'confirmed' ? '#15803d' : b.status === 'cancelled' ? '#b91c1c' : '#a16207',
                    }}>
                      {b.status === 'confirmed' ? 'ยืนยันแล้ว' : b.status === 'cancelled' ? 'ยกเลิกแล้ว' : b.status}
                    </span>
                  </td>
                  <td style={td}>
                    {b.status === 'confirmed' && (
                      <button style={btnSm(C.err)} onClick={() => handleCancel(b)}>ยกเลิก</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm({ open: false })} />
    </div>
  );
}
