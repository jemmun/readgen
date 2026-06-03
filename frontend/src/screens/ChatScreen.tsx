import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { messagesApi, Message } from '../api/messages';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type Props = StackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route }: Props) {
  const { userId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const res = await messagesApi.getWithUser(userId);
      setMessages(res.data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await messagesApi.send(userId, newMsg.trim());
      setNewMsg('');
      const res = await messagesApi.getWithUser(userId);
      setMessages(res.data);
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMine = item.sender_id !== userId;
          return (
            <View style={[styles.messageBubble, isMine ? styles.mine : styles.theirs]}>
              <Text style={[styles.messageText, isMine && styles.mineText]}>{item.content}</Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={newMsg}
          onChangeText={setNewMsg}
          placeholder="Type a message..."
          mode="outlined"
          style={styles.input}
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!newMsg.trim() || sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: XColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: XSpacing.md, paddingBottom: 8 },
  messageBubble: {
    maxWidth: '75%', padding: XSpacing.md, borderRadius: XBorderRadius.lg, marginBottom: 8,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: XColors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: XColors.surface },
  messageText: { ...XTypography.bodyMedium, color: XColors.textPrimary },
  mineText: { color: '#ffffff' },
  timeText: { ...XTypography.bodySmall, color: XColors.textSecondary, marginTop: 4, fontSize: 10 },
  inputRow: { flexDirection: 'row', padding: XSpacing.md, borderTopWidth: 1, borderTopColor: XColors.border, alignItems: 'center' },
  input: { flex: 1, marginRight: XSpacing.sm, backgroundColor: XColors.background },
  sendBtn: { backgroundColor: XColors.primary, paddingHorizontal: XSpacing.lg, paddingVertical: XSpacing.sm, borderRadius: XBorderRadius.full },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#ffffff', fontWeight: '700' },
});
