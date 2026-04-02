import { useState } from 'react';
import api from '../services/api';
import { C, R, card, pageTitle, btn, inp, lbl } from '../theme';

export default function RegisterUserPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', unit_number: '', role: 'resident' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ ...pageTitle, marginBottom: 20 }}>ลงทะเบียนผู้ใช้ใหม่</h1>

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <label style={lbl}>ชื่อ-นามสกุล *</label>
          <input style={inp} name="full_name" value={form.full_name} onChange={handleChange} required />

          <label style={lbl}>อีเมล *</label>
          <input style={inp} name="email" type="email" value={form.email} onChange={handleChange} required />

          <label style={lbl}>รหัสผ่าน *</label>
          <input style={inp} name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />

          <label style={lbl}>เบอร์โทร</label>
          <input style={inp} name="phone" value={form.phone} onChange={handleChange} />

          <label style={lbl}>เลขห้อง</label>
          <input style={inp} name="unit_number" value={form.unit_number} onChange={handleChange} />

          <label style={lbl}>บทบาท</label>
          <select style={inp} name="role" value={form.role} onChange={handleChange}>
            <option value="resident">ลูกบ้าน (Resident)</option>
            <option value="juristic">นิติบุคคล (Juristic)</option>
          </select>

          {message && (
            <div style={{ padding: '9px 12px', marginBottom: 14, borderRadius: R.sm, fontSize: 12, background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '9px 12px', marginBottom: 14, borderRadius: R.sm, fontSize: 12, background: '#fef2f2', border: `1px solid ${C.err}33`, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <button style={{ ...btn, width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 14, marginTop: 4 }} type="submit" disabled={loading}>
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>
      </div>
    </div>
  );
}
