import React, { useState, useCallback } from 'react';
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
import SearchBar from '../../components/SearchBar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import { useChatStore } from '../../store/useChatStore';
import { chatApi, StoreMember } from '../../api/chatApi';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChatRoomList'>;

export default function ChatRoomListScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatMode, setChatMode] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const rooms = useChatStore((s) => s.rooms);
  const loading = useChatStore((s) => s.loading);
  const fetchRooms = useChatStore((s) => s.fetchRooms);

  // 화면이 포커스될 때마다(최초 진입 + 채팅방에서 목록으로 복귀 시) 목록을 재조회한다.
  // 채팅방에서 읽음 처리한 뒤 돌아왔을 때 안읽음 뱃지 등 최신 상태를 반영하기 위함이다.
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const openNewChat = async () => {
    setShowNewChat(true);
    setSelectedIds([]);
    setRoomName('');
    setLoadingMembers(true);
    try {
      setMembers(await chatApi.getStoreMembers());
    } catch {
      Alert.alert('오류', '직원 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleStartChat = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('알림', '대화할 직원을 선택해주세요.');
      return;
    }
    if (chatMode === 'GROUP' && !roomName.trim()) {
      Alert.alert('알림', '그룹 채팅방 이름을 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      const room = chatMode === 'DIRECT'
        ? await chatApi.createDirectRoom(selectedIds[0])
        : await chatApi.createRoom({ name: roomName.trim(), memberUserIds: selectedIds });
      setShowNewChat(false);
      setSelectedIds([]);
      setRoomName('');
      await fetchRooms();
      navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
      });
    } catch {
      Alert.alert('오류', '채팅방을 만들 수 없습니다. 권한을 확인해주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.controlPanel}>
        <View style={styles.screenHead}>
          <View>
            <Text style={styles.screenKicker}>CHAT</Text>
            <Text style={styles.screenTitle}>대화 목록</Text>
          </View>
          <Text style={styles.screenCount}>{filtered.length}개</Text>
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="채팅방 검색"
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
          contentContainerStyle={styles.list}
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
                  {item.name[0]}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>채팅방이 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 새 채팅 FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNewChat} activeOpacity={0.85}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      {/* 새 채팅 모달 */}
      <Modal visible={showNewChat} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 채팅 시작</Text>
            <Text style={styles.modalDesc}>1:1 또는 여러 명이 참여하는 채팅방을 만들 수 있습니다.</Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeButton, chatMode === 'DIRECT' && styles.modeButtonActive]}
                onPress={() => setChatMode('DIRECT')}
              >
                <Text style={[styles.modeText, chatMode === 'DIRECT' && styles.modeTextActive]}>1:1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, chatMode === 'GROUP' && styles.modeButtonActive]}
                onPress={() => setChatMode('GROUP')}
              >
                <Text style={[styles.modeText, chatMode === 'GROUP' && styles.modeTextActive]}>그룹</Text>
              </TouchableOpacity>
            </View>

            {chatMode === 'GROUP' && (
              <TextInput
                style={styles.modalInput}
                placeholder="채팅방 이름"
                placeholderTextColor={Colors.textMuted}
                value={roomName}
                onChangeText={setRoomName}
              />
            )}

            {loadingMembers ? (
              <ActivityIndicator color={Colors.accent} style={{ paddingVertical: Spacing.md }} />
            ) : members.length === 0 ? (
              <Text style={styles.memberEmpty}>같은 매장 직원이 없습니다.</Text>
            ) : (
              <View style={styles.memberList}>
                {members.map((m) => {
                  const selected = selectedIds.includes(m.id);
                  const disabled = chatMode === 'DIRECT' && selectedIds.length > 0 && !selected;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberItem, selected && styles.memberItemSelected, disabled && styles.memberItemDisabled]}
                      onPress={() => !disabled && toggleMember(m.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, selected && styles.memberNameSelected]}>{m.name}</Text>
                        <Text style={styles.memberCode}>{m.employeeCode}</Text>
                      </View>
                      {selected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNewChat(false); setSelectedIds([]); setRoomName(''); }}
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
  controlPanel: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.card,
  },
  screenHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenKicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    marginTop: 2,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  screenCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: 0,
    paddingBottom: 96,
    gap: Spacing.sm,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarGroup: { backgroundColor: Colors.primary },
  avatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.surface },
  roomInfo: { flex: 1 },
  roomTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  roomName: {
    fontSize: FontSize.md,
    fontWeight: '800',
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
    ...Shadow.raised,
  },
  fabText: { fontSize: 20, color: Colors.surface, lineHeight: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 86, 128, 0.34)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  modalDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modalInput: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  modeTextActive: { color: Colors.surface },
  memberList: { gap: Spacing.xs },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  memberItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  memberItemDisabled: { opacity: 0.35 },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  memberName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  memberNameSelected: { color: Colors.primary },
  memberCode: { fontSize: FontSize.xs, color: Colors.textMuted },
  checkMark: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
  memberEmpty: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
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
