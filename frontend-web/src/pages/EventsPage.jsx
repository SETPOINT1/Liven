import { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, card, pageTitle, btn, tab, inp, lbl, pageHeader, tabBadge, emptyState, toastStyle, btnSm } from '../theme';
import { PlusIcon, ClockIcon, LocationIcon, EventIcon, TrashIcon, CameraIcon } from '../components/Icons';

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
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    Promise.all([fetchEvents(), fetchAnnouncements()]).finally(() => setLoading(false));
  }, []);

  async function fetchEvents() {
    try { const { data } = await api.get('/events/'); setEvents(data); } catch { showToast('ไม่สามารถโหลดกิจกรรมได้', 'error'); }
  }
  async function fetchAnnouncements() {
    try { const { data } = await api.get('/announcements/'); setAnnouncements(data); } catch { showToast('ไม่สามารถโหลดประกาศได้', 'error'); }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    try {
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
    } catch { showToast('ไม่สามารถสร้างกิจกรรมได้', 'error'); }
  }

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    try {
      const payload = { ...annForm };
      if (!payload.expires_at) delete payload.expires_at;
      await api.post('/announcements/', payload);
      setAnnForm({ title: '', content: '', priority: 'normal', expires_at: '' });
      setShowForm(false);
      fetchAnnouncements();
      showToast('สร้างประกาศสำเร็จ');
    } catch { showToast('ไม่สามารถสร้างประกาศได้', 'error'); }
  }

  function handleDeleteEvent(ev) {
    setConfirm({
      open: true, title: 'ลบกิจกรรม', message: `ต้องการลบ "${ev.title}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.delete(`/events/${ev.id}/`); fetchEvents(); showToast('ลบกิจกรรมสำเร็จ'); }
        catch { showToast('ไม่สามารถลบกิจกรรมได้', 'error'); }
        setConfirm({ open: false });
      },
    });
  }

  function handleDeleteAnnouncement(ann) {
    setConfirm({
      open: true, title: 'ลบประกาศ', message: `ต้องการลบ "${ann.title}" ใช่หรือไม่?`,
      action: async () => {
        try { await api.delete(`/announcements/${ann.id}/`); fetchAnnouncements(); showToast('ลบประกาศสำเร็จ'); }
        catch { showToast('ไม่สามารถลบประกาศได้', 'error'); }
        setConfirm({ open: false });
      },
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.ok)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.ok + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EventIcon s={22} c={C.ok} />
            </div>
            <div>
              <h1 style={pageTitle}>กิจกรรมและประกาศ</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>สร้างและจัดการกิจกรรม ประกาศสำหรับลูกบ้าน</p>
            </div>
          </div>
          <button style={btn} onClick={() => setShowForm(!showForm)} aria-label={showForm ? 'ยกเลิก' : 'สร้างใหม่'}>
            {showForm ? 'ยกเลิก' : <><PlusIcon s={14} c="#fff" /> {activeTab === 'events' ? 'สร้างกิจกรรม' : 'สร้างประกาศ'}</>}
          </button>
        </div>
      </div>

      {/* Tabs with count badges */}
      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center' }}>
        <button style={tab(activeTab === 'events')} onClick={() => { setActiveTab('events'); setShowForm(false); }}>
          กิจกรรม
          <span style={tabBadge(events.length, activeTab === 'events')}>{events.length}</span>
        </button>
        <button style={tab(activeTab === 'announcements')} onClick={() => { setActiveTab('announcements'); setShowForm(false); }}>
          ประกาศ
          <span style={tabBadge(announcements.length, activeTab === 'announcements')}>{announcements.length}</span>
        </button>
      </div>

      {toast && (
        <div style={toastStyle(toast.type)}>{toast.msg}</div>
      )}

      {/* Event Form */}
      {showForm && activeTab === 'events' && (
        <div style={{ ...card, marginBottom: 18, borderTop: `3px solid ${C.ok}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: R.md, background: C.ok + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EventIcon s={18} c={C.ok} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>สร้างกิจกรรมใหม่</h3>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>กรอกข้อมูลกิจกรรมสำหรับลูกบ้าน</p>
            </div>
          </div>
          <form onSubmit={handleCreateEvent}>
            <label style={lbl}>ชื่อกิจกรรม *</label>
            <input style={inp} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required placeholder="เช่น งานสังสรรค์ประจำปี" />
            <label style={lbl}>รายละเอียด</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="อธิบายรายละเอียดกิจกรรม..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>วันเวลา *</label>
                <input style={inp} type="datetime-local" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} required />
              </div>
              <div>
                <label style={lbl}>สถานที่</label>
                <input style={inp} value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="เช่น ลานกิจกรรมชั้น 1" />
              </div>
            </div>
            <label style={lbl}>รูปภาพ</label>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${eventForm.image ? C.ok : C.border}`, borderRadius: R.md,
              padding: '16px 20px', marginBottom: 16, background: eventForm.image ? '#f0fdf4' : C.bg,
              cursor: 'pointer', transition: 'border-color 0.2s',
            }}>
              <input type="file" accept="image/*" onChange={(e) => setEventForm({ ...eventForm, image: e.target.files[0] })} style={{ display: 'none' }} />
              {eventForm.image ? (
                <div style={{ fontSize: 13, color: C.ok, fontWeight: 500 }}>{eventForm.image.name}</div>
              ) : (
                <>
                  <CameraIcon s={22} c={C.muted} />
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>คลิกเพื่อเลือกรูปภาพ</div>
                </>
              )}
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button style={{ ...btn, background: C.ok }} type="submit"><PlusIcon s={14} c="#fff" /> สร้างกิจกรรม</button>
            </div>
          </form>
        </div>
      )}

      {/* Announcement Form */}
      {showForm && activeTab === 'announcements' && (
        <div style={{ ...card, marginBottom: 18, borderTop: `3px solid ${C.info}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: R.md, background: C.info + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EventIcon s={18} c={C.info} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>สร้างประกาศใหม่</h3>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>ประกาศจะแสดงให้ลูกบ้านทุกคนเห็น</p>
            </div>
          </div>
          <form onSubmit={handleCreateAnnouncement}>
            <label style={lbl}>หัวข้อ *</label>
            <input style={inp} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required placeholder="เช่น แจ้งปิดน้ำชั่วคราว" />
            <label style={lbl}>เนื้อหา *</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} required placeholder="รายละเอียดประกาศ..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>ระดับความสำคัญ</label>
                <select style={inp} value={annForm.priority} onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value })}>
                  <option value="normal">ปกติ</option>
                  <option value="important">สำคัญ</option>
                  <option value="emergency">ฉุกเฉิน</option>
                </select>
              </div>
              <div>
                <label style={lbl}>วันหมดอายุ (ไม่บังคับ)</label>
                <input style={inp} type="datetime-local" value={annForm.expires_at} onChange={(e) => setAnnForm({ ...annForm, expires_at: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button style={{ ...btn, background: C.info }} type="submit"><PlusIcon s={14} c="#fff" /> สร้างประกาศ</button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      {activeTab === 'events' && events.length === 0 && !showForm && (
        <div style={emptyState}>
          <EventIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>ยังไม่มีกิจกรรม</div>
          <div style={{ fontSize: 13, color: C.muted }}>กดปุ่ม "สร้างกิจกรรม" เพื่อเริ่มต้น</div>
          <button style={{ ...btn, marginTop: 8 }} onClick={() => setShowForm(true)}>
            <PlusIcon s={14} c="#fff" /> สร้างกิจกรรม
          </button>
        </div>
      )}

      {activeTab === 'events' && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 14 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{ ...card, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${C.ok}` }}>
              {ev.image_url && (
                <img src={ev.image_url} alt={ev.title} style={{ width: 'calc(100% + 48px)', height: 160, objectFit: 'cover', borderRadius: `${R.md}px ${R.md}px 0 0`, marginBottom: 12, marginTop: -24, marginLeft: -24, marginRight: -24 }} />
              )}
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: C.text }}>{ev.title}</h3>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.muted, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ClockIcon s={13} c={C.muted} />
                  {ev.event_date ? new Date(ev.event_date).toLocaleString('th-TH') : '-'}
                </span>
                {ev.location && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <LocationIcon s={13} c={C.muted} />
                    {ev.location}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6, flex: 1 }}>{ev.description}</p>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button style={btnSm(C.err)} onClick={() => handleDeleteEvent(ev)} aria-label={`ลบ ${ev.title}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrashIcon s={12} c="#fff" /> ลบ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcements List */}
      {activeTab === 'announcements' && announcements.length === 0 && !showForm && (
        <div style={emptyState}>
          <EventIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>ยังไม่มีประกาศ</div>
          <div style={{ fontSize: 13, color: C.muted }}>กดปุ่ม "สร้างประกาศ" เพื่อเริ่มต้น</div>
          <button style={{ ...btn, marginTop: 8 }} onClick={() => setShowForm(true)}>
            <PlusIcon s={14} c="#fff" /> สร้างประกาศ
          </button>
        </div>
      )}

      {activeTab === 'announcements' && announcements.map((ann) => {
        const p = priorityMap[ann.priority] || priorityMap.normal;
        return (
          <div key={ann.id} style={{ ...card, marginBottom: 12, borderLeft: `4px solid ${p.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.text }}>{ann.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: p.bg, color: p.color }}>
                {p.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{ann.content}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {ann.expires_at ? (
                <p style={{ fontSize: 11, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClockIcon s={11} c={C.muted} />
                  หมดอายุ: {new Date(ann.expires_at).toLocaleString('th-TH')}
                </p>
              ) : <span />}
              <button style={btnSm(C.err)} onClick={() => handleDeleteAnnouncement(ann)} aria-label={`ลบ ${ann.title}`}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrashIcon s={12} c="#fff" /> ลบ</span>
              </button>
            </div>
          </div>
        );
      })}
      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm({ open: false })} />
    </div>
  );
}
