import { useState, useEffect } from 'react';
import api from '../services/api';

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' };
const thStyle = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '2px solid #e8e8e8', fontSize: 13, color: '#555' };
const tdStyle = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14 };
const btnPrimary = { padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12 });
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', borderRadius: 8, padding: 32, width: 480, maxHeight: '80vh', overflow: 'auto' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' };

export default function ParcelsPage() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });

  useEffect(() => { fetchParcels(); }, []);

  async function fetchParcels() {
    try {
      const { data } = await api.get('/parcels/');
      setParcels(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleOCR() {
    if (!imageFile) return;
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const { data } = await api.post('/parcels/ocr/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.confidence >= 60) {
        setForm({ recipient_name: data.recipient_name || '', unit_number: data.unit_number || '', courier: data.courier || '', tracking_number: data.tracking_number || '' });
      } else {
        setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
      }
    } catch {
      setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
    }
    setOcrLoading(false);
  }

  async function handleSave() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (imageFile) fd.append('image', imageFile);
    await api.post('/parcels/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setShowModal(false);
    setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
    setImageFile(null);
    fetchParcels();
  }

  async function handlePickup(id) {
    await api.patch(`/parcels/${id}/pickup/`);
    fetchParcels();
  }

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>จัดการพัสดุ</h2>
        <button style={btnPrimary} onClick={() => setShowModal(true)}>📷 สแกนพัสดุ</button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ชื่อผู้รับ</th>
            <th style={thStyle}>ห้อง</th>
            <th style={thStyle}>ขนส่ง</th>
            <th style={thStyle}>เลขพัสดุ</th>
            <th style={thStyle}>สถานะ</th>
            <th style={thStyle}>วันที่มาถึง</th>
            <th style={thStyle}>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {parcels.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>{p.recipient_name}</td>
              <td style={tdStyle}>{p.unit_number}</td>
              <td style={tdStyle}>{p.courier || '-'}</td>
              <td style={tdStyle}>{p.tracking_number || '-'}</td>
              <td style={tdStyle}>
                <span style={{ color: p.status === 'picked_up' ? '#52c41a' : '#faad14', fontWeight: 600 }}>
                  {p.status === 'picked_up' ? 'รับแล้ว' : 'รอรับ'}
                </span>
              </td>
              <td style={tdStyle}>{p.arrived_at ? new Date(p.arrived_at).toLocaleDateString('th-TH') : '-'}</td>
              <td style={tdStyle}>
                {p.status === 'pending' && (
                  <button style={btnSmall('#52c41a')} onClick={() => handlePickup(p.id)}>ยืนยันรับ</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>สแกนพัสดุ (OCR)</h3>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginBottom: 12 }} />
            <button style={{ ...btnPrimary, marginBottom: 20 }} onClick={handleOCR} disabled={!imageFile || ocrLoading}>
              {ocrLoading ? 'กำลังสแกน...' : 'สแกน OCR'}
            </button>
            <div>
              <label style={{ fontSize: 13 }}>ชื่อผู้รับ</label>
              <input style={inputStyle} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
              <label style={{ fontSize: 13 }}>หมายเลขห้อง</label>
              <input style={inputStyle} value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              <label style={{ fontSize: 13 }}>บริษัทขนส่ง</label>
              <input style={inputStyle} value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} />
              <label style={{ fontSize: 13 }}>เลขพัสดุ</label>
              <input style={inputStyle} value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ ...btnPrimary, background: '#ccc', color: '#333' }} onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button style={btnPrimary} onClick={handleSave}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
