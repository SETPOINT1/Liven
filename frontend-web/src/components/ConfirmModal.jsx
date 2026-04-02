import { C, R, overlay, modal, btn } from '../theme';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={overlay} onClick={onCancel}>
      <div style={{ ...modal, width: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: C.text }}>{title || 'ยืนยันการดำเนินการ'}</h3>
        <p style={{ margin: '0 0 20px', color: C.sub, fontSize: 13, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}
            onClick={onCancel}
          >
            ยกเลิก
          </button>
          <button
            style={{ ...btn, background: C.err }}
            onClick={onConfirm}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
