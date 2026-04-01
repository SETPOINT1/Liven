import { colors, radius, modalOverlay, modalBox, btnPrimary } from '../theme';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div style={{ ...modalBox, width: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{title || 'ยืนยันการดำเนินการ'}</h3>
        <p style={{ margin: '0 0 20px', color: colors.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            style={{ ...btnPrimary, background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` }}
            onClick={onCancel}
          >
            ยกเลิก
          </button>
          <button
            style={{ ...btnPrimary, background: colors.danger }}
            onClick={onConfirm}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
