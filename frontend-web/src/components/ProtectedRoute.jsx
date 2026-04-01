import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F7F8FA' }}>
        <div className="spinner" />
        <div style={{ marginTop: 16, fontSize: 14, color: '#A0AEC0' }}>กำลังโหลด...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // session มีแต่ยังไม่ได้ user info (กำลังโหลด)
  if (!user) {
    return <Navigate to="/login" state={{ error: 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาติดต่อนิติบุคคล' }} replace />;
  }

  if (user.status === 'suspended') {
    return <Navigate to="/login" state={{ error: 'บัญชีของคุณถูกระงับ กรุณาติดต่อนิติบุคคล' }} replace />;
  }

  if (user.status === 'rejected') {
    return <Navigate to="/login" state={{ error: 'บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อนิติบุคคล' }} replace />;
  }

  if (user.status === 'pending') {
    return <Navigate to="/login" state={{ error: 'บัญชีของคุณยังรอการอนุมัติ กรุณารอนิติบุคคลอนุมัติ' }} replace />;
  }

  if (user.role !== 'juristic') {
    return <Navigate to="/login" state={{ error: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะนิติบุคคลเท่านั้น' }} replace />;
  }

  return children;
}
