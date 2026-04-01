import { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '2px solid #e8e8e8', fontSize: 13, color: '#555' };
const tdStyle = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14 };
const btnPrimary = { padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', borderRadius: 8, padding: 32, width: 520, maxHeight: '80vh', overflow: 'auto' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, appearance: 'auto' };
const labelStyle = { fontSize: 13, display: 'block', marginBottom: 4 };

const FACILITY_TYPES = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'swimming_pool', label: 'Swimming Pool' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'theatre', label: 'Theatre' },
  { value: 'sauna', label: 'Sauna' },
  { value: 'co_working', label: 'Co-Working' },
  { value: 'garden', label: 'Garden' },
  { value: 'playground', label: 'Playground' },
  { value: 'library', label: 'Library' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  name: '',
  type: '',
  description: '',
  image_url: '',
  operating_hours: '',
  requires_booking: false,
  is_active: true,
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  useEffect(() => { fetchFacilities(); }, []);

  async function fetchFacilities() {
    try {
      const { data } = await api.get('/manage/facilities/');
      setFacilities(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(facility) {
    setEditingId(facility.id);
    setForm({
      name: facility.name || '',
      type: facility.type || '',
      description: facility.description || '',
      image_url: facility.image_url || '',
      operating_hours: facility.operating_hours || '',
      requires_booking: facility.requires_booking ?? false,
      is_active: facility.is_active ?? true,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    try {
      if (editingId) {
        await api.put(`/manage/facilities/${editingId}/`, form);
      } else {
        await api.post('/manage/facilities/', form);
      }
      closeModal();
      fetchFacilities();
    } catch { /* ignore */ }
  }

  function handleDelete(facility) {
    setConfirm({
      open: true,
      title: 'ลบสิ่งอำนวยความสะดวก',
      message: `ต้องการลบ "${facility.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      action: async () => {
        await api.delete(`/manage/facilities/${facility.id}/`);
        setConfirm({ open: false });
        fetchFacilities();
      },
    });
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>จัดการสิ่งอำนวยความสะดวก</h2>
        <button style={btnPrimary} onClick={openAdd}>+ เพิ่ม Facility</button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ชื่อ</th>
            <th style={thStyle}>ประเภท</th>
            <th style={thStyle}>เวลาเปิด-ปิด</th>
            <th style={thStyle}>ต้องจอง</th>
            <th style={thStyle}>สถานะ</th>
            <th style={thStyle}>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((f) => (
            <tr key={f.id}>
              <td style={tdStyle}>{f.name}</td>
              <td style={tdStyle}>{FACILITY_TYPES.find((t) => t.value === f.type)?.label || f.type || '-'}</td>
              <td style={tdStyle}>{f.operating_hours || '-'}</td>
              <td style={tdStyle}>{f.requires_booking ? 'ใช่' : 'ไม่'}</td>
              <td style={tdStyle}>
                <span style={{ color: f.is_active ? '#52c41a' : '#8c8c8c', fontWeight: 600 }}>
                  {f.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </td>
              <td style={tdStyle}>
                <button style={btnSmall('#1890ff')} onClick={() => openEdit(f)}>แก้ไข</button>
                <button style={btnSmall('#ff4d4f')} onClick={() => handleDelete(f)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={modalOverlay} onClick={closeModal}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editingId ? 'แก้ไข Facility' : 'เพิ่ม Facility'}</h3>
            <div>
              <label style={labelStyle}>ชื่อ</label>
              <input style={inputStyle} value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="ชื่อสิ่งอำนวยความสะดวก" />

              <label style={labelStyle}>ประเภท</label>
              <select style={selectStyle} value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                <option value="">-- เลือกประเภท --</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <label style={labelStyle}>คำอธิบาย</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="รายละเอียด" />

              <label style={labelStyle}>URL รูปภาพ</label>
              <input style={inputStyle} value={form.image_url} onChange={(e) => updateField('image_url', e.target.value)} placeholder="https://..." />

              <label style={labelStyle}>เวลาเปิด-ปิด</label>
              <input style={inputStyle} value={form.operating_hours} onChange={(e) => updateField('operating_hours', e.target.value)} placeholder="06:00 - 22:00" />

              <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.requires_booking} onChange={(e) => updateField('requires_booking', e.target.checked)} />
                  ต้องจอง
                </label>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} />
                  เปิดใช้งาน
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ ...btnPrimary, background: '#ccc', color: '#333' }} onClick={closeModal}>ยกเลิก</button>
              <button style={btnPrimary} onClick={handleSave}>{editingId ? 'บันทึก' : 'เพิ่ม'}</button>
            </div>
          </div>
        </div>
      )}

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
