import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, card, pageTitle, btn, btnSm, inp, lbl, th, td, overlay, modal, pageHeader, searchBox, statCard, badge, emptyState, toastStyle } from '../theme';
import { PlusIcon, BuildingIcon, SearchIcon, CheckIcon, CloseIcon } from '../components/Icons';

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
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchFacilities(); }, []);

  async function fetchFacilities() {
    try { const { data } = await api.get('/manage/facilities/'); setFacilities(data); }
    catch { showToast('ไม่สามารถโหลดข้อมูลได้', 'error'); }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = facilities;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => (f.name || '').toLowerCase().includes(q) || (f.type || '').toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase();
      const bv = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [facilities, search, sortField, sortDir]);

  const counts = useMemo(() => ({
    total: facilities.length,
    active: facilities.filter(f => f.is_active).length,
    inactive: facilities.filter(f => !f.is_active).length,
  }), [facilities]);

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
      if (editId) { await api.patch(`/manage/facilities/${editId}/`, form); showToast('แก้ไขสำเร็จ'); }
      else { await api.post('/manage/facilities/', form); showToast('สร้างสำเร็จ'); }
      setShowForm(false);
      fetchFacilities();
    } catch (err) { showToast(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด', 'error'); }
  }

  function handleDelete(f) {
    setConfirm({
      open: true, title: 'ลบสิ่งอำนวยความสะดวก',
      message: `ต้องการลบ "${f.name}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.delete(`/manage/facilities/${f.id}/`); showToast('ลบสำเร็จ'); fetchFacilities(); }
        catch { showToast('ไม่สามารถลบได้', 'error'); }
        setConfirm({ open: false });
      },
    });
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  const statsData = [
    { label: 'ทั้งหมด', value: counts.total, color: C.accent, icon: BuildingIcon },
    { label: 'เปิดให้บริการ', value: counts.active, color: C.ok, icon: CheckIcon },
    { label: 'ปิดให้บริการ', value: counts.inactive, color: C.err, icon: CloseIcon },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader('#7c3aed')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: R.md, background: '#7c3aed15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BuildingIcon s={22} c="#7c3aed" />
            </div>
            <div>
              <h1 style={pageTitle}>จัดการสิ่งอำนวยความสะดวก</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>เพิ่ม แก้ไข หรือลบสิ่งอำนวยความสะดวกในโครงการ</p>
            </div>
          </div>
          <button style={btn} onClick={openCreate} aria-label="เพิ่มสิ่งอำนวยความสะดวก"><PlusIcon s={14} c="#fff" /> เพิ่มใหม่</button>
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

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={searchBox}>
          <SearchIcon s={16} c={C.muted} />
          <input placeholder="ค้นหาชื่อหรือประเภท..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'none', fontSize: 14, color: C.text, flex: 1 }} />
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>แสดง {filtered.length} จาก {facilities.length} รายการ</div>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyState}>
          <BuildingIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>
            {search ? 'ไม่พบสิ่งอำนวยความสะดวกที่ตรงกับเงื่อนไข' : 'ยังไม่มีสิ่งอำนวยความสะดวก'}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {search ? 'ลองเปลี่ยนคำค้นหา' : 'กดปุ่ม "เพิ่มใหม่" เพื่อเริ่มต้น'}
          </div>
          {!search && (
            <button style={{ ...btn, marginTop: 8 }} onClick={openCreate}>
              <PlusIcon s={14} c="#fff" /> เพิ่มใหม่
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: R.lg, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('name'); setSortDir(sortField === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); }}>ชื่อ {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortField('type'); setSortDir(sortField === 'type' && sortDir === 'asc' ? 'desc' : 'asc'); }}>ประเภท {sortField === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={th}>เวลาเปิด</th>
              <th style={th}>สถานะ</th>
              <th style={th}>การดำเนินการ</th>
            </tr></thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} onMouseEnter={e => e.currentTarget.style.background = '#F7FAFC'} onMouseLeave={e => e.currentTarget.style.background = ''} style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{f.name}</td>
                  <td style={{ ...td, color: C.sub }}>{TYPES.find(t => t.value === f.type)?.label || f.type || '-'}</td>
                  <td style={{ ...td, color: C.sub, fontSize: 13 }}>{f.operating_hours || '-'}</td>
                  <td style={td}>
                    <span style={badge(f.is_active ? '#dcfce7' : '#fee2e2', f.is_active ? '#15803d' : '#b91c1c')}>
                      {f.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnSm(C.accent)} onClick={() => openEdit(f)} aria-label={`แก้ไข ${f.name}`}>แก้ไข</button>
                      <button style={btnSm(C.err)} onClick={() => handleDelete(f)} aria-label={`ลบ ${f.name}`}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: R.md, background: '#7c3aed15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BuildingIcon s={18} c="#7c3aed" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>{editId ? 'แก้ไข' : 'เพิ่ม'}สิ่งอำนวยความสะดวก</h3>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{editId ? 'แก้ไขข้อมูลที่ต้องการ' : 'กรอกข้อมูลสิ่งอำนวยความสะดวกใหม่'}</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <label style={lbl}>ชื่อ *</label>
              <input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="เช่น ฟิตเนสชั้น 2" />
              <label style={lbl}>ประเภท</label>
              <select style={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label style={lbl}>รายละเอียด</label>
              <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="อธิบายรายละเอียดเพิ่มเติม..." />
              <label style={lbl}>เวลาเปิดให้บริการ</label>
              <input style={inp} value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} placeholder="เช่น 06:00 - 22:00" />
              <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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
