export const C = {
  primary:'#0C2340',accent:'#2B6CB0',accentLight:'rgba(43,108,176,.08)',
  text:'#1A202C',sub:'#4A5568',muted:'#A0AEC0',
  border:'#E2E8F0',borderLight:'#EDF2F7',bg:'#F7F8FA',card:'#FFF',
  ok:'#38A169',warn:'#D69E2E',err:'#E53E3E',info:'#3182CE',
};
export const R = { sm:8, md:12, lg:16, full:9999 };
export const card = { background:C.card, borderRadius:R.lg, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.04)' };
export const pageTitle = { fontSize:22, fontWeight:700, color:C.text, margin:0 };
export const pageSub = { fontSize:14, color:C.muted, margin:'6px 0 28px' };
export const th = { padding:'12px 18px', textAlign:'left', background:'#F7FAFC', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.sub, letterSpacing:'.02em' };
export const td = { padding:'14px 18px', borderBottom:`1px solid ${C.borderLight}`, fontSize:15 };
export const inp = { width:'100%', padding:'10px 14px', border:`1px solid ${C.border}`, borderRadius:R.sm, fontSize:15, color:C.text, background:C.card, marginBottom:16, boxSizing:'border-box' };
export const lbl = { fontSize:13, fontWeight:500, color:C.sub, display:'block', marginBottom:6 };
export const btn = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', background:C.primary, color:'#fff', border:'none', borderRadius:R.sm, fontSize:14, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' };
export const btnSm = (bg) => ({ padding:'6px 14px', border:'none', borderRadius:R.sm, color:'#fff', background:bg, cursor:'pointer', fontSize:13, fontWeight:500 });
export const tab = (a) => ({ padding:'10px 20px', border:'none', borderBottom:a?`2px solid ${C.primary}`:'2px solid transparent', background:'none', cursor:'pointer', fontWeight:a?600:400, fontSize:14, color:a?C.text:C.muted });
export const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000, backdropFilter:'blur(2px)' };
export const modal = { background:C.card, borderRadius:R.lg, padding:'32px 30px 28px', width:460, maxHeight:'85vh', overflow:'auto', boxShadow:'0 8px 30px rgba(0,0,0,.12)' };
