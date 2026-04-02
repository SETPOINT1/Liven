import { useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';
import { C, R, card, pageTitle, btn, tab, inp, lbl, overlay, modal, pageHeader, tabBadge, emptyState, toastStyle } from '../theme';
import { PlusIcon, TrashIcon, HeartIcon, ChatIcon, MegaphoneIcon, AlertIcon, CloseIcon, CheckIcon } from '../components/Icons';

const typeBadge = {
  announcement: { label: 'ประกาศ',  icon: MegaphoneIcon, bg: '#eff6ff', color: C.info },
  alert:        { label: 'แจ้งเตือน', icon: AlertIcon,     bg: '#fef2f2', color: C.err },
  normal:       { label: 'ทั่วไป',   icon: ChatIcon,      bg: '#f0fdf4', color: C.ok },
};

const roleBadge = {
  juristic:  { label: 'นิติบุคคล', bg: '#eff6ff', color: C.info },
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
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [postForm, setPostForm] = useState({ content: '', post_type: 'announcement', image: null });
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [reviewModal, setReviewModal] = useState({ open: false, postId: null, reportId: null });
  const [reviewResult, setReviewResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  useEffect(() => {
    (async () => {
      await fetchPosts();
      setLoading(false);
    })();
  }, []);
  useEffect(() => { if (activeTab === 'reports') fetchReports(); }, [activeTab]);

  async function fetchPosts() {
    try { const { data } = await api.get('/posts/'); setPosts(data); } catch { showToast('ไม่สามารถโหลดโพสต์ได้', 'error'); }
  }
  async function fetchReports() {
    try {
      const { data } = await api.get('/posts/');
      const all = [];
      for (const post of data) {
        if (post.reports?.length > 0) post.reports.forEach((r) => all.push({ ...r, post }));
      }
      setReports(all);
    } catch { showToast('ไม่สามารถโหลดรายงานได้', 'error'); }
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
      await api.post('/posts/', { content: postForm.content, post_type: postForm.post_type, image_url: imageUrl });
      setPostForm({ content: '', post_type: 'announcement', image: null });
      setShowForm(false);
      fetchPosts();
      showToast('สร้างโพสต์สำเร็จ');
    } catch { showToast('ไม่สามารถสร้างโพสต์ได้', 'error'); }
  }

  async function handleReviewAction(action) {
    const { postId, reportId } = reviewModal;
    if (action === 'delete') {
      try { await api.delete(`/posts/${postId}/`); setReviewResult('ตรวจสอบแล้ว — ลบโพสต์แล้ว'); }
      catch { setReviewResult('ไม่สามารถลบโพสต์ได้'); }
    } else {
      setReviewResult('ตรวจสอบแล้ว — ไม่พบปัญหา');
    }
    try { await api.patch(`/posts/${postId}/report/${reportId}/`, { status: 'reviewed' }); } catch {}
    setReviewModal({ open: false, postId: null, reportId: null });
    fetchReports(); fetchPosts();
    setTimeout(() => setReviewResult(null), 3000);
  }

  async function handleDeletePost(postId) {
    setConfirm({
      open: true, title: 'ลบโพสต์', message: 'ต้องการลบโพสต์นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      action: async () => { try { await api.delete(`/posts/${postId}/`); fetchPosts(); showToast('ลบโพสต์สำเร็จ'); } catch { showToast('ไม่สามารถลบโพสต์ได้', 'error'); } setConfirm({ open: false }); },
    });
  }

  async function handleDeleteComment(postId, commentId) {
    setConfirm({
      open: true, title: 'ลบความคิดเห็น', message: 'ต้องการลบความคิดเห็นนี้ใช่หรือไม่?',
      action: async () => { try { await api.delete(`/posts/${postId}/comments/${commentId}/`); fetchPosts(); showToast('ลบความคิดเห็นสำเร็จ'); } catch { showToast('ไม่สามารถลบความคิดเห็นได้', 'error'); } setConfirm({ open: false }); },
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  const pendingReports = reports.filter(r => r.status === 'pending').length;

  return (
    <div>
      {/* Page Header */}
      <div style={pageHeader(C.info)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: R.md, background: C.info + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChatIcon s={22} c={C.info} />
            </div>
            <div>
              <h1 style={pageTitle}>Social Feed</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>จัดการโพสต์ ตรวจสอบรายงาน และดูแลเนื้อหาชุมชน</p>
            </div>
          </div>
          {activeTab === 'feed' && (
            <button style={btn} onClick={() => setShowForm(!showForm)} aria-label={showForm ? 'ยกเลิก' : 'สร้างโพสต์'}>
              {showForm ? 'ยกเลิก' : <><PlusIcon s={14} c="#fff" /> สร้างโพสต์</>}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center' }}>
        <button style={tab(activeTab === 'feed')} onClick={() => setActiveTab('feed')}>
          Feed
          <span style={tabBadge(posts.length, activeTab === 'feed')}>{posts.length}</span>
        </button>
        <button style={tab(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>
          โพสต์ที่ถูกรายงาน
          {pendingReports > 0 && <span style={{ ...tabBadge(pendingReports, activeTab === 'reports'), background: activeTab === 'reports' ? C.err : '#fee2e2', color: activeTab === 'reports' ? '#fff' : C.err }}>{pendingReports}</span>}
        </button>
      </div>

      {toast && (
        <div style={toastStyle(toast.type)}>{toast.msg}</div>
      )}

      {/* Create Post Form */}
      {showForm && activeTab === 'feed' && (
        <div style={{ ...card, marginBottom: 18, borderTop: `3px solid ${C.info}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: R.md, background: C.info + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChatIcon s={18} c={C.info} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>สร้างโพสต์ใหม่</h3>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>โพสต์จะแสดงใน feed ของลูกบ้านทุกคน</p>
            </div>
          </div>
          <form onSubmit={handleCreatePost}>
            <label style={lbl}>ประเภท</label>
            <select style={inp} value={postForm.post_type} onChange={(e) => setPostForm({ ...postForm, post_type: e.target.value })}>
              <option value="announcement">ประกาศ</option>
              <option value="alert">แจ้งเตือน</option>
            </select>
            <label style={lbl}>เนื้อหา *</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} required placeholder="เขียนเนื้อหาโพสต์..." />
            <label style={lbl}>รูปภาพ</label>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${postForm.image ? C.ok : C.border}`, borderRadius: R.md,
              padding: '16px 20px', marginBottom: 16, background: postForm.image ? '#f0fdf4' : C.bg,
              cursor: 'pointer', transition: 'border-color 0.2s',
            }}>
              <input type="file" accept="image/*" onChange={(e) => setPostForm({ ...postForm, image: e.target.files[0] })} style={{ display: 'none' }} />
              {postForm.image ? (
                <div style={{ fontSize: 13, color: C.ok, fontWeight: 500 }}>{postForm.image.name}</div>
              ) : (
                <div style={{ fontSize: 12, color: C.muted }}>คลิกเพื่อเลือกรูปภาพ (ไม่บังคับ)</div>
              )}
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button style={{ ...btn, background: C.info }} type="submit"><PlusIcon s={14} c="#fff" /> โพสต์</button>
            </div>
          </form>
        </div>
      )}

      {/* Feed Empty */}
      {activeTab === 'feed' && posts.length === 0 && !showForm && (
        <div style={emptyState}>
          <ChatIcon s={48} c={C.borderLight} />
          <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>ยังไม่มีโพสต์</div>
          <div style={{ fontSize: 13, color: C.muted }}>กดปุ่ม "สร้างโพสต์" เพื่อเริ่มต้น</div>
          <button style={{ ...btn, marginTop: 8 }} onClick={() => setShowForm(true)}>
            <PlusIcon s={14} c="#fff" /> สร้างโพสต์
          </button>
        </div>
      )}

      {/* Feed Posts */}
      {activeTab === 'feed' && posts.map((post) => {
        const isAuthorJuristic = post.author_role === 'juristic';
        const borderColor = isAuthorJuristic && post.post_type === 'alert' ? C.err
          : isAuthorJuristic ? '#7c3aed' : C.info;
        const tb = typeBadge[post.post_type] || typeBadge.normal;
        const rb = roleBadge[post.author_role] || roleBadge.resident;
        const TypeIcon = tb.icon;

        return (
          <div key={post.id} style={{ ...card, marginBottom: 14, borderLeft: `4px solid ${borderColor}`, transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: rb.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: rb.color, flexShrink: 0,
                }}>
                  {(post.author_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: C.text }}>
                    {post.author_name || 'ผู้ใช้'}
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: rb.bg, color: rb.color }}>{rb.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{timeAgo(post.created_at)}</div>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: tb.bg, color: tb.color }}>
                <TypeIcon s={12} c={tb.color} /> {tb.label}
              </span>
            </div>

            <p style={{ margin: '8px 0', lineHeight: 1.7, fontSize: 14, color: C.text }}>{post.content}</p>
            {post.image_url && <img src={post.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: R.md, marginTop: 8 }} />}

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.borderLight}`, fontSize: 12, color: C.muted, display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <HeartIcon s={14} c={post.is_liked ? C.err : C.muted} filled={post.is_liked} /> {post.like_count || 0}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ChatIcon s={14} c={C.muted} /> {post.comment_count || 0}
              </span>
              {isJuristic && (
                <button onClick={() => handleDeletePost(post.id)} style={{
                  marginLeft: 'auto', padding: '4px 12px', border: `1px solid ${C.err}33`, borderRadius: R.sm,
                  background: '#fef2f2', color: C.err, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'background 0.15s',
                }} aria-label="ลบโพสต์">
                  <TrashIcon s={12} c={C.err} /> ลบ
                </button>
              )}
            </div>

            {post.comments?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderLight}` }}>
                {post.comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: C.text }}>{c.author_name}</span>
                      <span style={{ color: C.sub, marginLeft: 8 }}>{c.content}</span>
                      <span style={{ color: C.muted, marginLeft: 8, fontSize: 10 }}>{timeAgo(c.created_at)}</span>
                    </div>
                    {isJuristic && (
                      <button onClick={() => handleDeleteComment(post.id, c.id)} style={{ padding: '2px 4px', border: 'none', background: 'none', color: C.err, cursor: 'pointer', minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="ลบความคิดเห็น">
                        <CloseIcon s={13} c={C.err} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {reviewResult && (
            <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: R.sm, background: '#f0fdf4', border: `1px solid ${C.ok}33`, color: '#166534', fontSize: 13 }}>
              {reviewResult}
            </div>
          )}
          {reports.length === 0 && (
            <div style={emptyState}>
              <AlertIcon s={48} c={C.borderLight} />
              <div style={{ fontSize: 15, color: C.sub, fontWeight: 500 }}>ไม่มีโพสต์ที่ถูกรายงาน</div>
              <div style={{ fontSize: 13, color: C.muted }}>ยังไม่มีรายงานจากลูกบ้าน</div>
            </div>
          )}
          {reports.map((r) => (
            <div key={r.id} style={{ ...card, marginBottom: 12, borderLeft: `4px solid ${r.status === 'pending' ? C.warn : C.ok}` }}>
              <div style={{ marginBottom: 6, fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 600 }}>โพสต์: </span>{r.post?.content?.substring(0, 100) || '-'}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 4 }}>
                ผู้รายงาน: {r.reporter_name || 'ผู้ใช้'} | เหตุผล: {r.reason || 'ไม่ระบุ'}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : ''}
              </div>
              {r.status === 'pending' ? (
                <button
                  onClick={() => setReviewModal({ open: true, postId: r.post?.id, reportId: r.id })}
                  style={{ ...btn, background: C.accent, fontSize: 12, padding: '6px 14px' }}
                  aria-label="ตรวจสอบรายงาน"
                >
                  ตรวจสอบ
                </button>
              ) : (
                <span style={{ fontSize: 12, color: C.ok, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckIcon s={12} c={C.ok} /> ตรวจสอบแล้ว
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && (
        <div style={overlay}>
          <div style={{ ...modal, width: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: C.text }}>ตรวจสอบโพสต์ที่ถูกรายงาน</h3>
            <p style={{ margin: '0 0 18px', color: C.sub, fontSize: 13 }}>เลือกการดำเนินการสำหรับโพสต์นี้</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleReviewAction('delete')} style={{ ...btn, background: C.err, width: '100%', justifyContent: 'center', padding: '10px 0' }} aria-label="ลบโพสต์">
                <TrashIcon s={14} c="#fff" /> ลบโพสต์
              </button>
              <button onClick={() => handleReviewAction('dismiss')} style={{ ...btn, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, width: '100%', justifyContent: 'center', padding: '10px 0' }}>
                ไม่พบปัญหา
              </button>
              <button onClick={() => setReviewModal({ open: false, postId: null, reportId: null })} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '8px 0' }}>
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
