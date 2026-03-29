import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/ConfirmModal';

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '2px solid #e8e8e8', fontSize: 13, color: '#555' };
const tdStyle = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12, marginRight: 4 });

const statusColors = { pending: '#faad14', approved: '#52c41a', rejected: '#ff4d4f', suspended: '#8c8c8c' };
const statusLabels = { pending: 'รอการอนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ถูกปฏิเสธ', suspended: 'ถูกระงับ' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  useEffect(() => {
    fetchUsers();
    const channel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get('/users/');
      setUsers(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleStatusChange(id, name, newStatus) {
    const labels = { approved: 'อนุมัติ', rejected: 'ปฏิเสธ', suspended: 'ระงับ', pending: 'รอการอนุมัติ' };
    setConfirm({
      open: true,
      title: 'เปลี่ยนสถานะผู้ใช้',
      message: `ต้องการเปลี่ยนสถานะของ "${name}" เป็น "${labels[newStatus]}" ใช่หรือไม่?`,
      action: async () => {
        if (newStatus === 'approved') {
          await api.patch(`/users/${id}/approve/`);
        } else {
          await api.patch(`/users/${id}/reject/`);
        }
        fetchUsers();
        setConfirm({ open: false });
      },
    });
  }
  async function handleRoleChange(id, role) {
    await api.patch(`/users/${id}/role/`, { role });
    fetchUsers();
  }

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>จัดการผู้ใช้งาน</h2>
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
          {users.map((u) => (
            <tr key={u.id}>
              <td style={tdStyle}>{u.full_name}</td>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}>{u.unit_number || '-'}</td>
              <td style={tdStyle}>
                <select
                  value={u.status}
                  onChange={(e) => handleStatusChange(u.id, u.full_name, e.target.value)}
                  style={{
                    padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9',
                    color: statusColors[u.status] || '#000', fontWeight: 600,
                  }}
                >
                  <option value="pending" style={{ color: statusColors.pending }}>รอการอนุมัติ</option>
                  <option value="approved" style={{ color: statusColors.approved }}>อนุมัติแล้ว</option>
                  <option value="rejected" style={{ color: statusColors.rejected }}>ถูกปฏิเสธ</option>
                  <option value="suspended" style={{ color: statusColors.suspended }}>ถูกระงับ</option>
                </select>
              </td>
              <td style={tdStyle}>
                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                  <option value="resident">Resident</option>
                  <option value="juristic">Juristic</option>
                  <option value="developer">Developer</option>
                </select>
              </td>
            </tr>
          ))}
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
