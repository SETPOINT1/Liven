import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  Modal, ActivityIndicator, RefreshControl, Share, Keyboard, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { colors, radius } from '../theme';
import { PinIcon, AlertIcon, ChatbotIcon } from '../components/TabIcons';

function getRelativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// Mini SVG icons for actions
function HeartIcon({ filled, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#E53E3E' : 'none'}>
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={filled ? '#E53E3E' : colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CommentIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ShareIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke={colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const SocialFeedScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchPosts = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await api.get('/posts/');
      const data = res.data.results || res.data || [];
      data.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.post_type === 'alert' && b.post_type !== 'alert') return -1;
        if (a.post_type !== 'alert' && b.post_type === 'alert') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setPosts(data);
    } catch {
      setFetchError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    if (showComments) {
      const post = posts.find((p) => p.id === showComments);
      setComments(post?.comments || []);
    }
  }, [posts, showComments]);
  useEffect(() => {
    const channel = supabase.channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/posts/', { content: newContent, post_type: 'normal' });
      setNewContent(''); setShowCreate(false); fetchPosts();
    } catch (err) { Alert.alert('ข้อผิดพลาด', err.response?.data?.detail || 'ไม่สามารถสร้างโพสต์ได้'); }
    setSubmitting(false);
  };

  const handleLike = async (postId) => {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? (p.like_count || 1) - 1 : (p.like_count || 0) + 1 }
      : p));
    try { await api.post(`/posts/${postId}/like/`); } catch { fetchPosts(); }
  };

  const handleShare = async (postId) => {
    try {
      const res = await api.get(`/posts/${postId}/share-link/`);
      await Share.share({ message: res.data.share_url || res.data.url || `https://liven.app/posts/${postId}` });
    } catch { Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแชร์ได้'); }
  };

  const handleReport = async (postId) => {
    Alert.alert('รายงานโพสต์', 'คุณต้องการรายงานโพสต์นี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'รายงาน', style: 'destructive', onPress: async () => {
        try { await api.post(`/posts/${postId}/report/`, { reason: 'เนื้อหาไม่เหมาะสม' }); Alert.alert('สำเร็จ', 'รายงานโพสต์แล้ว'); }
        catch { Alert.alert('ข้อผิดพลาด', 'ไม่สามารถรายงานได้'); }
      }},
    ]);
  };

  const openComments = (postId) => {
    setShowComments(postId); setCommentsLoading(true);
    const post = posts.find((p) => p.id === postId);
    setComments(post?.comments || []); setCommentsLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !showComments) return;
    try {
      await api.post(`/posts/${showComments}/comments/`, { content: newComment });
      setNewComment(''); await fetchPosts();
    } catch { Alert.alert('ข้อผิดพลาด', 'ไม่สามารถคอมเมนต์ได้'); }
  };

  const avatarColors = ['#2B6CB0', '#38A169', '#D69E2E', '#805AD5', '#E53E3E', '#DD6B20', '#0C2340'];
  const getAvatarColor = (name) => avatarColors[((name || '').charCodeAt(0) || 0) % avatarColors.length];

  const renderPost = ({ item }) => {
    const initial = (item.author_name || 'ผ')[0].toUpperCase();
    const relTime = getRelativeTime(item.created_at);
    const avColor = getAvatarColor(item.author_name);

    return (
      <View style={st.card}>
        {(item.is_pinned || item.post_type === 'alert') && (
          <View style={st.pinnedBar}><View style={st.pinnedRow}><PinIcon size={14} color="#92400E" /><Text style={st.pinnedText}> ปักหมุดโดยนิติบุคคล</Text></View></View>
        )}
        {/* Author row */}
        <View style={st.authorRow}>
          <View style={[st.avatar, { backgroundColor: avColor + '20' }]}>
            <Text style={[st.avatarText, { color: avColor }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.authorName}>{item.author_name || 'ผู้ใช้'}</Text>
            <Text style={st.timeText}>{relTime}</Text>
          </View>
          <TouchableOpacity onPress={() => handleReport(item.id)} style={st.moreBtn}
            accessibilityLabel="รายงานโพสต์" accessibilityRole="button">
            <Text style={st.moreDots}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={st.content}>{item.content}</Text>

        {/* Stats row */}
        {(item.like_count > 0 || item.comment_count > 0) && (
          <View style={st.statsRow}>
            {item.like_count > 0 && <Text style={st.statsText}>{item.is_liked ? '♥' : '♥'} {item.like_count}</Text>}
            {item.comment_count > 0 && (
              <Text style={st.statsText}>{item.comment_count} ความคิดเห็น</Text>
            )}
          </View>
        )}

        {/* Action bar */}
        <View style={st.actionBar}>
          <TouchableOpacity style={st.actionBtn} onPress={() => handleLike(item.id)}
            accessibilityLabel={item.is_liked ? 'เลิกถูกใจ' : 'ถูกใจ'} accessibilityRole="button">
            <HeartIcon filled={item.is_liked} />
            <Text style={[st.actionLabel, item.is_liked && { color: '#E53E3E' }]}>ถูกใจ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => openComments(item.id)}
            accessibilityLabel="ความคิดเห็น" accessibilityRole="button">
            <CommentIcon />
            <Text style={st.actionLabel}>คอมเมนต์</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => handleShare(item.id)}
            accessibilityLabel="แชร์" accessibilityRole="button">
            <ShareIcon />
            <Text style={st.actionLabel}>แชร์</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color={colors.accent} /></View>;

  return (
    <View style={st.container}>
      {/* Create post prompt */}
      <TouchableOpacity style={st.createPrompt} onPress={() => setShowCreate(true)} activeOpacity={0.7}>
        <View style={st.createAvatar}><Text style={st.createAvatarText}>คุณ</Text></View>
        <Text style={st.createPlaceholder}>คุณกำลังคิดอะไรอยู่?</Text>
      </TouchableOpacity>

      <FlatList
        data={posts} keyExtractor={(item) => item.id} renderItem={renderPost}
        contentContainerStyle={st.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} />}
        ListEmptyComponent={
          fetchError ? (
            <View style={st.emptyContainer}>
              <AlertIcon size={32} color={colors.textMuted} />
              <Text style={st.emptyTitle}>ไม่สามารถโหลดโพสต์ได้</Text>
              <TouchableOpacity style={st.retryBtn} onPress={() => { setRefreshing(true); fetchPosts(); }}>
                <Text style={st.retryBtnText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={st.emptyContainer}>
              <ChatbotIcon size={32} color={colors.textMuted} />
              <Text style={st.emptyTitle}>ยังไม่มีโพสต์</Text>
              <Text style={st.emptyDesc}>เริ่มสร้างโพสต์แรกเพื่อพูดคุยกับเพื่อนบ้าน</Text>
            </View>
          )
        }
      />

      {/* Create Post Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowCreate(false); }}>
            <View style={st.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={st.modalContent}>
                  <View style={st.modalHandle} />
                  <Text style={st.modalTitle}>สร้างโพสต์ใหม่</Text>
                  <TextInput style={st.modalInput} placeholder="เขียนอะไรสักอย่าง..."
                    placeholderTextColor={colors.textMuted} value={newContent}
                    onChangeText={setNewContent} multiline autoFocus />
                  <View style={st.modalActions}>
                    <TouchableOpacity style={st.cancelBtn} onPress={() => { Keyboard.dismiss(); setShowCreate(false); }}>
                      <Text style={st.cancelBtnText}>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.postBtn, !newContent.trim() && { opacity: 0.5 }]}
                      onPress={handleCreatePost} disabled={submitting || !newContent.trim()}>
                      {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={st.postBtnText}>โพสต์</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showComments !== null} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowComments(null); }}>
            <View style={st.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={[st.modalContent, { maxHeight: '75%' }]}>
                  <View style={st.modalHandle} />
                  <Text style={st.modalTitle}>ความคิดเห็น</Text>
                  {commentsLoading ? <ActivityIndicator color={colors.accent} /> : (
                    <FlatList data={comments} keyExtractor={(item) => item.id}
                      renderItem={({ item }) => {
                        const ci = (item.author_name || 'ผ')[0].toUpperCase();
                        const cc = getAvatarColor(item.author_name);
                        return (
                          <View style={st.commentItem}>
                            <View style={[st.commentAvatar, { backgroundColor: cc + '20' }]}>
                              <Text style={[st.commentAvatarText, { color: cc }]}>{ci}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={st.commentAuthor}>{item.author_name || 'ผู้ใช้'}</Text>
                              <Text style={st.commentContent}>{item.content}</Text>
                            </View>
                          </View>
                        );
                      }}
                      ListEmptyComponent={<Text style={st.emptyComment}>ยังไม่มีความคิดเห็น</Text>}
                      style={{ maxHeight: 300 }}
                    />
                  )}
                  <View style={st.commentInputRow}>
                    <TextInput style={st.commentInput} placeholder="เขียนความคิดเห็น..."
                      placeholderTextColor={colors.textMuted} value={newComment} onChangeText={setNewComment} />
                    <TouchableOpacity style={[st.commentSendBtn, !newComment.trim() && { opacity: 0.4 }]}
                      onPress={handleAddComment} disabled={!newComment.trim()}>
                      <Text style={st.commentSendText}>ส่ง</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 },

  // Create prompt
  createPrompt: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  createAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  createAvatarText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  createPlaceholder: { fontSize: 15, color: colors.textMuted },

  // Post card
  card: {
    backgroundColor: '#FFF', marginBottom: 8,
    borderTopWidth: 0.5, borderTopColor: '#E8E8E8',
  },
  pinnedBar: { backgroundColor: colors.warningLight, paddingHorizontal: 16, paddingVertical: 6 },
  pinnedRow: { flexDirection: 'row', alignItems: 'center' },
  pinnedText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: '700' },
  authorName: { fontSize: 14, fontWeight: '700', color: colors.text },
  timeText: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  moreBtn: { padding: 8 },
  moreDots: { fontSize: 16, color: colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  content: { fontSize: 15, color: colors.text, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 12 },

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
    paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  statsText: { fontSize: 12, color: colors.textMuted },

  // Actions
  actionBar: { flexDirection: 'row', paddingVertical: 6 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  actionLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginLeft: 6 },

  // Empty
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalInput: { minHeight: 100, textAlignVertical: 'top', fontSize: 15, color: colors.text, backgroundColor: '#F7F8FA', borderRadius: 12, padding: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  postBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  postBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Comments
  commentItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentAvatarText: { fontSize: 13, fontWeight: '700' },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: colors.text },
  commentContent: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  emptyComment: { textAlign: 'center', color: colors.textMuted, marginVertical: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  commentInput: { flex: 1, backgroundColor: '#F7F8FA', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, marginRight: 8, color: colors.text },
  commentSendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  commentSendText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});

export default SocialFeedScreen;
