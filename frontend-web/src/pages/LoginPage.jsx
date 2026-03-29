import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const containerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  height: '100vh', background: '#f0f2f5',
};
const cardStyle = {
  background: '#fff', padding: 40, borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: 360,
};
const inputStyle = {
  width: '100%', padding: '10px 12px', marginBottom: 16,
  border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, boxSizing: 'border-box',
};
const btnStyle = {
  width: '100%', padding: '10px 0', background: '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 15, cursor: 'pointer',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // แสดง error จาก ProtectedRoute redirect
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      signOut(); // logout เพื่อ clear session
    }
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>🏠 Liven Dashboard</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 13, color: '#555' }}>อีเมล</label>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label style={{ fontSize: 13, color: '#555' }}>รหัสผ่าน</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 12, borderRadius: 4, fontSize: 13,
              background: location.state?.error ? '#fff7e6' : '#fff2f0',
              border: `1px solid ${location.state?.error ? '#ffd591' : '#ffa39e'}`,
              color: location.state?.error ? '#ad6800' : '#cf1322',
            }}>
              {error}
            </div>
          )}
          <button style={btnStyle} type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
