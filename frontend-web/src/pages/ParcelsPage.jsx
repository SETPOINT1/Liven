import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  colors, radius, table as tableStyle, th as thStyle, td as tdStyle,
  pageTitle, btnPrimary, btnSmall, input as inputBase, label as labelStyle,
  modalOverlay, modalBox,
} from '../theme';
import { CameraIcon, CheckIcon } from '../components/Icons';

export default function ParcelsPage() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchParcels(); }, []);

  async function fetchParcels() {
    try { const { data } = await api.get('/parcels/'); setParcels(data); } catch { /* ignore */ }
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
    } catch { setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' }); }
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
    showToast('บันทึกพัสดุสำเร็จ');
  }

  async function handlePickup(id) {
    await api.patch(`/parcels/${id}/pickup/`);
    fetchParcels();
    showToast('ยืนยันรับพัสดุสำเร็จ');
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>จัดการพัสดุ</h1>
        <button style={btnPrimary} onClick={() => setShowModal(true)}>
          <CameraIcon size={15} color="#fff" /> สแกนพัสดุ
        </button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: radius.sm,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {parcels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted, fontSize: 15 }}>
          ยังไม่มีพัสดุในระบบ — กดปุ่ม "สแกนพัสดุ" เพื่อเริ่มต้น
        </div>
      ) : (
      <div style={{ background: colors.card, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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
                <td style={{ ...tdStyle, color: colors.textSecondary }}>{p.courier || '-'}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>{p.tracking_number || '-'}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: p.status === 'picked_up' ? '#dcfce7' : '#fef9c3',
                    color: p.status === 'picked_up' ? '#15803d' : '#a16207',
                  }}>
                    {p.status === 'picked_up' ? 'รับแล้ว' : 'รอรับ'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: colors.textSecondary, fontSize: 13 }}>
                  {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString('th-TH') : '-'}
                </td>
                <td style={tdStyle}>
                  {p.status === 'pending' && (
                    <button style={btnSmall(colors.success)} onClick={() => handlePickup(p.id)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckIcon size={12} color="#fff" /> ยืนยันรับ
                      </span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600 }}>สแกนพัสดุ (OCR)</h3>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginBottom: 12 }} />
            <button style={{ ...btnPrimary, marginBottom: 20 }} onClick={handleOCR} disabled={!imageFile || ocrLoading}>
              {ocrLoading ? 'กำลังสแกน...' : 'สแกน OCR'}
            </button>
            <div>
              <label style={labelStyle}>ชื่อผู้รับ</label>
              <input style={inputBase} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
              <label style={labelStyle}>หมายเลขห้อง</label>
              <input style={inputBase} value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              <label style={labelStyle}>บริษัทขนส่ง</label>
              <input style={inputBase} value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} />
              <label style={labelStyle}>เลขพัสดุ</label>
              <input style={inputBase} value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={{ ...btnPrimary, background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` }} onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button style={btnPrimary} onClick={handleSave}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
