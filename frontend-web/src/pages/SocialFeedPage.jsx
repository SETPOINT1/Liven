import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';
import {
  colors, radius, card as cardBase, pageTitle, btnPrimary, tabBtn,
  input as inputBase, label as labelStyle, modalOverlay, modalBox,
} from '../theme';
import { PlusIcon, TrashIcon, HeartIcon, ChatIcon, MegaphoneIcon, AlertIcon, CloseIcon } from '../components/Icons';

const typeBadge = {
  announcement: { label: 'ประกาศ',  icon: MegaphoneIcon, bg: '#eff6ff', color: '#2563eb' },
  alert:        { label: 'แจ้งเตือน', icon: AlertIcon,     bg: '#fef2f2', color: '#dc2626' },
  normal:       { label: 'ทั่วไป',   icon: ChatIcon,      bg: '#f0fdf4', color: '#16a34a' },
};

const roleBadge = {
  juristic:  { label: 'นิติบุคคล', bg: '#eff6ff', color: '#2563eb' },
  resident:  { label: 'ลูกบ้าน',  bg: '#faf5ff', color: '#7c3aed' },
  developer: { label: 'Developer', bg: '#fffbeb', color: '#d97706' },
};

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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setLoading(false);
    })();
  }, []);
  useEffect(() => { if (tab === 'reports') fetchReports(); }, [tab]);

  async function fetchPosts() {
    try { const { data } = await api.get('/posts/'); setPosts(data); } catch { /* ignore */ }
  }
  async function fetchReports() {
    try {
      const { data } = await api.get('/posts/');
      const all = [];
      for (const post of data) {
        if (post.reports?.length > 0) post.reports.forEach((r) => all.push({ ...r, post }));
      }
      setReports(all);
    } catch { /* ignore */ }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    try {
      let imageUrl = '';
      if (postForm.image) {
        const file = postForm.image;
        const ext = file.name.split('.').pop();
        const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('posts').upload(path, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path);
          imageUrl = urlData?.publicUrl || '';
        }
      }
      await api.post('/posts/', {
        content: postForm.content,
        post_type: postForm.post_type,
        image_url: imageUrl,
      });
      setPostForm({ content: '', post_type: 'announcement', image: null });
      setShowForm(false);
      fetchPosts();
      showToast('สร้างโพสต์สำเร็จ');
    } catch { /* ignore */ }
  }

  async function handleReviewAction(action) {
    const { postId, reportId } = reviewModal;
    if (action === 'delete') {
      try { await api.delete(`/posts/${postId}/`); setReviewResult('ตรวจสอบแล้ว — ลบโพสต์แล้ว'); }
      catch { setReviewResult('ไม่สามารถลบโพสต์ได้'); }
    } else {
      setReviewResult('ตรวจสอบแล้ว — ไม่พบปัญหา');
    }
    try { await api.patch(`/posts/${postId}/report/${reportId}/`, { status: 'reviewed' }); } catch { /* ignore */ }
    setReviewModal({ open: false, postId: null, reportId: null });
    fetchReports(); fetchPosts();
    setTimeout(() => setReviewResult(null), 3000);
  }

  async function handleDeletePost(postId) {
    setConfirm({
      open: true, title: 'ลบโพสต์', message: 'ต้องการลบโพสต์นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      action: async () => { try { await api.delete(`/posts/${postId}/`); fetchPosts(); } catch {} setConfirm({ open: false }); },
    });
  }

  async function handleDeleteComment(postId, commentId) {
    setConfirm({
      open: true, title: 'ลบความคิดเห็น', message: 'ต้องการลบความคิดเห็นนี้ใช่หรือไม่?',
      action: async () => { try { await api.delete(`/posts/${postId}/comments/${commentId}/`); fetchPosts(); } catch {} setConfirm({ open: false }); },
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Social Feed</h1>
        {tab === 'feed' && (
          <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'ยกเลิก' : <><PlusIcon size={14} color="#fff" /> สร้างโพสต์</>}
          </button>
        )}
      </div>

      <div style={{ marginBottom: 18, borderBottom: `1px solid ${colors.border}` }}>
        <button style={tabBtn(tab === 'feed')} onClick={() => setTab('feed')}>Feed</button>
        <button style={tabBtn(tab === 'reports')} onClick={() => setTab('reports')}>โพสต์ที่ถูกรายงาน</button>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: radius.sm,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {showForm && tab === 'feed' && (
        <div style={{ ...cardBase, marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>สร้างโพสต์ใหม่</h3>
          <form onSubmit={handleCreatePost}>
            <label style={labelStyle}>ประเภท</label>
            <select style={inputBase} value={postForm.post_type} onChange={(e) => setPostForm({ ...postForm, post_type: e.target.value })}>
              <option value="announcement">ประกาศ</option>
              <option value="alert">แจ้งเตือน</option>
            </select>
            <label style={labelStyle}>เนื้อหา</label>
            <textarea style={{ ...inputBase, minHeight: 80, resize: 'vertical' }} value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} required />
            <label style={labelStyle}>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={(e) => setPostForm({ ...postForm, image: e.target.files[0] })} style={{ marginBottom: 14 }} />
            <button style={btnPrimary} type="submit">โพสต์</button>
          </form>
        </div>
      )}

      {tab === 'feed' && posts.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted, fontSize: 15 }}>
          ยังไม่มีโพสต์ — กดปุ่ม "สร้างโพสต์" เพื่อเริ่มต้น
        </div>
      )}

      {tab === 'feed' && posts.map((post) => {
        const isAuthorJuristic = post.author_role === 'juristic';
        const borderColor = isAuthorJuristic && post.post_type === 'alert' ? colors.danger
          : isAuthorJuristic ? '#7c3aed' : colors.info;
        const tb = typeBadge[post.post_type] || typeBadge.normal;
        const rb = roleBadge[post.author_role] || roleBadge.resident;
        const TypeIcon = tb.icon;

        return (
          <div key={post.id} style={{ ...cardBase, marginBottom: 12, borderLeft: `3px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: colors.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: colors.textSecondary, flexShrink: 0,
                }}>
                  {(post.author_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {post.author_name || 'ผู้ใช้'}
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: rb.bg, color: rb.color }}>{rb.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{timeAgo(post.created_at)}</div>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: tb.bg, color: tb.color }}>
                <TypeIcon size={12} color={tb.color} /> {tb.label}
              </span>
            </div>

            <p style={{ margin: '8px 0', lineHeight: 1.6, fontSize: 13 }}>{post.content}</p>
            {post.image_url && <img src={post.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: radius.md, marginTop: 8 }} />}

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.borderLight}`, fontSize: 12, color: colors.textMuted, display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <HeartIcon size={14} color={post.is_liked ? colors.danger : colors.textMuted} filled={post.is_liked} /> {post.like_count || 0}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ChatIcon size={14} color={colors.textMuted} /> {post.comment_count || 0}
              </span>
              {isJuristic && (
                <button onClick={() => handleDeletePost(post.id)} style={{
                  marginLeft: 'auto', padding: '3px 10px', border: `1px solid ${colors.danger}`, borderRadius: radius.sm,
                  background: 'transparent', color: colors.danger, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <TrashIcon size={12} color={colors.danger} /> ลบ
                </button>
              )}
            </div>

            {post.comments?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.borderLight}` }}>
                {post.comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{c.author_name}</span>
                      <span style={{ color: colors.textSecondary, marginLeft: 8 }}>{c.content}</span>
                      <span style={{ color: colors.textMuted, marginLeft: 8, fontSize: 10 }}>{timeAgo(c.created_at)}</span>
                    </div>
                    {isJuristic && (
                      <button onClick={() => handleDeleteComment(post.id, c.id)} style={{ padding: '1px 4px', border: 'none', background: 'none', color: colors.danger, cursor: 'pointer' }}>
                        <CloseIcon size={13} color={colors.danger} />
                      </button>
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
            <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: radius.sm, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13 }}>
              {reviewResult}
            </div>
          )}
          {reports.length === 0 && <p style={{ color: colors.textMuted, fontSize: 13 }}>ไม่มีโพสต์ที่ถูกรายงาน</p>}
          {reports.map((r) => (
            <div key={r.id} style={{ ...cardBase, marginBottom: 12 }}>
              <div style={{ marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>โพสต์: </span>{r.post?.content?.substring(0, 100) || '-'}
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                ผู้รายงาน: {r.reporter_name || 'ผู้ใช้'} | เหตุผล: {r.reason || 'ไม่ระบุ'}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : ''}
              </div>
              {r.status === 'pending' ? (
                <button
                  onClick={() => setReviewModal({ open: true, postId: r.post?.id, reportId: r.id })}
                  style={{ ...btnPrimary, background: colors.accent, fontSize: 12, padding: '6px 14px' }}
                >
                  ตรวจสอบ
                </button>
              ) : (
                <span style={{ fontSize: 12, color: colors.success, fontWeight: 500 }}>ตรวจสอบแล้ว</span>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewModal.open && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>ตรวจสอบโพสต์ที่ถูกรายงาน</h3>
            <p style={{ margin: '0 0 18px', color: colors.textSecondary, fontSize: 13 }}>เลือกการดำเนินการสำหรับโพสต์นี้</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleReviewAction('delete')} style={{ ...btnPrimary, background: colors.danger, width: '100%', justifyContent: 'center', padding: '10px 0' }}>
                <TrashIcon size={14} color="#fff" /> ลบโพสต์
              </button>
              <button onClick={() => handleReviewAction('dismiss')} style={{ ...btnPrimary, background: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, width: '100%', justifyContent: 'center', padding: '10px 0' }}>
                ไม่พบปัญหา
              </button>
              <button onClick={() => setReviewModal({ open: false, postId: null, reportId: null })} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 13, padding: '8px 0' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm({ open: false })} />
    </div>
  );
}
