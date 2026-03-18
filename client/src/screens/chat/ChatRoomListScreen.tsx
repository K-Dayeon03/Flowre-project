import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ChatStackParamList } from '../../navigation/types';
import { useChatStore } from '../../store/useChatStore';
import { chatApi } from '../../api/chatApi';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatRoomList'>;

export default function ChatRoomListScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [creating, setCreating] = useState(false);

  const rooms = useChatStore((s) => s.rooms);
  const loading = useChatStore((s) => s.loading);
  const fetchRooms = useChatStore((s) => s.fetchRooms);

  useEffect(() => {
    fetchRooms();
  }, []);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const addRoom = useChatStore((s) => s.addMessage);

  const handleStartChat = async () => {
    const id = parseInt(targetId, 10);
    if (!targetId || isNaN(id)) {
      Alert.alert('알림', '직원 고유 번호를 숫자로 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      if (__DEV__) {
        // 개발 모드: 로컬 채팅방 생성
        const mockRoom = {
          id: Date.now(),
          name: `직원 #${id}`,
          type: 'DIRECT' as const,
          lastMessage: '',
          lastAt: '방금',
          unread: 0,
          members: 2,
        };
        useChatStore.setState((s) => ({ rooms: [mockRoom, ...s.rooms] }));
        setShowNewChat(false);
        setTargetId('');
        navigation.navigate('ChatRoom', {
          roomId: mockRoom.id,
          roomName: mockRoom.name,
          roomType: mockRoom.type,
        });
        return;
      }
      const room = await chatApi.createDirectRoom(id);
      setShowNewChat(false);
      setTargetId('');
      await fetchRooms();
      navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
      });
    } catch {
      Alert.alert('오류', '채팅방을 만들 수 없습니다. 직원 번호를 확인해주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 검색 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="채팅방 검색"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && rooms.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomItem}
              onPress={() => navigation.navigate('ChatRoom', {
                roomId: item.id,
                roomName: item.name,
                roomType: item.type,
              })}
              activeOpacity={0.7}
            >
              {/* 아바타 */}
              <View style={[styles.avatar, item.type === 'GROUP' && styles.avatarGroup]}>
                <Text style={styles.avatarText}>
                  {item.type === 'GROUP' ? '👥' : item.name[0]}
                </Text>
              </View>

              {/* 채팅방 정보 */}
              <View style={styles.roomInfo}>
                <View style={styles.roomTop}>
                  <Text style={styles.roomName}>{item.name}</Text>
                  {item.type === 'GROUP' && (
                    <Text style={styles.memberCount}>{item.members}</Text>
                  )}
                  <Text style={styles.roomTime}>{item.lastAt}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>

              {/* 뱃지 */}
              {item.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>채팅방이 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 새 채팅 FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNewChat(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      {/* 새 채팅 모달 */}
      <Modal visible={showNewChat} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 채팅 시작</Text>
            <Text style={styles.modalDesc}>직원 고유 번호를 입력하세요</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="직원 번호 (예: 1001)"
              placeholderTextColor={Colors.textMuted}
              value={targetId}
              onChangeText={setTargetId}
              keyboardType="number-pad"
              autoFocus
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNewChat(false); setTargetId(''); }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, creating && styles.modalConfirmBtnDisabled]}
                onPress={handleStartChat}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={Colors.surface} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>채팅하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarGroup: { backgroundColor: Colors.primary + '15' },
  avatarText: { fontSize: 20 },
  roomInfo: { flex: 1 },
  roomTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  roomName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  memberCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  roomTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  lastMessage: { fontSize: FontSize.sm, color: Colors.textSecondary },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: Spacing.sm,
  },
  unreadText: { color: Colors.surface, fontSize: FontSize.xs, fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 78 },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  modalDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: { opacity: 0.6 },
  modalConfirmText: { fontSize: FontSize.md, color: Colors.surface, fontWeight: '700' },
});
