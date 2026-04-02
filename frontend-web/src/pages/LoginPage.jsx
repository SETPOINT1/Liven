import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { C, R, inp, lbl, btn } from '../theme';
import { LogoIcon } from '../components/Icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      signOut();
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

  const isRedirectError = !!location.state?.error;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: C.bg,
    }}>
      <div style={{
        background: C.card, padding: '40px 36px', borderRadius: R.lg,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: 380,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <LogoIcon size={44} />
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 12 }}>Liven Dashboard</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Smart Community Management</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={lbl}>อีเมล</label>
          <input
            style={inp}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />

          <label style={lbl}>รหัสผ่าน</label>
          <input
            style={inp}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {error && (
            <div style={{
              padding: '9px 12px', marginBottom: 14, borderRadius: R.sm, fontSize: 12,
              background: isRedirectError ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${isRedirectError ? '#fde68a' : '#fecaca'}`,
              color: isRedirectError ? '#92400e' : '#b91c1c',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            style={{ ...btn, width: '100%', padding: '10px 0', fontSize: 14, borderRadius: R.sm }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
