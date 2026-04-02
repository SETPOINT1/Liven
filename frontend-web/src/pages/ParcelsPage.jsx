import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { C, R, th, td, pageTitle, btn, btnSm, inp, lbl, overlay, modal, pageHeader, searchBox, statCard, badge, emptyState, toastStyle } from '../theme';
import { CameraIcon, CheckIcon, ParcelIcon, SearchIcon, ClockIcon, InboxIcon } from '../components/Icons';

export default function ParcelsPage() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState('arrived_at');
  const [sortDir, setSortDir] = useState('desc');

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    fetchParcels();
    const channel = supabase.channel('parcels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, () => fetchParcels())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchParcels() {
    try { const { data } = await api.get('/parcels/'); setParcels(data); }
    catch { showToast('ไม่สามารถโหลดข้อมูลพัสดุได้', 'error'); }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = parcels;
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.recipient_name || '').toLowerCase().includes(q) ||
        (p.unit_number || '').toLowerCase().includes(q) ||
        (p.tracking_number || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase();
      const bv = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [parcels, search, filterStatus, sortField, sortDir]);

  const counts = useMemo(() => ({
    total: parcels.length,
    pending: parcels.filter(p => p.status === 'pending').length,
    picked_up: parcels.filter(p => p.status === 'picked_up').length,
  }), [parcels]);

  async function handleOCR() {
    if (!imageFile) return;
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const { data } = await api.post('/parcels/ocr/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.confidence >= 0.60) {
        setForm({ recipient_name: data.recipient_name || '', unit_number: data.unit_number || '', courier: data.courier || '', tracking_number: data.tracking_number || '' });
        showToast('สแกนสำเร็จ กรุณาตรวจสอบข้อมูล');
      } else {
        setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
        showToast('ไม่สามารถอ่านข้อมูลได้ชัดเจน กรุณากรอกเอง', 'error');
      }
    } catch { setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' }); showToast('สแกนไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    setOcrLoading(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
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
      await api.post('/parcels/', { ...form, image_url: imageUrl, project_id: user?.project_id });
      setShowModal(false);
      setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' });
      setImageFile(null);
      fetchParcels();
      showToast('บันทึกพัสดุสำเร็จ');
    } catch { showToast('ไม่สามารถบันทึกพัสดุได้', 'error'); }
    setSaving(false);
  }

  async function handlePickup(id) {
    try {
      await api.patch(`/parcels/${id}/pickup/`);
      fetchParcels();
      showToast('ยืนยันรับพัสดุสำเร็จ');
    } catch { showToast('ไม่สามารถยืนยันรับพัสดุได้', 'error'); }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const statsData = [
    { label: 'พัสดุทั้งหมด', value: counts.total, color: C.accent, icon: ParcelIcon },
    { label: 'รอรับ', value: counts.pending, color: C.warn, icon: ClockIcon },
    { label: 'รับแล้ว', value: counts.picked_up, color: C.ok, icon: CheckIcon },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.warn)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.warn + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ParcelIcon s={22} c={C.warn} />
            </div>
            <div>
              <h1 style={pageTitle}>จัดการพัสดุ</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>สแกน บันทึก และยืนยันรับพัสดุ</p>
            </div>
          </div>
          <button style={btn} onClick={() => setShowModal(true)} aria-label="สแกนพัสดุ">
            <CameraIcon s={15} c="#fff" /> สแกนพัสดุ
          </button>
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

      {toast && (
        <div style={toastStyle(toast.type)}>{toast.msg}</div>
      )}

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={searchBox}>
          <SearchIcon s={16} c={C.muted} />
          <input
            placeholder="ค้นหาชื่อผู้รับ, ห้อง, เลขพัสดุ..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: 14, color: C.text, flex: 1 }}
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: R.sm, fontSize: 14, color: C.sub, background: C.card, cursor: 'pointer' }}
        >
          <option value="all">ทุกสถานะ ({counts.total})</option>
          <option value="pending">รอรับ ({counts.pending})</option>
          <option value="picked_up">รับแล้ว ({counts.picked_up})</option>
        </select>
        <div style={{ fontSize: 13, color: C.muted }}>แสดง {filtered.length} จาก {parcels.length} รายการ</div>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyState}>
          <InboxIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>
            {search || filterStatus !== 'all' ? 'ไม่พบพัสดุที่ตรงกับเงื่อนไข' : 'ยังไม่มีพัสดุในระบบ'}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {search || filterStatus !== 'all' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'กดปุ่ม "สแกนพัสดุ" เพื่อเริ่มบันทึกพัสดุ'}
          </div>
          {!search && filterStatus === 'all' && (
            <button style={{ ...btn, marginTop: 8 }} onClick={() => setShowModal(true)}>
              <CameraIcon s={14} c="#fff" /> สแกนพัสดุ
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('recipient_name'); setSortDir(sortField === 'recipient_name' && sortDir === 'asc' ? 'desc' : 'asc'); }}>ชื่อผู้รับ {sortField === 'recipient_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={th}>ห้อง</th>
                <th style={th}>ขนส่ง</th>
                <th style={th}>เลขพัสดุ</th>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('status'); setSortDir(sortField === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}>สถานะ {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('arrived_at'); setSortDir(sortField === 'arrived_at' && sortDir === 'asc' ? 'desc' : 'asc'); }}>วันที่มาถึง {sortField === 'arrived_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={th}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background = '#F7FAFC'} onMouseLeave={e => e.currentTarget.style.background = ''} style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{p.recipient_name}</td>
                  <td style={td}>{p.unit_number}</td>
                  <td style={{ ...td, color: C.sub }}>{p.courier || '-'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 13 }}>{p.tracking_number || '-'}</td>
                  <td style={td}>
                    <span style={badge(p.status === 'picked_up' ? '#dcfce7' : '#fef9c3', p.status === 'picked_up' ? '#15803d' : '#a16207')}>
                      {p.status === 'picked_up' ? 'รับแล้ว' : 'รอรับ'}
                    </span>
                  </td>
                  <td style={{ ...td, color: C.sub, fontSize: 13 }}>
                    {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td style={td}>
                    {p.status === 'pending' && (
                      <button style={btnSm(C.ok)} onClick={() => handlePickup(p.id)} aria-label={`ยืนยันรับพัสดุ ${p.recipient_name}`}>
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

      {/* OCR Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={{ ...modal, width: 500 }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: R.md, background: C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CameraIcon s={20} c={C.accent} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>สแกนพัสดุ</h3>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>อัปโหลดรูปภาพเพื่อสแกน OCR อัตโนมัติ</p>
              </div>
            </div>

            {/* Upload Area */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${imageFile ? C.ok : C.border}`, borderRadius: R.md,
              padding: '24px 20px', textAlign: 'center', marginBottom: 16,
              background: imageFile ? '#f0fdf4' : C.bg, cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ display: 'none' }} />
              {imageFile ? (
                <>
                  <CheckIcon s={28} c={C.ok} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ok, marginTop: 8 }}>{imageFile.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>คลิกเพื่อเปลี่ยนไฟล์</div>
                </>
              ) : (
                <>
                  <CameraIcon s={28} c={C.muted} />
                  <div style={{ fontSize: 13, color: C.sub, marginTop: 8, fontWeight: 500 }}>คลิกเพื่อเลือกรูปภาพ</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>รองรับ JPG, PNG</div>
                </>
              )}
            </label>

            {/* OCR Button */}
            <button
              style={{ ...btn, width: '100%', justifyContent: 'center', marginBottom: 20, background: imageFile ? C.accent : C.muted, padding: '10px 0' }}
              onClick={handleOCR}
              disabled={!imageFile || ocrLoading}
            >
              {ocrLoading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> กำลังสแกน...</>
              ) : (
                <><CameraIcon s={14} c="#fff" /> สแกน OCR</>
              )}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: C.borderLight }} />
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>ข้อมูลพัสดุ</span>
              <div style={{ flex: 1, height: 1, background: C.borderLight }} />
            </div>

            {/* Form Fields — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>ชื่อผู้รับ</label>
                <input style={inp} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} placeholder="ชื่อ-นามสกุล" />
              </div>
              <div>
                <label style={lbl}>หมายเลขห้อง</label>
                <input style={inp} value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} placeholder="เช่น A101" />
              </div>
              <div>
                <label style={lbl}>บริษัทขนส่ง</label>
                <input style={inp} value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} placeholder="เช่น Kerry, Flash" />
              </div>
              <div>
                <label style={lbl}>เลขพัสดุ</label>
                <input style={inp} value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} placeholder="Tracking number" />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => { setShowModal(false); setImageFile(null); setForm({ recipient_name: '', unit_number: '', courier: '', tracking_number: '' }); }}>ยกเลิก</button>
              <button style={{ ...btn, background: C.ok }} onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกพัสดุ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
