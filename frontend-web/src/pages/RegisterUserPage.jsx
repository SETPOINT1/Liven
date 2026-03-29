import { useState } from 'react';
import api from '../services/api';

const containerStyle = { maxWidth: 500, margin: '0 auto' };
const inputStyle = {
  width: '100%', padding: '10px 12px', marginBottom: 12,
  border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, boxSizing: 'border-box',
};
const labelStyle = { fontSize: 13, color: '#555', display: 'block', marginBottom: 4 };
const btnStyle = {
  width: '100%', padding: '10px 0', background: '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 15, cursor: 'pointer', marginTop: 8,
};

export default function RegisterUserPage() {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '', unit_number: '', role: 'resident',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.post('/users/register/', form);
      setMessage(`ลงทะเบียนสำเร็จ: ${data.full_name} (${data.email})`);
      setForm({ email: '', password: '', full_name: '', phone: '', unit_number: '', role: 'resident' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: 20 }}>ลงทะเบียนผู้ใช้ใหม่</h2>
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>ชื่อ-นามสกุล *</label>
        <input style={inputStyle} name="full_name" value={form.full_name} onChange={handleChange} required />

        <label style={labelStyle}>อีเมล *</label>
        <input style={inputStyle} name="email" type="email" value={form.email} onChange={handleChange} required />

        <label style={labelStyle}>รหัสผ่าน *</label>
        <input style={inputStyle} name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />

        <label style={labelStyle}>เบอร์โทร</label>
        <input style={inputStyle} name="phone" value={form.phone} onChange={handleChange} />

        <label style={labelStyle}>เลขห้อง</label>
        <input style={inputStyle} name="unit_number" value={form.unit_number} onChange={handleChange} />

        <label style={labelStyle}>บทบาท</label>
        <select style={inputStyle} name="role" value={form.role} onChange={handleChange}>
          <option value="resident">ลูกบ้าน (Resident)</option>
          <option value="juristic">นิติบุคคล (Juristic)</option>
        </select>

        {message && <div style={{ color: '#52c41a', fontSize: 14, marginBottom: 8 }}>{message}</div>}
        {error && <div style={{ color: '#ff4d4f', fontSize: 14, marginBottom: 8 }}>{error}</div>}

        <button style={btnStyle} type="submit" disabled={loading}>
          {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
        </button>
      </form>
    </div>
  );
}
