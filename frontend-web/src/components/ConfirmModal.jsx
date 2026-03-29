const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.4)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle = {
  background: '#fff', borderRadius: 8, padding: '28px 32px',
  minWidth: 340, maxWidth: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
};
const btnRow = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 };
const btnCancel = {
  padding: '8px 20px', border: '1px solid #d9d9d9', borderRadius: 4,
  background: '#fff', cursor: 'pointer', fontSize: 14,
};
const btnDanger = {
  padding: '8px 20px', border: 'none', borderRadius: 4,
  background: '#ff4d4f', color: '#fff', cursor: 'pointer', fontSize: 14,
};

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{title || 'ยืนยันการดำเนินการ'}</h3>
        <p style={{ margin: 0, color: '#555', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={btnRow}>
          <button style={btnCancel} onClick={onCancel}>ยกเลิก</button>
          <button style={btnDanger} onClick={onConfirm}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}
