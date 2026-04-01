import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  colors, radius, card as cardBase, pageTitle, btnPrimary, tabBtn,
  input as inputBase, label as labelStyle,
} from '../theme';
import { PlusIcon, ClockIcon, LocationIcon } from '../components/Icons';

const priorityMap = {
  normal:    { label: 'ปกติ',    bg: '#dcfce7', color: '#15803d' },
  important: { label: 'สำคัญ',   bg: '#fef9c3', color: '#a16207' },
  emergency: { label: 'ฉุกเฉิน', bg: '#fee2e2', color: '#b91c1c' },
};

export default function EventsPage() {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', location: '', image: null });
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 'normal', expires_at: '' });
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { fetchEvents(); fetchAnnouncements(); }, []);

  async function fetchEvents() {
    try { const { data } = await api.get('/events/'); setEvents(data); } catch { /* ignore */ }
  }
  async function fetchAnnouncements() {
    try { const { data } = await api.get('/announcements/'); setAnnouncements(data); } catch { /* ignore */ }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', eventForm.title);
    fd.append('description', eventForm.description);
    fd.append('event_date', eventForm.event_date);
    fd.append('location', eventForm.location);
    if (eventForm.image) fd.append('image', eventForm.image);
    await api.post('/events/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setEventForm({ title: '', description: '', event_date: '', location: '', image: null });
    setShowForm(false);
    fetchEvents();
    showToast('สร้างกิจกรรมสำเร็จ');
  }

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    const payload = { ...annForm };
    if (!payload.expires_at) delete payload.expires_at;
    await api.post('/announcements/', payload);
    setAnnForm({ title: '', content: '', priority: 'normal', expires_at: '' });
    setShowForm(false);
    fetchAnnouncements();
    showToast('สร้างประกาศสำเร็จ');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>กิจกรรมและประกาศ</h1>
        <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'ยกเลิก' : <><PlusIcon size={14} color="#fff" /> {tab === 'events' ? 'สร้างกิจกรรม' : 'สร้างประกาศ'}</>}
        </button>
      </div>

      <div style={{ marginBottom: 18, borderBottom: `1px solid ${colors.border}` }}>
        <button style={tabBtn(tab === 'events')} onClick={() => { setTab('events'); setShowForm(false); }}>กิจกรรม</button>
        <button style={tabBtn(tab === 'announcements')} onClick={() => { setTab('announcements'); setShowForm(false); }}>ประกาศ</button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: radius.sm,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {showForm && tab === 'events' && (
        <div style={{ ...cardBase, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>สร้างกิจกรรมใหม่</h3>
          <form onSubmit={handleCreateEvent}>
            <label style={labelStyle}>ชื่อกิจกรรม</label>
            <input style={inputBase} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
            <label style={labelStyle}>รายละเอียด</label>
            <textarea style={{ ...inputBase, minHeight: 80, resize: 'vertical' }} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            <label style={labelStyle}>วันเวลา</label>
            <input style={inputBase} type="datetime-local" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} required />
            <label style={labelStyle}>สถานที่</label>
            <input style={inputBase} value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
            <label style={labelStyle}>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={(e) => setEventForm({ ...eventForm, image: e.target.files[0] })} style={{ marginBottom: 14 }} />
            <button style={btnPrimary} type="submit">สร้างกิจกรรม</button>
          </form>
        </div>
      )}

      {showForm && tab === 'announcements' && (
        <div style={{ ...cardBase, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>สร้างประกาศใหม่</h3>
          <form onSubmit={handleCreateAnnouncement}>
            <label style={labelStyle}>หัวข้อ</label>
            <input style={inputBase} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required />
            <label style={labelStyle}>เนื้อหา</label>
            <textarea style={{ ...inputBase, minHeight: 80, resize: 'vertical' }} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required />
            <label style={labelStyle}>ระดับความสำคัญ</label>
            <select style={inputBase} value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="normal">ปกติ</option>
              <option value="important">สำคัญ</option>
              <option value="emergency">ฉุกเฉิน</option>
            </select>
            <label style={labelStyle}>วันหมดอายุ</label>
            <input style={inputBase} type="datetime-local" value={annForm.expires_at} onChange={(e) => setAnnForm({ ...annForm, expires_at: e.target.value })} />
            <button style={btnPrimary} type="submit">สร้างประกาศ</button>
          </form>
        </div>
      )}

      {tab === 'events' && events.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted, fontSize: 15 }}>
          ยังไม่มีกิจกรรม — กดปุ่ม "สร้างกิจกรรม" เพื่อเริ่มต้น
        </div>
      )}

      {tab === 'events' && events.map((ev) => (
        <div key={ev.id} style={{ ...cardBase, marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>{ev.title}</h3>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: colors.textMuted, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ClockIcon size={13} color={colors.textMuted} />
              {ev.event_date ? new Date(ev.event_date).toLocaleString('th-TH') : '-'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon size={13} color={colors.textMuted} />
              {ev.location || '-'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>{ev.description}</p>
          {ev.image_url && <img src={ev.image_url} alt={ev.title} style={{ maxWidth: 300, borderRadius: radius.md, marginTop: 10 }} />}
        </div>
      ))}

      {tab === 'announcements' && announcements.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted, fontSize: 15 }}>
          ยังไม่มีประกาศ — กดปุ่ม "สร้างประกาศ" เพื่อเริ่มต้น
        </div>
      )}

      {tab === 'announcements' && announcements.map((ann) => {
        const p = priorityMap[ann.priority] || priorityMap.normal;
        return (
          <div key={ann.id} style={{ ...cardBase, marginBottom: 12, borderLeft: `3px solid ${p.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{ann.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: p.bg, color: p.color }}>
                {p.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>{ann.content}</p>
            {ann.expires_at && (
              <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, margin: '8px 0 0' }}>
                หมดอายุ: {new Date(ann.expires_at).toLocaleString('th-TH')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
