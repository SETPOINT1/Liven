import { useState, useEffect } from 'react';
import api from '../services/api';

const cardStyle = { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' };
const btnPrimary = { padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tabStyle = (active) => ({ padding: '8px 20px', border: 'none', borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 14 });

const reportStatusLabels = { pending: 'รอตรวจสอบ', reviewed: 'ตรวจสอบแล้ว', dismissed: 'ยกเลิก' };

export default function SocialFeedPage() {
  const [tab, setTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [postForm, setPostForm] = useState({ content: '', post_type: 'announcement', image: null });

  useEffect(() => { fetchPosts(); }, []);
  useEffect(() => { if (tab === 'reports') fetchReports(); }, [tab]);

  async function fetchPosts() {
    try { const { data } = await api.get('/posts/'); setPosts(data); } catch { /* ignore */ }
  }

  async function fetchReports() {
    try {
      const { data } = await api.get('/posts/');
      const allReports = [];
      for (const post of data) {
        if (post.reports && post.reports.length > 0) {
          post.reports.forEach((r) => allReports.push({ ...r, post }));
        }
      }
      setReports(allReports);
    } catch { /* ignore */ }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('content', postForm.content);
    fd.append('post_type', postForm.post_type);
    if (postForm.image) fd.append('image', postForm.image);
    await api.post('/posts/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setPostForm({ content: '', post_type: 'announcement', image: null });
    setShowForm(false);
    fetchPosts();
  }

  async function handleReportAction(postId, reportId, status) {
    try {
      await api.patch(`/posts/${postId}/report/${reportId}/`, { status });
      fetchReports();
    } catch { /* ignore */ }
  }

  const typeLabels = { normal: 'โพสต์', announcement: '📢 ประกาศ', alert: '🚨 แจ้งเตือน' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Social Feed</h2>
        {tab === 'feed' && (
          <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'ยกเลิก' : '+ สร้างโพสต์'}
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle(tab === 'feed')} onClick={() => setTab('feed')}>Feed</button>
        <button style={tabStyle(tab === 'reports')} onClick={() => setTab('reports')}>โพสต์ที่ถูกรายงาน</button>
      </div>

      {showForm && tab === 'feed' && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>สร้างโพสต์ใหม่</h3>
          <form onSubmit={handleCreatePost}>
            <label style={{ fontSize: 13 }}>ประเภท</label>
            <select style={inputStyle} value={postForm.post_type} onChange={(e) => setPostForm({ ...postForm, post_type: e.target.value })}>
              <option value="announcement">ประกาศ</option>
              <option value="alert">แจ้งเตือน</option>
            </select>
            <label style={{ fontSize: 13 }}>เนื้อหา</label>
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} required />
            <label style={{ fontSize: 13 }}>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={(e) => setPostForm({ ...postForm, image: e.target.files[0] })} style={{ marginBottom: 12 }} />
            <button style={btnPrimary} type="submit">โพสต์</button>
          </form>
        </div>
      )}

      {tab === 'feed' && posts.map((post) => (
        <div key={post.id} style={{ ...cardStyle, borderLeft: post.post_type === 'alert' ? '4px solid #ff4d4f' : post.post_type === 'announcement' ? '4px solid #1890ff' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{post.author_name || 'ผู้ใช้'}</span>
            <span style={{ fontSize: 12, color: '#999' }}>{typeLabels[post.post_type] || post.post_type}</span>
          </div>
          <p>{post.content}</p>
          {post.image_url && <img src={post.image_url} alt="" style={{ maxWidth: 300, borderRadius: 4, marginTop: 8 }} />}
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            ❤️ {post.likes_count || 0} | 💬 {post.comments_count || 0} | {post.created_at ? new Date(post.created_at).toLocaleString('th-TH') : ''}
          </div>
        </div>
      ))}

      {tab === 'reports' && (
        <div>
          {reports.length === 0 && <p style={{ color: '#999' }}>ไม่มีโพสต์ที่ถูกรายงาน</p>}
          {reports.map((r) => (
            <div key={r.id} style={cardStyle}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>โพสต์: </span>{r.post?.content?.substring(0, 100) || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                เหตุผล: {r.reason || '-'} | สถานะ: {reportStatusLabels[r.status] || r.status}
              </div>
              {r.status === 'pending' && (
                <div>
                  <button style={btnSmall('#52c41a')} onClick={() => handleReportAction(r.post?.id, r.id, 'reviewed')}>ตรวจสอบแล้ว</button>
                  <button style={btnSmall('#8c8c8c')} onClick={() => handleReportAction(r.post?.id, r.id, 'dismissed')}>ยกเลิก</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
