import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  Modal, ActivityIndicator, RefreshControl, Share, Keyboard, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';

import { colors, radius } from '../theme';

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

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/posts/');
      const data = res.data.results || res.data || [];
      // Sort: pinned/alert first, then by date
      data.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.post_type === 'alert' && b.post_type !== 'alert') return -1;
        if (a.post_type !== 'alert' && b.post_type === 'alert') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setPosts(data);
    } catch {
      // silent
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Update comments when posts change and comment modal is open
  useEffect(() => {
    if (showComments) {
      const post = posts.find((p) => p.id === showComments);
      setComments(post?.comments || []);
    }
  }, [posts, showComments]);

  // Supabase Realtime for new posts
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/posts/', { content: newContent, post_type: 'normal' });
      setNewContent('');
      setShowCreate(false);
      fetchPosts();
    } catch (err) {
      Alert.alert('ข้อผิดพลาด', err.response?.data?.detail || 'ไม่สามารถสร้างโพสต์ได้');
    }
    setSubmitting(false);
  };

  const handleLike = async (postId) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !p.is_liked,
              like_count: p.is_liked ? (p.like_count || 1) - 1 : (p.like_count || 0) + 1,
            }
          : p
      )
    );
    try {
      await api.post(`/posts/${postId}/like/`);
    } catch {
      // Revert on error
      fetchPosts();
    }
  };

  const handleShare = async (postId) => {
    try {
      const res = await api.get(`/posts/${postId}/share-link/`);
      const link = res.data.share_url || res.data.url || `https://liven.app/posts/${postId}`;
      await Share.share({ message: link });
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแชร์ได้');
    }
  };

  const handleReport = async (postId) => {
    Alert.alert('รายงานโพสต์', 'คุณต้องการรายงานโพสต์นี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'รายงาน',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/posts/${postId}/report/`, { reason: 'เนื้อหาไม่เหมาะสม' });
            Alert.alert('สำเร็จ', 'รายงานโพสต์แล้ว');
          } catch {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถรายงานได้');
          }
        },
      },
    ]);
  };

  const openComments = async (postId) => {
    setShowComments(postId);
    setCommentsLoading(true);
    // Get comments from post data (already included in PostSerializer)
    const post = posts.find((p) => p.id === postId);
    setComments(post?.comments || []);
    setCommentsLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !showComments) return;
    try {
      await api.post(`/posts/${showComments}/comments/`, { content: newComment });
      setNewComment('');
      // Refresh posts to get updated comments
      await fetchPosts();
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถคอมเมนต์ได้');
    }
  };

  const renderPost = ({ item }) => (
    <View style={[styles.card, item.is_pinned && styles.pinnedCard]}>
      {item.is_pinned || item.post_type === 'alert' ? (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>📌 ปักหมุด</Text>
        </View>
      ) : null}
      <Text style={styles.author}>{item.author_name || 'ผู้ใช้'}</Text>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('th-TH')}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
          <Text style={styles.actionText}>{item.is_liked ? '❤️' : '🤍'} {item.like_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item.id)}>
          <Text style={styles.actionText}>💬 {item.comment_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item.id)}>
          <Text style={styles.actionText}>🔗 แชร์</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleReport(item.id)}>
          <Text style={styles.actionText}>⚠️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
        <Text style={styles.createBtnText}>+ สร้างโพสต์</Text>
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีโพสต์</Text>}
      />

      {/* Create Post Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowCreate(false); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>สร้างโพสต์ใหม่</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="เขียนอะไรสักอย่าง..."
                    placeholderTextColor="#9CA3AF"
                    value={newContent}
                    onChangeText={setNewContent}
                    multiline
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { Keyboard.dismiss(); setShowCreate(false); }}>
                      <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePost} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>โพสต์</Text>}
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
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowComments(null); setComments([]); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                  <Text style={styles.modalTitle}>ความคิดเห็น</Text>
                  {commentsLoading ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <FlatList
                      data={comments}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                          <Text style={styles.commentAuthor}>{item.author_name || 'ผู้ใช้'}</Text>
                          <Text style={styles.commentContent}>{item.content}</Text>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีความคิดเห็น</Text>}
                      style={{ maxHeight: 300 }}
                    />
                  )}
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                      placeholder="เขียนความคิดเห็น..."
                      placeholderTextColor="#9CA3AF"
                      value={newComment}
                      onChangeText={setNewComment}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                      <Text style={styles.sendBtnText}>ส่ง</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => { Keyboard.dismiss(); setShowComments(null); setComments([]); }}>
                    <Text style={styles.cancelBtnText}>ปิด</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 0 },
  createBtn: { backgroundColor: colors.primary, margin: 16, marginBottom: 8, borderRadius: 8, padding: 12, alignItems: 'center' },
  createBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  pinnedCard: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  pinnedBadge: { marginBottom: 6 },
  pinnedText: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  author: { fontSize: 14, fontWeight: '700', color: colors.primary },
  content: { fontSize: 15, color: colors.text, marginTop: 6 },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 8 },
  actionBtn: { marginRight: 16 },
  actionText: { fontSize: 13, color: colors.textSecondary },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 12, alignItems: 'center', marginLeft: 8, borderRadius: 8, backgroundColor: colors.primary },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '600' },
  commentItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: colors.primary },
  commentContent: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtnText: { color: '#FFFFFF', fontWeight: '600' },
});

export default SocialFeedScreen;



