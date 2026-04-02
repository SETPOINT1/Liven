import { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, card, pageTitle, pageSub, btn, btnSm, inp, lbl, th, td, overlay, modal } from '../theme';
import { PlusIcon } from '../components/Icons';

const TYPES = [
  { value: 'fitness', label: 'ฟิตเนส' },
  { value: 'pool', label: 'สระว่ายน้ำ' },
  { value: 'meeting_room', label: 'ห้องประชุม' },
  { value: 'parking', label: 'ที่จอดรถ' },
  { value: 'garden', label: 'สวน' },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'fitness', description: '', operating_hours: '', is_active: true });
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchFacilities(); }, []);

  async function fetchFacilities() {
    try { const { data } = await api.get('/manage/facilities/'); setFacilities(data); } catch {}
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ name: '', type: 'fitness', description: '', operating_hours: '', is_active: true });
    setShowForm(true);
  }

  function openEdit(f) {
    setEditId(f.id);
    setForm({ name: f.name, type: f.type || 'fitness', description: f.description || '', operating_hours: f.operating_hours || '', is_active: f.is_active });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/manage/facilities/${editId}/`, form);
        showToast('แก้ไขสำเร็จ');
      } else {
        await api.post('/manage/facilities/', form);
        showToast('สร้างสำเร็จ');
      }
      setShowForm(false);
      fetchFacilities();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    }
  }

  function handleDelete(f) {
    setConfirm({
      open: true, title: 'ลบสิ่งอำนวยความสะดวก',
      message: `ต้องการลบ "${f.name}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.delete(`/manage/facilities/${f.id}/`); showToast('ลบสำเร็จ'); fetchFacilities(); } catch {}
        setConfirm({ open: false });
      },
    });
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>จัดการสิ่งอำนวยความสะดวก</h1>
          <p style={{ ...pageSub, margin: '4px 0 0' }}>เพิ่ม แก้ไข หรือลบสิ่งอำนวยความสะดวกในโครงการ</p>
        </div>
        <button style={btn} onClick={openCreate}><PlusIcon s={14} c="#fff" /> เพิ่มใหม่</button>
      </div>

      {toast && <div style={{ padding: '10px 16px', marginBottom: 14, borderRadius: R.sm, background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', fontSize: 14 }}>{toast}</div>}

      {facilities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 15 }}>ยังไม่มีสิ่งอำนวยความสะดวก — กดปุ่ม "เพิ่มใหม่"</div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>ชื่อ</th><th style={th}>ประเภท</th><th style={th}>เวลาเปิด</th>
              <th style={th}>สถานะ</th><th style={th}>การดำเนินการ</th>
            </tr></thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{f.name}</td>
                  <td style={{ ...td, color: C.sub }}>{TYPES.find(t => t.value === f.type)?.label || f.type || '-'}</td>
                  <td style={{ ...td, color: C.sub, fontSize: 13 }}>{f.operating_hours || '-'}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 10px', borderRadius: 99, background: f.is_active ? '#dcfce7' : '#fee2e2', color: f.is_active ? '#15803d' : '#b91c1c' }}>
                      {f.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnSm(C.accent)} onClick={() => openEdit(f)}>แก้ไข</button>
                      <button style={btnSm(C.err)} onClick={() => handleDelete(f)}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: C.text }}>{editId ? 'แก้ไข' : 'เพิ่ม'}สิ่งอำนวยความสะดวก</h3>
            <form onSubmit={handleSave}>
              <label style={lbl}>ชื่อ *</label>
              <input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label style={lbl}>ประเภท</label>
              <select style={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label style={lbl}>รายละเอียด</label>
              <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <label style={lbl}>เวลาเปิดให้บริการ</label>
              <input style={inp} value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} placeholder="เช่น 06:00 - 22:00" />
              <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> เปิดให้บริการ
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setShowForm(false)}>ยกเลิก</button>
                <button type="submit" style={btn}>{editId ? 'บันทึก' : 'สร้าง'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm({ open: false })} />
    </div>
  );
}
