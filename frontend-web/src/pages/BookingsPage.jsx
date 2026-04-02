import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, pageTitle, th, td, btnSm, pageHeader, searchBox, statCard, badge, emptyState, toastStyle } from '../theme';
import { CalendarCheckIcon, SearchIcon, CheckIcon, CloseIcon, ClockIcon } from '../components/Icons';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('start_time');
  const [sortDir, setSortDir] = useState('desc');

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    try { const { data } = await api.get('/manage/bookings/'); setBookings(data); }
    catch { showToast('ไม่สามารถโหลดข้อมูลการจองได้', 'error'); }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = bookings;
    if (filterStatus !== 'all') list = list.filter(b => b.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.facility?.name || '').toLowerCase().includes(q) ||
        (b.user?.full_name || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let av, bv;
      if (sortField === 'facility') { av = a.facility?.name || ''; bv = b.facility?.name || ''; }
      else if (sortField === 'user') { av = a.user?.full_name || ''; bv = b.user?.full_name || ''; }
      else { av = a[sortField] || ''; bv = b[sortField] || ''; }
      return sortDir === 'asc' ? av.toString().localeCompare(bv.toString()) : bv.toString().localeCompare(av.toString());
    });
    return list;
  }, [bookings, search, filterStatus, sortField, sortDir]);

  const counts = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    pending: bookings.filter(b => b.status !== 'confirmed' && b.status !== 'cancelled').length,
  }), [bookings]);

  function handleCancel(b) {
    const name = b.facility?.name || 'Facility';
    const user = b.user?.full_name || 'User';
    setConfirm({
      open: true, title: 'ยกเลิกการจอง',
      message: `ต้องการยกเลิกการจอง "${name}" ของ "${user}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.patch(`/manage/bookings/${b.id}/cancel/`); showToast('ยกเลิกการจองสำเร็จ'); fetchBookings(); }
        catch { showToast('ไม่สามารถยกเลิกการจองได้', 'error'); }
        setConfirm({ open: false });
      },
    });
  }

  const fmt = (d) => d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  const statsData = [
    { label: 'การจองทั้งหมด', value: counts.total, color: C.accent, icon: CalendarCheckIcon },
    { label: 'ยืนยันแล้ว', value: counts.confirmed, color: C.ok, icon: CheckIcon },
    { label: 'ยกเลิกแล้ว', value: counts.cancelled, color: C.err, icon: CloseIcon },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.accent)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarCheckIcon s={22} c={C.accent} />
          </div>
          <div>
            <h1 style={pageTitle}>จัดการการจอง</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>รายการจองสิ่งอำนวยความสะดวกทั้งหมดในโครงการ</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {statsData.map(s => (
          <div key={s.label} style={statCard(s.color)}>
            <div style={{ width: 40, height: 40, borderRadius: R.md, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon s={20} c={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {toast && <div style={toastStyle(toast.type)}>{toast.msg}</div>}

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={searchBox}>
          <SearchIcon s={16} c={C.muted} />
          <input placeholder="ค้นหาสิ่งอำนวยความสะดวก, ผู้จอง..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: 14, color: C.text, flex: 1 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: R.sm, fontSize: 14, color: C.sub, background: C.card, cursor: 'pointer' }}>
          <option value="all">ทุกสถานะ ({counts.total})</option>
          <option value="confirmed">ยืนยันแล้ว ({counts.confirmed})</option>
          <option value="cancelled">ยกเลิกแล้ว ({counts.cancelled})</option>
        </select>
        <div style={{ fontSize: 13, color: C.muted }}>แสดง {filtered.length} จาก {bookings.length} รายการ</div>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyState}>
          <CalendarCheckIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>
            {search || filterStatus !== 'all' ? 'ไม่พบการจองที่ตรงกับเงื่อนไข' : 'ยังไม่มีการจอง'}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {search || filterStatus !== 'all' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'การจองจะปรากฏที่นี่เมื่อลูกบ้านทำการจอง'}
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('facility'); setSortDir(sortField === 'facility' && sortDir === 'asc' ? 'desc' : 'asc'); }}>สิ่งอำนวยความสะดวก {sortField === 'facility' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('user'); setSortDir(sortField === 'user' && sortDir === 'asc' ? 'desc' : 'asc'); }}>ผู้จอง {sortField === 'user' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('start_time'); setSortDir(sortField === 'start_time' && sortDir === 'asc' ? 'desc' : 'asc'); }}>เริ่ม {sortField === 'start_time' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={th}>สิ้นสุด</th>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('status'); setSortDir(sortField === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}>สถานะ {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={th}>การดำเนินการ</th>
            </tr></thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} onMouseEnter={e => e.currentTarget.style.background = '#F7FAFC'} onMouseLeave={e => e.currentTarget.style.background = ''} style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{b.facility?.name || '-'}</td>
                  <td style={{ ...td, color: C.sub }}>{b.user?.full_name || '-'}</td>
                  <td style={{ ...td, fontSize: 13, color: C.sub }}>{fmt(b.start_time)}</td>
                  <td style={{ ...td, fontSize: 13, color: C.sub }}>{fmt(b.end_time)}</td>
                  <td style={td}>
                    <span style={badge(
                      b.status === 'confirmed' ? '#dcfce7' : b.status === 'cancelled' ? '#fee2e2' : '#fef9c3',
                      b.status === 'confirmed' ? '#15803d' : b.status === 'cancelled' ? '#b91c1c' : '#a16207'
                    )}>
                      {b.status === 'confirmed' ? 'ยืนยันแล้ว' : b.status === 'cancelled' ? 'ยกเลิกแล้ว' : b.status}
                    </span>
                  </td>
                  <td style={td}>
                    {b.status === 'confirmed' && (
                      <button style={btnSm(C.err)} onClick={() => handleCancel(b)} aria-label={`ยกเลิกการจอง ${b.facility?.name}`}>ยกเลิก</button>
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
