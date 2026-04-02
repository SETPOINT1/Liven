import { useState } from 'react';
import api from '../services/api';
import { C, R, card, pageTitle, btn, inp, lbl, pageHeader } from '../theme';
import { PlusIcon, CheckIcon, CloseIcon, EyeIcon, EyeOffIcon } from '../components/Icons';

export default function RegisterUserPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', unit_number: '', role: 'resident' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMessage(null); setError(null);
    try {
      const { data } = await api.post('/users/register/', form);
      setMessage(`ลงทะเบียนสำเร็จ: ${data.full_name} (${data.email})`);
      setForm({ email: '', password: '', full_name: '', phone: '', unit_number: '', role: 'resident' });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={pageHeader(C.primary)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.primary + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusIcon s={22} c={C.primary} />
          </div>
          <div>
            <h1 style={pageTitle}>ลงทะเบียนผู้ใช้ใหม่</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>เพิ่มลูกบ้านหรือเจ้าหน้าที่เข้าสู่ระบบ</p>
          </div>
        </div>
      </div>

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <label style={lbl}>ชื่อ-นามสกุล *</label>
          <input style={inp} name="full_name" value={form.full_name} onChange={handleChange} required />

          <label style={lbl}>อีเมล *</label>
          <input style={inp} name="email" type="email" value={form.email} onChange={handleChange} required />

          <label style={lbl}>รหัสผ่าน *</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inp, paddingRight: 40 }} name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
              {showPw ? <EyeOffIcon s={18} c={C.accent} /> : <EyeIcon s={18} c={C.muted} />}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: -12, marginBottom: 16 }}>อย่างน้อย 6 ตัวอักษร</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>เบอร์โทร</label>
              <input style={inp} name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <label style={lbl}>เลขห้อง</label>
              <input style={inp} name="unit_number" value={form.unit_number} onChange={handleChange} />
            </div>
          </div>

          <label style={lbl}>บทบาท</label>
          <select style={inp} name="role" value={form.role} onChange={handleChange}>
            <option value="resident">ลูกบ้าน (Resident)</option>
            <option value="juristic">นิติบุคคล (Juristic)</option>
          </select>

          {message && (
            <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: R.sm, fontSize: 13, background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckIcon s={14} c="#166534" /> {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: R.sm, fontSize: 13, background: '#fef2f2', border: `1px solid ${C.err}33`, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloseIcon s={14} c="#b91c1c" /> {error}
            </div>
          )}

          <button style={{ ...btn, width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginTop: 4 }} type="submit" disabled={loading}>
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>
      </div>
    </div>
  );
}
