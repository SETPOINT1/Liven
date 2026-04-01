import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/ConfirmModal';

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '2px solid #e8e8e8', fontSize: 13, color: '#555' };
const tdStyle = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12 });

const STATUS_MAP = {
  confirmed: { label: 'ยืนยันแล้ว', color: '#52c41a' },
  cancelled: { label: 'ยกเลิกแล้ว', color: '#8c8c8c' },
};

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchBookings() {
    try {
      const { data } = await api.get('/manage/bookings/');
      setBookings(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function handleCancel(booking) {
    setConfirm({
      open: true,
      title: 'ยกเลิกการจอง',
      message: `ต้องการยกเลิกการจอง "${booking.facility?.name || '-'}" ของ ${booking.user?.full_name || '-'} ใช่หรือไม่?`,
      action: async () => {
        await api.post(`/manage/bookings/${booking.id}/cancel/`);
        setConfirm({ open: false });
        fetchBookings();
      },
    });
  }

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>จัดการการจอง</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ชื่อ Facility</th>
            <th style={thStyle}>ชื่อผู้จอง</th>
            <th style={thStyle}>วันที่</th>
            <th style={thStyle}>เวลา</th>
            <th style={thStyle}>สถานะ</th>
            <th style={thStyle}>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const st = STATUS_MAP[b.status] || { label: b.status, color: '#555' };
            return (
              <tr key={b.id}>
                <td style={tdStyle}>{b.facility?.name || '-'}</td>
                <td style={tdStyle}>{b.user?.full_name || '-'}</td>
                <td style={tdStyle}>{formatDate(b.start_time)}</td>
                <td style={tdStyle}>{formatTime(b.start_time)} - {formatTime(b.end_time)}</td>
                <td style={tdStyle}>
                  <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                </td>
                <td style={tdStyle}>
                  {b.status === 'confirmed' && (
                    <button style={btnSmall('#ff4d4f')} onClick={() => handleCancel(b)}>ยกเลิก</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.action}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  );
}
