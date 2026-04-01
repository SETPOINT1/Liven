import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { colors, radius, table as tableStyle, th as thStyle, td as tdStyle, pageTitle } from '../theme';

const statusMap = {
  pending:   { label: 'รอการอนุมัติ', bg: '#fef9c3', color: '#a16207' },
  approved:  { label: 'อนุมัติแล้ว',  bg: '#dcfce7', color: '#15803d' },
  rejected:  { label: 'ถูกปฏิเสธ',   bg: '#fee2e2', color: '#b91c1c' },
  suspended: { label: 'ถูกระงับ',     bg: '#f3f4f6', color: '#6b7280' },
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
    const channel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function fetchUsers() {
    try { const { data } = await api.get('/users/'); setUsers(data); } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleStatusChange(id, name, newStatus) {
    const labels = { approved: 'อนุมัติ', rejected: 'ปฏิเสธ', suspended: 'ระงับ', pending: 'รอการอนุมัติ' };
    setConfirm({
      open: true,
      title: 'เปลี่ยนสถานะผู้ใช้',
      message: `ต้องการเปลี่ยนสถานะของ "${name}" เป็น "${labels[newStatus]}" ใช่หรือไม่?`,
      action: async () => {
        if (newStatus === 'approved') await api.patch(`/users/${id}/approve/`);
        else await api.patch(`/users/${id}/reject/`);
        fetchUsers();
        setConfirm({ open: false });
        showToast(`เปลี่ยนสถานะ "${name}" เป็น "${labels[newStatus]}" สำเร็จ`);
      },
    });
  }

  async function handleRoleChange(id, role) {
    await api.patch(`/users/${id}/role/`, { role });
    fetchUsers();
    showToast('เปลี่ยนบทบาทสำเร็จ');
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <h1 style={{ ...pageTitle, marginBottom: 20 }}>จัดการผู้ใช้งาน</h1>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: radius.sm,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted, fontSize: 15 }}>
          ยังไม่มีผู้ใช้ในระบบ
        </div>
      ) : (
        <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ชื่อ</th>
                <th style={thStyle}>อีเมล</th>
                <th style={thStyle}>ห้อง</th>
                <th style={thStyle}>สถานะ</th>
                <th style={thStyle}>บทบาท</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const s = statusMap[u.status] || statusMap.pending;
                return (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ ...tdStyle, color: colors.textSecondary }}>{u.email}</td>
                    <td style={tdStyle}>{u.unit_number || '-'}</td>
                    <td style={tdStyle}>
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, u.full_name, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: radius.sm, fontSize: 13, fontWeight: 500,
                          border: `1px solid ${colors.border}`, color: s.color, background: s.bg,
                          cursor: 'pointer', minWidth: 120,
                        }}
                      >
                        {Object.entries(statusMap).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: radius.sm, fontSize: 13,
                          border: `1px solid ${colors.border}`, cursor: 'pointer', minWidth: 100,
                        }}
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
      />
    </div>
  );
}
