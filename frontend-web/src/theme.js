/**
 * Liven Design System — Sansiri / KUHU inspired
 */

/* ── Color tokens ── */
export const colors = {
  primary: '#0C2340',
  accent: '#2B6CB0',
  accentLight: 'rgba(43,108,176,0.08)',
  text: '#1A202C',
  textSecondary: '#4A5568',
  textMuted: '#A0AEC0',
  border: '#E2E8F0',
  borderLight: '#EDF2F7',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  success: '#38A169',
  warning: '#D69E2E',
  danger: '#E53E3E',
  info: '#3182CE',
};

/* ── Spacing / radius ── */
export const radius = { sm: 8, md: 12, lg: 16, full: 9999 };

/* ── Reusable style objects ── */
export const card = {
  background: colors.card,
  borderRadius: radius.lg,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export const pageTitle = {
  fontSize: 22,
  fontWeight: 700,
  color: colors.text,
  margin: 0,
};

export const pageSubtitle = {
  fontSize: 14,
  color: colors.textMuted,
  margin: '6px 0 28px',
};

export const table = {
  width: '100%',
  borderCollapse: 'collapse',
  background: colors.card,
  borderRadius: radius.lg,
  overflow: 'hidden',
};

export const th = {
  padding: '12px 18px',
  textAlign: 'left',
  background: '#F7FAFC',
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 13,
  fontWeight: 600,
  color: colors.textSecondary,
  letterSpacing: '0.02em',
};

export const td = {
  padding: '14px 18px',
  borderBottom: `1px solid ${colors.borderLight}`,
  fontSize: 15,
};

export const input = {
  width: '100%',
  padding: '10px 14px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: 15,
  color: colors.text,
  background: colors.card,
  marginBottom: 16,
  boxSizing: 'border-box',
};

export const label = {
  fontSize: 13,
  fontWeight: 500,
  color: colors.textSecondary,
  display: 'block',
  marginBottom: 6,
};

export const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '10px 20px',
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: radius.sm,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export const btnOutline = {
  ...btnPrimary,
  background: 'transparent',
  color: colors.text,
  border: `1px solid ${colors.border}`,
};

export const btnDanger = {
  ...btnPrimary,
  background: colors.danger,
};

export const btnSmall = (bg) => ({
  padding: '6px 14px',
  border: 'none',
  borderRadius: radius.sm,
  color: '#fff',
  background: bg,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
});

export const badge = (bg, color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  padding: '3px 10px',
  borderRadius: radius.full,
  background: bg,
  color: color,
});

export const tabBtn = (active) => ({
  padding: '10px 20px',
  border: 'none',
  borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
  background: 'none',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: 14,
  color: active ? colors.text : colors.textMuted,
});

export const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(2px)',
};

export const modalBox = {
  background: colors.card,
  borderRadius: radius.lg,
  padding: '32px 30px 28px',
  width: 460,
  maxHeight: '85vh',
  overflow: 'auto',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
};
