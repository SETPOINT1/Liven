import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { C, R, card, th, td, pageTitle, btn, btnSm, inp, lbl, overlay, modal } from '../theme';
import { CameraIcon, CheckIcon } from '../components/Icons';

export default function ParcelsPage() {
  const { user } = useAuth();
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
    let imageUrl = '';
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `parcels/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('parcels').upload(path, imageFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('parcels').getPublicUrl(path);
        imageUrl = urlData?.publicUrl || '';
      }
    }
    await api.post('/parcels/', {
      ...form,
      image_url: imageUrl,
      project_id: user?.project_id,
    });
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
        <button style={btn} onClick={() => setShowModal(true)}>
          <CameraIcon s={15} c="#fff" /> สแกนพัสดุ
        </button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: R.sm,
          background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {parcels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 15 }}>
          ยังไม่มีพัสดุในระบบ — กดปุ่ม "สแกนพัสดุ" เพื่อเริ่มต้น
        </div>
      ) : (
      <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>ชื่อผู้รับ</th>
              <th style={th}>ห้อง</th>
              <th style={th}>ขนส่ง</th>
              <th style={th}>เลขพัสดุ</th>
              <th style={th}>สถานะ</th>
              <th style={th}>วันที่มาถึง</th>
              <th style={th}>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {parcels.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.recipient_name}</td>
                <td style={td}>{p.unit_number}</td>
                <td style={{ ...td, color: C.sub }}>{p.courier || '-'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 13 }}>{p.tracking_number || '-'}</td>
                <td style={td}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: p.status === 'picked_up' ? '#dcfce7' : '#fef9c3',
                    color: p.status === 'picked_up' ? '#15803d' : '#a16207',
                  }}>
                    {p.status === 'picked_up' ? 'รับแล้ว' : 'รอรับ'}
                  </span>
                </td>
                <td style={{ ...td, color: C.sub, fontSize: 13 }}>
                  {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString('th-TH') : '-'}
                </td>
                <td style={td}>
                  {p.status === 'pending' && (
                    <button style={btnSm(C.ok)} onClick={() => handlePickup(p.id)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckIcon s={12} c="#fff" /> ยืนยันรับ
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
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: C.text }}>สแกนพัสดุ (OCR)</h3>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginBottom: 12 }} />
            <button style={{ ...btn, marginBottom: 20 }} onClick={handleOCR} disabled={!imageFile || ocrLoading}>
              {ocrLoading ? 'กำลังสแกน...' : 'สแกน OCR'}
            </button>
            <div>
              <label style={lbl}>ชื่อผู้รับ</label>
              <input style={inp} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
              <label style={lbl}>หมายเลขห้อง</label>
              <input style={inp} value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              <label style={lbl}>บริษัทขนส่ง</label>
              <input style={inp} value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} />
              <label style={lbl}>เลขพัสดุ</label>
              <input style={inp} value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button style={btn} onClick={handleSave}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
