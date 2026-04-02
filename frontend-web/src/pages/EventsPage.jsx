import { useState, useEffect } from 'react';
import api from '../services/api';
import { C, R, card, pageTitle, btn, tab, inp, lbl } from '../theme';
import { PlusIcon, ClockIcon, LocationIcon } from '../components/Icons';

const priorityMap = {
  normal:    { label: 'ปกติ',    bg: '#dcfce7', color: '#15803d' },
  important: { label: 'สำคัญ',   bg: '#fef9c3', color: '#a16207' },
  emergency: { label: 'ฉุกเฉิน', bg: '#fee2e2', color: '#b91c1c' },
};

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('events');
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
        <button style={btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'ยกเลิก' : <><PlusIcon s={14} c="#fff" /> {activeTab === 'events' ? 'สร้างกิจกรรม' : 'สร้างประกาศ'}</>}
        </button>
      </div>

      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
        <button style={tab(activeTab === 'events')} onClick={() => { setActiveTab('events'); setShowForm(false); }}>กิจกรรม</button>
        <button style={tab(activeTab === 'announcements')} onClick={() => { setActiveTab('announcements'); setShowForm(false); }}>ประกาศ</button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: R.sm,
          background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {showForm && activeTab === 'events' && (
        <div style={{ ...card, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: C.text }}>สร้างกิจกรรมใหม่</h3>
          <form onSubmit={handleCreateEvent}>
            <label style={lbl}>ชื่อกิจกรรม</label>
            <input style={inp} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
            <label style={lbl}>รายละเอียด</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            <label style={lbl}>วันเวลา</label>
            <input style={inp} type="datetime-local" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} required />
            <label style={lbl}>สถานที่</label>
            <input style={inp} value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
            <label style={lbl}>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={(e) => setEventForm({ ...eventForm, image: e.target.files[0] })} style={{ marginBottom: 14 }} />
            <button style={btn} type="submit">สร้างกิจกรรม</button>
          </form>
        </div>
      )}

      {showForm && activeTab === 'announcements' && (
        <div style={{ ...card, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: C.text }}>สร้างประกาศใหม่</h3>
          <form onSubmit={handleCreateAnnouncement}>
            <label style={lbl}>หัวข้อ</label>
            <input style={inp} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required />
            <label style={lbl}>เนื้อหา</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required />
            <label style={lbl}>ระดับความสำคัญ</label>
            <select style={inp} value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="normal">ปกติ</option>
              <option value="important">สำคัญ</option>
              <option value="emergency">ฉุกเฉิน</option>
            </select>
            <label style={lbl}>วันหมดอายุ</label>
            <input style={inp} type="datetime-local" value={annForm.expires_at} onChange={(e) => setAnnForm({ ...annForm, expires_at: e.target.value })} />
            <button style={btn} type="submit">สร้างประกาศ</button>
          </form>
        </div>
      )}

      {activeTab === 'events' && events.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 15 }}>
          ยังไม่มีกิจกรรม — กดปุ่ม "สร้างกิจกรรม" เพื่อเริ่มต้น
        </div>
      )}

      {activeTab === 'events' && events.map((ev) => (
        <div key={ev.id} style={{ ...card, marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: C.text }}>{ev.title}</h3>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.muted, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ClockIcon s={13} c={C.muted} />
              {ev.event_date ? new Date(ev.event_date).toLocaleString('th-TH') : '-'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon s={13} c={C.muted} />
              {ev.location || '-'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{ev.description}</p>
          {ev.image_url && <img src={ev.image_url} alt={ev.title} style={{ maxWidth: 300, borderRadius: R.md, marginTop: 10 }} />}
        </div>
      ))}

      {activeTab === 'announcements' && announcements.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 15 }}>
          ยังไม่มีประกาศ — กดปุ่ม "สร้างประกาศ" เพื่อเริ่มต้น
        </div>
      )}

      {activeTab === 'announcements' && announcements.map((ann) => {
        const p = priorityMap[ann.priority] || priorityMap.normal;
        return (
          <div key={ann.id} style={{ ...card, marginBottom: 12, borderLeft: `3px solid ${p.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>{ann.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: p.bg, color: p.color }}>
                {p.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{ann.content}</p>
            {ann.expires_at && (
              <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0' }}>
                หมดอายุ: {new Date(ann.expires_at).toLocaleString('th-TH')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
