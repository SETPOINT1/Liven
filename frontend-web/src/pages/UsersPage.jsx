import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, th, td, pageTitle, pageHeader, searchBox, statCard, badge, emptyState, toastStyle } from '../theme';
import { UsersIcon, SearchIcon, ShieldIcon, ClockIcon, CheckIcon, CloseIcon } from '../components/Icons';

const statusMap = {
  pending:   { label: 'รอการอนุมัติ', bg: '#fef9c3', color: '#a16207' },
  approved:  { label: 'อนุมัติแล้ว',  bg: '#dcfce7', color: '#15803d' },
  rejected:  { label: 'ถูกปฏิเสธ',   bg: '#fee2e2', color: '#b91c1c' },
  suspended: { label: 'ถูกระงับ',     bg: '#f3f4f6', color: '#6b7280' },
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
    const channel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function fetchUsers() {
    try { const { data } = await api.get('/users/'); setUsers(data); }
    catch { showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error'); }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = users;
    if (filterStatus !== 'all') list = list.filter(u => u.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.unit_number || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase();
      const bv = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [users, search, filterStatus, sortField, sortDir]);

  const counts = useMemo(() => ({
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }), [users]);

  async function handleStatusChange(id, name, newStatus) {
    const labels = { approved: 'อนุมัติ', rejected: 'ปฏิเสธ', suspended: 'ระงับ', pending: 'รอการอนุมัติ' };
    setConfirm({
      open: true,
      title: 'เปลี่ยนสถานะผู้ใช้',
      message: `ต้องการเปลี่ยนสถานะของ "${name}" เป็น "${labels[newStatus]}" ใช่หรือไม่?`,
      confirmColor: newStatus === 'approved' ? C.ok : C.err,
      confirmLabel: labels[newStatus],
      action: async () => {
        try {
          if (newStatus === 'approved') await api.patch(`/users/${id}/approve/`);
          else await api.patch(`/users/${id}/reject/`);
          fetchUsers();
          setConfirm({ open: false });
          showToast(`เปลี่ยนสถานะ "${name}" เป็น "${labels[newStatus]}" สำเร็จ`);
        } catch { showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error'); setConfirm({ open: false }); }
      },
    });
  }

  async function handleRoleChange(id, role) {
    try {
      await api.patch(`/users/${id}/role/`, { role });
      fetchUsers();
      showToast('เปลี่ยนบทบาทสำเร็จ');
    } catch { showToast('เกิดข้อผิดพลาดในการเปลี่ยนบทบาท', 'error'); }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const statsData = [
    { label: 'ผู้ใช้ทั้งหมด', value: counts.total, color: C.accent, icon: UsersIcon },
    { label: 'รออนุมัติ', value: counts.pending, color: C.warn, icon: ClockIcon },
    { label: 'อนุมัติแล้ว', value: counts.approved, color: C.ok, icon: CheckIcon },
    { label: 'ถูกปฏิเสธ', value: counts.rejected, color: C.err, icon: CloseIcon },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.accent)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UsersIcon s={22} c={C.accent} />
          </div>
          <div>
            <h1 style={pageTitle}>จัดการผู้ใช้งาน</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>อนุมัติ ปฏิเสธ หรือเปลี่ยนบทบาทผู้ใช้ในโครงการ</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
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

      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.type === 'error' ? <CloseIcon s={14} c="#b91c1c" /> : <CheckIcon s={14} c="#166534" />}
          {toast.msg}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={searchBox}>
          <SearchIcon s={16} c={C.muted} />
          <input
            placeholder="ค้นหาชื่อ, อีเมล, เลขห้อง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: 14, color: C.text, flex: 1 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: R.sm, fontSize: 14, color: C.sub, background: C.card, cursor: 'pointer' }}
        >
          <option value="all">ทุกสถานะ ({counts.total})</option>
          <option value="pending">รออนุมัติ ({counts.pending})</option>
          <option value="approved">อนุมัติแล้ว ({counts.approved})</option>
          <option value="rejected">ถูกปฏิเสธ ({counts.rejected})</option>
          <option value="suspended">ถูกระงับ</option>
        </select>
        <div style={{ fontSize: 13, color: C.muted }}>แสดง {filtered.length} จาก {users.length} รายการ</div>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyState}>
          <UsersIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>
            {search || filterStatus !== 'all' ? 'ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข' : 'ยังไม่มีผู้ใช้ในระบบ'}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {search || filterStatus !== 'all' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'ผู้ใช้จะปรากฏที่นี่เมื่อมีการลงทะเบียน'}
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('full_name'); setSortDir(sortField === 'full_name' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  ผู้ใช้ {sortField === 'full_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('unit_number'); setSortDir(sortField === 'unit_number' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  ห้อง {sortField === 'unit_number' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('status'); setSortDir(sortField === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  สถานะ {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={th}>บทบาท</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const s = statusMap[u.status] || statusMap.pending;
                return (
                  <tr key={u.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F7FAFC'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...td, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: C.accent + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 600, color: C.accent, flexShrink: 0,
                      }}>
                        {(u.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{u.full_name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={td}>{u.unit_number || '-'}</td>
                    <td style={td}>
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, u.full_name, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: R.sm, fontSize: 13, fontWeight: 500,
                          border: `1px solid ${C.border}`, color: s.color, background: s.bg,
                          cursor: 'pointer', minWidth: 120,
                        }}
                        aria-label={`เปลี่ยนสถานะ ${u.full_name}`}
                      >
                        {Object.entries(statusMap).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: R.sm, fontSize: 13,
                          border: `1px solid ${C.border}`, cursor: 'pointer', minWidth: 100,
                        }}
                        aria-label={`เปลี่ยนบทบาท ${u.full_name}`}
                      >
                        <option value="resident">Resident</option>
                        <option value="juristic">Juristic</option>
                        <option value="developer">Developer</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={confirm.open} title={confirm.title} message={confirm.message}
        onConfirm={confirm.action} onCancel={() => setConfirm({ open: false })}
        confirmColor={confirm.confirmColor} confirmLabel={confirm.confirmLabel}
      />
    </div>
  );
}
