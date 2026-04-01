import { useState } from 'react';
import api from '../services/api';
import { colors, radius, card as cardBase, pageTitle, btnPrimary, input as inputBase, label as labelStyle } from '../theme';

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

      <div style={cardBase}>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>ชื่อ-นามสกุล *</label>
          <input style={inputBase} name="full_name" value={form.full_name} onChange={handleChange} required />

          <label style={labelStyle}>อีเมล *</label>
          <input style={inputBase} name="email" type="email" value={form.email} onChange={handleChange} required />

          <label style={labelStyle}>รหัสผ่าน *</label>
          <input style={inputBase} name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />

          <label style={labelStyle}>เบอร์โทร</label>
          <input style={inputBase} name="phone" value={form.phone} onChange={handleChange} />

          <label style={labelStyle}>เลขห้อง</label>
          <input style={inputBase} name="unit_number" value={form.unit_number} onChange={handleChange} />

          <label style={labelStyle}>บทบาท</label>
          <select style={inputBase} name="role" value={form.role} onChange={handleChange}>
            <option value="resident">ลูกบ้าน (Resident)</option>
            <option value="juristic">นิติบุคคล (Juristic)</option>
          </select>

          {message && (
            <div style={{ padding: '9px 12px', marginBottom: 14, borderRadius: radius.sm, fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '9px 12px', marginBottom: 14, borderRadius: radius.sm, fontSize: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <button style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 14, marginTop: 4 }} type="submit" disabled={loading}>
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>
      </div>
    </div>
  );
}
