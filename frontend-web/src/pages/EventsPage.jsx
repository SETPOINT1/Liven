import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';

const cardStyle = { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' };
const btnPrimary = { padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const tabStyle = (active) => ({ padding: '8px 20px', border: 'none', borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 14 });
const priorityColors = { normal: '#52c41a', important: '#faad14', emergency: '#ff4d4f' };
const priorityLabels = { normal: 'ปกติ', important: 'สำคัญ', emergency: 'ฉุกเฉิน' };

export default function EventsPage() {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', location: '', image: null });
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 'normal', expires_at: '' });

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
  }

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    const payload = { ...annForm };
    if (!payload.expires_at) delete payload.expires_at;
    await api.post('/announcements/', payload);
    setAnnForm({ title: '', content: '', priority: 'normal', expires_at: '' });
    setShowForm(false);
    fetchAnnouncements();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>กิจกรรมและประกาศ</h2>
        <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'ยกเลิก' : (tab === 'events' ? '+ สร้างกิจกรรม' : '+ สร้างประกาศ')}
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle(tab === 'events')} onClick={() => { setTab('events'); setShowForm(false); }}>กิจกรรม</button>
        <button style={tabStyle(tab === 'announcements')} onClick={() => { setTab('announcements'); setShowForm(false); }}>ประกาศ</button>
      </div>

      {showForm && tab === 'events' && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>สร้างกิจกรรมใหม่</h3>
          <form onSubmit={handleCreateEvent}>
            <label style={{ fontSize: 13 }}>ชื่อกิจกรรม</label>
            <input style={inputStyle} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
            <label style={{ fontSize: 13 }}>รายละเอียด</label>
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            <label style={{ fontSize: 13 }}>วันเวลา</label>
            <input style={inputStyle} type="datetime-local" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} required />
            <label style={{ fontSize: 13 }}>สถานที่</label>
            <input style={inputStyle} value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
            <label style={{ fontSize: 13 }}>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={(e) => setEventForm({ ...eventForm, image: e.target.files[0] })} style={{ marginBottom: 12 }} />
            <button style={btnPrimary} type="submit">สร้างกิจกรรม</button>
          </form>
        </div>
      )}

      {showForm && tab === 'announcements' && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>สร้างประกาศใหม่</h3>
          <form onSubmit={handleCreateAnnouncement}>
            <label style={{ fontSize: 13 }}>หัวข้อ</label>
            <input style={inputStyle} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required />
            <label style={{ fontSize: 13 }}>เนื้อหา</label>
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required />
            <label style={{ fontSize: 13 }}>ระดับความสำคัญ</label>
            <select style={inputStyle} value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
              <option value="normal">ปกติ</option>
              <option value="important">สำคัญ</option>
              <option value="emergency">ฉุกเฉิน</option>
            </select>
            <label style={{ fontSize: 13 }}>วันหมดอายุ</label>
            <input style={inputStyle} type="datetime-local" value={annForm.expires_at} onChange={(e) => setAnnForm({ ...annForm, expires_at: e.target.value })} />
            <button style={btnPrimary} type="submit">สร้างประกาศ</button>
          </form>
        </div>
      )}

      {tab === 'events' && events.map((ev) => (
        <div key={ev.id} style={cardStyle}>
          <h3>{ev.title}</h3>
          <p style={{ color: '#666', fontSize: 13 }}>📅 {ev.event_date ? new Date(ev.event_date).toLocaleString('th-TH') : '-'} | 📍 {ev.location || '-'}</p>
          <p>{ev.description}</p>
          {ev.image_url && <img src={ev.image_url} alt={ev.title} style={{ maxWidth: 300, borderRadius: 4, marginTop: 8 }} />}
        </div>
      ))}

      {tab === 'announcements' && announcements.map((ann) => (
        <div key={ann.id} style={{ ...cardStyle, borderLeft: `4px solid ${priorityColors[ann.priority] || '#ccc'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{ann.title}</h3>
            <span style={{ color: priorityColors[ann.priority], fontWeight: 600, fontSize: 12 }}>{priorityLabels[ann.priority]}</span>
          </div>
          <p>{ann.content}</p>
          {ann.expires_at && <p style={{ fontSize: 12, color: '#999' }}>หมดอายุ: {new Date(ann.expires_at).toLocaleString('th-TH')}</p>}
        </div>
      ))}
    </div>
  );
}
