import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useHeaderHeight } from '@react-navigation/elements';
import api from '../services/api';
import { colors, radius } from '../theme';

const SUGGESTIONS = [
  { emoji: '🏋️', text: 'ฟิตเนสเปิดกี่โมง?' },
  { emoji: '📦', text: 'รับพัสดุที่ไหน?' },
  { emoji: '🏢', text: 'จองห้องประชุมยังไง?' },
  { emoji: '💰', text: 'ค่าส่วนกลางจ่ายยังไง?' },
  { emoji: '🔧', text: 'แจ้งซ่อมยังไง?' },
];

function SendIcon({ size = 20, color = '#FFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]));
    const a1 = animate(dot1, 0); const a2 = animate(dot2, 150); const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim) => ({
    width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginHorizontal: 2,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
  });

  return (
    <View style={s.typingRow}>
      <View style={s.botAvatarSmall}><Text style={s.botAvatarSmallText}>L</Text></View>
      <View style={s.typingBubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const id = dateStr.toString();
  // Extract timestamp from message id like "user-1234567890" or "bot-1234567890"
  const ts = parseInt(id.split('-').pop(), 10);
  if (isNaN(ts)) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/chatbot/history/');
        const history = res.data.results || res.data || [];
        const sorted = [...history].reverse();
        const msgs = [];
        sorted.forEach((h) => {
          const ts = new Date(h.created_at).getTime();
          msgs.push({ id: `user-${ts}`, text: h.user_message, isBot: false });
          msgs.push({ id: `bot-${ts + 1}`, text: h.bot_response, isBot: true, isEscalated: h.is_escalated });
        });
        setMessages(msgs);
      } catch {}
      setLoadingHistory(false);
    })();
  }, []);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    const now = Date.now();
    setMessages((prev) => [...prev, { id: `user-${now}`, text: msg, isBot: false }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/chatbot/message/', { message: msg });
      setMessages((prev) => [...prev, {
        id: `bot-${Date.now()}`,
        text: res.data.bot_response || res.data.response || 'ไม่มีคำตอบ',
        isBot: true, isEscalated: res.data.is_escalated || false,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        text: 'ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
        isBot: true, isError: true,
      }]);
    }
    setSending(false);
  };

  const renderMessage = ({ item }) => {
    const time = formatTime(item.id);
    return (
      <View style={[s.msgRow, item.isBot ? s.botRow : s.userRow]}>
        {item.isBot && (
          <View style={s.botAvatarSmall}><Text style={s.botAvatarSmallText}>L</Text></View>
        )}
        <View style={{ maxWidth: '75%' }}>
          <View style={[s.bubble, item.isBot ? s.botBubble : s.userBubble, item.isError && s.errorBubble]}>
            <Text style={[s.msgText, item.isBot ? s.botText : s.userText]}>{item.text}</Text>
            {item.isEscalated && (
              <View style={s.escalatedRow}>
                <Text style={s.escalatedText}>📋 ส่งต่อไปยังนิติบุคคลแล้ว</Text>
              </View>
            )}
          </View>
          {time ? <Text style={[s.timeText, item.isBot ? s.timeLeft : s.timeRight]}>{time}</Text> : null}
        </View>
      </View>
    );
  };

  if (loadingHistory) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight + (Platform.OS === 'ios' ? 0 : 0)}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            {/* Bot avatar */}
            <View style={s.emptyAvatarWrap}>
              <View style={s.emptyAvatar}><Text style={s.emptyAvatarText}>L</Text></View>
              <View style={s.onlineDot} />
            </View>
            <Text style={s.emptyTitle}>Liven Assistant</Text>
            <Text style={s.emptySubtitle}>ผู้ช่วยอัจฉริยะประจำชุมชน</Text>

            <View style={s.emptyCard}>
              <Text style={s.emptyCardTitle}>สวัสดีครับ! 👋</Text>
              <Text style={s.emptyCardText}>
                ผมช่วยตอบคำถามเกี่ยวกับชุมชนได้ครับ เช่น สิ่งอำนวยความสะดวก พัสดุ กิจกรรม หรือกฎระเบียบ
              </Text>
            </View>

            <Text style={s.suggestLabel}>ลองถามเรื่องเหล่านี้</Text>
            <View style={s.suggestionsWrap}>
              {SUGGESTIONS.map((q, i) => (
                <TouchableOpacity key={i} style={s.suggestionChip} onPress={() => handleSend(q.text)}
                  accessibilityLabel={q.text} accessibilityRole="button">
                  <Text style={s.suggestionEmoji}>{q.emoji}</Text>
                  <Text style={s.suggestionText}>{q.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />
      {sending && <TypingDots />}

      {/* Input bar */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input} placeholder="พิมพ์ข้อความ..." placeholderTextColor={colors.textMuted}
          value={input} onChangeText={setInput} onSubmitEditing={() => handleSend()}
          editable={!sending} multiline maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
          onPress={() => handleSend()} disabled={!input.trim() || sending}
          accessibilityLabel="ส่งข้อความ" accessibilityRole="button"
        >
          <SendIcon size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' },
  list: { padding: 16, paddingBottom: 8 },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end' },
  botRow: { justifyContent: 'flex-start', marginRight: 48 },
  userRow: { justifyContent: 'flex-end', marginLeft: 48 },
  botAvatarSmall: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 18,
  },
  botAvatarSmallText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  botBubble: {
    backgroundColor: '#FFF', borderBottomLeftRadius: 6,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  userBubble: { backgroundColor: '#0C2340', borderBottomRightRadius: 6 },
  errorBubble: { backgroundColor: colors.dangerLight },
  msgText: { fontSize: 15, lineHeight: 22 },
  botText: { color: '#1A202C' },
  userText: { color: '#FFF' },
  escalatedRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  escalatedText: { fontSize: 12, color: colors.warning, fontWeight: '500' },
  timeText: { fontSize: 10, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  timeLeft: { marginLeft: 4 },
  timeRight: { textAlign: 'right', marginRight: 4 },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, elevation: 1 },

  // Input
  inputRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#FFF', borderTopWidth: 0.5, borderTopColor: colors.border, alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#F0F2F5', borderRadius: 24,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, fontSize: 15,
    marginRight: 10, color: colors.text, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E0', elevation: 0, shadowOpacity: 0 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  emptyAvatarWrap: { position: 'relative', marginBottom: 12 },
  emptyAvatar: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyAvatarText: { color: '#FFF', fontSize: 26, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2, width: 14, height: 14,
    borderRadius: 7, backgroundColor: colors.success, borderWidth: 2.5, borderColor: '#F0F2F5',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 2 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  emptyCard: {
    backgroundColor: '#FFF', borderRadius: radius.lg, padding: 20, width: '100%',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    marginBottom: 24,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  emptyCardText: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  suggestLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionsWrap: { width: '100%' },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  suggestionEmoji: { fontSize: 18, marginRight: 10 },
  suggestionText: { fontSize: 14, color: colors.text, fontWeight: '500' },
});
