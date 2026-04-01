import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../services/api';
import { colors, radius } from '../theme';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/chatbot/history/');
        const history = res.data.results || res.data || [];
        const msgs = [];
        history.forEach((h) => {
          msgs.push({ id: `${h.id}-user`, text: h.user_message, isBot: false, isEscalated: false });
          msgs.push({ id: `${h.id}-bot`, text: h.bot_response, isBot: true, isEscalated: h.is_escalated });
        });
        setMessages(msgs);
      } catch {
        // silent
      }
      setLoadingHistory(false);
    };
    fetchHistory();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: `user-${Date.now()}`, text, isBot: false, isEscalated: false };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/chatbot/message/', { message: text });
      const botMsg = {
        id: `bot-${Date.now()}`,
        text: res.data.response || res.data.bot_response || 'ไม่มีคำตอบ',
        isBot: true,
        isEscalated: res.data.is_escalated || false,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg = {
        id: `err-${Date.now()}`,
        text: 'ขออภัย ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
        isBot: true,
        isEscalated: false,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setSending(false);
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.msgRow, item.isBot ? styles.botRow : styles.userRow]}>
      <View style={[styles.bubble, item.isBot ? styles.botBubble : styles.userBubble, item.isError && styles.errorBubble]}>
        <Text style={[styles.msgText, item.isBot ? styles.botText : styles.userText]}>{item.text}</Text>
        {item.isEscalated ? (
          <Text style={styles.escalatedText}>📋 คำถามนี้ถูกส่งต่อไปยังนิติบุคคลแล้ว</Text>
        ) : null}
      </View>
    </View>
  );

  if (loadingHistory) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={styles.emptyText}>สวัสดีครับ! ถามอะไรก็ได้เลย</Text>
          </View>
        }
      />

      {sending ? (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.typingText}>กำลังพิมพ์...</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ข้อความ..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!sending}
        />
        <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendBtnText}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 10 },
  botRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  errorBubble: { backgroundColor: colors.dangerLight },
  msgText: { fontSize: 15, lineHeight: 22 },
  botText: { color: colors.text },
  userText: { color: '#FFF' },
  escalatedText: { fontSize: 12, color: colors.warning, marginTop: 6, fontStyle: 'italic' },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginRight: 8 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFF', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
});

export default ChatbotScreen;



