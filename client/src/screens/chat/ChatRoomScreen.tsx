import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ChatStackParamList } from '../../navigation/types';
import { useStompChat } from '../../hooks/useStompChat';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Message } from '../../api/chatApi';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

const MY_ID = 1;


/** 날짜 구분선 */
function DateSeparator({ date }: { date: string }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{date}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

export default function ChatRoomScreen({ route }: Props) {
  const { roomId, roomType } = route.params;
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages[roomId] ?? []);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const { sendMessage, connected } = useStompChat(roomId);

  useEffect(() => {
    fetchMessages(roomId);
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text, 'TEXT');
    setInput('');
  };

  const handleAttach = () => {
    // TODO: ImagePicker 또는 DocumentPicker → S3 업로드 후 FILE 메시지 전송
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={<DateSeparator date="2025년 3월 11일" />}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.isMe && styles.messageRowMe]}>
              {/* 상대방 아바타 (그룹 채팅에서만 표시) */}
              {!item.isMe && roomType === 'GROUP' && (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.senderName[0]}</Text>
                </View>
              )}

              <View style={[styles.messageGroup, item.isMe && styles.messageGroupMe]}>
                {/* 발신자 이름 (그룹 채팅, 상대방만) */}
                {!item.isMe && roomType === 'GROUP' && (
                  <Text style={styles.senderName}>{item.senderName}</Text>
                )}

                <View style={styles.bubbleRow}>
                  {item.isMe && <Text style={styles.timeText}>{item.sentAt}</Text>}
                  <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, item.isMe && styles.bubbleTextMe]}>
                      {item.content}
                    </Text>
                  </View>
                  {!item.isMe && <Text style={styles.timeText}>{item.sentAt}</Text>}
                </View>
              </View>
            </View>
          )}
        />

        {/* 입력 바 */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendIcon}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.sm },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  messageRowMe: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    alignSelf: 'flex-start',
  },
  avatarText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  messageGroup: { maxWidth: '75%' },
  messageGroupMe: { alignItems: 'flex-end' },
  senderName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 3,
    marginLeft: 2,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    maxWidth: '100%',
  },
  bubbleThem: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: Colors.surface },
  timeText: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: { fontSize: 22 },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },
  sendIcon: { color: Colors.surface, fontSize: 14 },
});
