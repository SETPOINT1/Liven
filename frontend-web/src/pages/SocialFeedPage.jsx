import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';

const cardStyle = { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' };
const btnPrimary = { padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const btnSmall = (bg) => ({ padding: '4px 12px', border: 'none', borderRadius: 4, color: '#fff', background: bg, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tabStyle = (active) => ({ padding: '8px 20px', border: 'none', borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 14 });

const typeBadge = {
  announcement: { label: '📢 ประกาศ', bg: '#e6f7ff', color: '#1890ff', border: '#91d5ff' },
  alert: { label: '🚨 แจ้งเตือน', bg: '#fff2f0', color: '#ff4d4f', border: '#ffa39e' },
  normal: { label: '💬 ทั่วไป', bg: '#f6ffed', color: '#52c41a', border: '#b7eb8f' },
};

const roleBadge = {
  juristic: { label: 'นิติบุคคล', bg: '#f0f5ff', color: '#2f54eb' },
  resident: { label: 'ลูกบ้าน', bg: '#f9f0ff', color: '#722ed1' },
  developer: { label: 'Developer', bg: '#fff7e6', color: '#fa8c16' },
};

const reportStatusLabels = { pending: 'รอตรวจสอบ', reviewed: 'ตรวจสอบแล้ว', dismissed: 'ยกเลิก' };

function renderBadge(type) {
  const badge = typeBadge[type] || typeBadge.normal;
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 10,
      background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
    }}>
      {badge.label}
    </span>
  );
}

function renderRoleBadge(role) {
  const badge = roleBadge[role] || roleBadge.resident;
  return (
    <span style={{
      fontSize: 11, padding: '1px 6px', borderRadius: 4,
      background: badge.bg, color: badge.color, marginLeft: 6,
    }}>
      {badge.label}
    </span>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(dateStr).toLocaleDateString('th-TH');
}

export default function SocialFeedPage() {
  const { user } = useAuth();
  const isJuristic = user?.role === 'juristic';
  const [tab, setTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [postForm, setPostForm] = useState({ content: '', post_type: 'announcement', image: null });
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [reviewModal, setReviewModal] = useState({ open: false, postId: null, reportId: null });
  const [reviewResult, setReviewResult] = useState(null);

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

  async function handleReportAction(postId, reportId, newStatus) {
    try {
      await api.patch(`/posts/${postId}/report/${reportId}/`, { status: newStatus });
      fetchReports();
      fetchPosts();
    } catch { /* ignore */ }
  }

  async function handleReviewAction(action) {
    const { postId, reportId } = reviewModal;
    if (action === 'delete') {
      try {
        await api.delete(`/posts/${postId}/`);
        setReviewResult('ตรวจสอบแล้ว — ลบโพสต์แล้ว');
      } catch { setReviewResult('ไม่สามารถลบโพสต์ได้'); }
    } else if (action === 'dismiss') {
      setReviewResult('ตรวจสอบแล้ว — ไม่พบปัญหา');
    }
    // Mark all reports as reviewed
    try {
      await api.patch(`/posts/${postId}/report/${reportId}/`, { status: 'reviewed' });
    } catch { /* ignore */ }
    setReviewModal({ open: false, postId: null, reportId: null });
    fetchReports();
    fetchPosts();
    // Auto-clear result after 3 seconds
    setTimeout(() => setReviewResult(null), 3000);
  }

  async function handleDeletePost(postId) {
    setConfirm({
      open: true, title: 'ลบโพสต์', message: 'ต้องการลบโพสต์นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      action: async () => {
        try { await api.delete(`/posts/${postId}/`); fetchPosts(); } catch { /* ignore */ }
        setConfirm({ open: false });
      },
    });
  }

  async function handleDeleteComment(postId, commentId) {
    setConfirm({
      open: true, title: 'ลบความคิดเห็น', message: 'ต้องการลบความคิดเห็นนี้ใช่หรือไม่?',
      action: async () => {
        try { await api.delete(`/posts/${postId}/comments/${commentId}/`); fetchPosts(); } catch { /* ignore */ }
        setConfirm({ open: false });
      },
    });
  }

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

      {tab === 'feed' && posts.map((post) => {
        const isAuthorJuristic = post.author_role === 'juristic';
        let borderColor;
        if (isAuthorJuristic && post.post_type === 'alert') {
          borderColor = '#ff4d4f'; // แดง - แจ้งเตือนจากนิติ
        } else if (isAuthorJuristic) {
          borderColor = '#722ed1'; // ม่วง - ประกาศจากนิติ
        } else {
          borderColor = '#1890ff'; // น้ำเงิน - ลูกบ้าน
        }
        return (
          <div key={post.id} style={{ ...cardStyle, borderLeft: `4px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#e8e8e8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, marginRight: 10, flexShrink: 0,
                }}>
                  {(post.author_name || '?')[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {post.author_name || 'ผู้ใช้'}
                    {renderRoleBadge(post.author_role)}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>{timeAgo(post.created_at)}</div>
                </div>
              </div>
              {renderBadge(post.post_type)}
            </div>
            <p style={{ margin: '8px 0', lineHeight: 1.6 }}>{post.content}</p>
            {post.image_url && <img src={post.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4, marginTop: 8 }} />}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0', fontSize: 13, color: '#666', display: 'flex', gap: 16, alignItems: 'center' }}>
              <span>{post.is_liked ? '❤️' : '🤍'} {post.like_count || 0} ถูกใจ</span>
              <span>💬 {post.comment_count || 0} ความคิดเห็น</span>
              {isJuristic && (
                <button onClick={() => handleDeletePost(post.id)} style={{ marginLeft: 'auto', padding: '2px 10px', border: '1px solid #ff4d4f', borderRadius: 4, background: '#fff', color: '#ff4d4f', cursor: 'pointer', fontSize: 12 }}>
                  🗑 ลบโพสต์
                </button>
              )}
            </div>
            {post.comments && post.comments.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f5f5f5' }}>
                {post.comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{c.author_name}</span>
                      <span style={{ color: '#666', marginLeft: 8 }}>{c.content}</span>
                      <span style={{ color: '#bbb', marginLeft: 8, fontSize: 11 }}>{timeAgo(c.created_at)}</span>
                    </div>
                    {isJuristic && (
                      <button onClick={() => handleDeleteComment(post.id, c.id)} style={{ padding: '1px 6px', border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {tab === 'reports' && (
        <div>
          {reviewResult && (
            <div style={{ padding: '10px 16px', marginBottom: 12, borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 14 }}>
              ✅ {reviewResult}
            </div>
          )}
          {reports.length === 0 && <p style={{ color: '#999' }}>ไม่มีโพสต์ที่ถูกรายงาน</p>}
          {reports.map((r) => (
            <div key={r.id} style={cardStyle}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>โพสต์: </span>{r.post?.content?.substring(0, 100) || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                ผู้รายงาน: {r.reporter_name || 'ผู้ใช้'} | เหตุผล: {r.reason || 'ไม่ระบุ'}
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : ''}
              </div>
              {r.status === 'pending' ? (
                <button
                  onClick={() => setReviewModal({ open: true, postId: r.post?.id, reportId: r.id })}
                  style={{ padding: '6px 16px', border: 'none', borderRadius: 4, background: '#4F46E5', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                >
                  ตรวจสอบ
                </button>
              ) : (
                <span style={{ fontSize: 13, color: '#52c41a', fontWeight: 600 }}>✅ ตรวจสอบแล้ว</span>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', minWidth: 360, maxWidth: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>ตรวจสอบโพสต์ที่ถูกรายงาน</h3>
            <p style={{ margin: '0 0 20px', color: '#555', fontSize: 14 }}>เลือกการดำเนินการสำหรับโพสต์นี้</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => handleReviewAction('delete')}
                style={{ padding: '10px 0', border: 'none', borderRadius: 4, background: '#ff4d4f', color: '#fff', cursor: 'pointer', fontSize: 14 }}
              >
                🗑 ลบโพสต์
              </button>
              <button
                onClick={() => handleReviewAction('dismiss')}
                style={{ padding: '10px 0', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', color: '#333', cursor: 'pointer', fontSize: 14 }}
              >
                ✓ ไม่พบปัญหา
              </button>
              <button
                onClick={() => setReviewModal({ open: false, postId: null, reportId: null })}
                style={{ padding: '10px 0', border: 'none', borderRadius: 4, background: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.action}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  );
}
