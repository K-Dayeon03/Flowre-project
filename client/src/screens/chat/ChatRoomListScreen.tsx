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
import { chatApi, ChatMember } from '../../api/chatApi';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChatRoomList'>;

export default function ChatRoomListScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  // ── 새 채팅 모달 ──────────────────────────────────────────────
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [memberSelectedIds, setMemberSelectedIds] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── 편집 모드 ─────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editSelectedIds, setEditSelectedIds] = useState<number[]>([]);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);

  const rooms = useChatStore((s) => s.rooms);
  const loading = useChatStore((s) => s.loading);
  const fetchRooms = useChatStore((s) => s.fetchRooms);
  const removeRoom = useChatStore((s) => s.removeRoom);
  const renameRoom = useChatStore((s) => s.renameRoom);

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── 편집 모드 핸들러 ─────────────────────────────────────────

  const enterEditMode = () => {
    setEditSelectedIds([]);
    setEditMode(true);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setEditSelectedIds([]);
  };

  const toggleEditSelect = (id: number) => {
    setEditSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleEditDelete = () => {
    if (editSelectedIds.length === 0) return;
    Alert.alert(
      `${editSelectedIds.length}개 채팅방 나가기`,
      '선택한 채팅방에서 나갑니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(editSelectedIds.map((id) => chatApi.leaveRoom(id)));
              editSelectedIds.forEach((id) => removeRoom(id));
              exitEditMode();
            } catch {
              Alert.alert('오류', '일부 채팅방을 나가지 못했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleEditRename = () => {
    if (editSelectedIds.length !== 1) return;
    const targetRoom = rooms.find((r) => r.id === editSelectedIds[0]);
    if (!targetRoom || targetRoom.type !== 'GROUP') {
      Alert.alert('알림', '그룹 채팅방만 이름을 변경할 수 있습니다.');
      return;
    }
    setRenameTargetId(targetRoom.id);
    setRenameValue(targetRoom.name);
    setShowRename(true);
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || renameTargetId == null) return;
    try {
      await chatApi.updateRoom(renameTargetId, renameValue.trim());
      renameRoom(renameTargetId, renameValue.trim());
      setShowRename(false);
      setRenameTargetId(null);
      exitEditMode();
    } catch {
      Alert.alert('오류', '이름을 변경하지 못했습니다.');
    }
  };

  // ── 새 채팅 핸들러 ───────────────────────────────────────────

  const openNewChat = async () => {
    setShowNewChat(true);
    setMemberSelectedIds([]);
    setNewChatName('');
    setLoadingMembers(true);
    try {
      setMembers(await chatApi.getChatCandidates());
    } catch {
      Alert.alert('오류', '직원 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (id: number) => {
    setMemberSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const isGroupChat = memberSelectedIds.length > 1;

  const handleStartChat = async () => {
    if (memberSelectedIds.length === 0) {
      Alert.alert('알림', '대화할 직원을 선택해주세요.');
      return;
    }
    if (isGroupChat && !newChatName.trim()) {
      Alert.alert('알림', '그룹 채팅방 이름을 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      const room = !isGroupChat
        ? await chatApi.createDirectRoom(memberSelectedIds[0])
        : await chatApi.createRoom({ name: newChatName.trim(), memberUserIds: memberSelectedIds });
      setShowNewChat(false);
      setMemberSelectedIds([]);
      setNewChatName('');
      await fetchRooms();
      navigation.navigate('ChatRoom', { roomId: room.id, roomName: room.name, roomType: room.type });
    } catch {
      Alert.alert('오류', '채팅방을 만들 수 없습니다. 권한을 확인해주세요.');
    } finally {
      setCreating(false);
    }
  };

  const hqMembers = members.filter((m) => m.role === 'HQ_STAFF' || m.role === 'ADMIN');
  const storeMembers = members.filter((m) => m.role === 'STORE_STAFF' || m.role === 'STORE_MANAGER');

  // 편집 모드에서 수정 버튼 활성 조건: 1개 선택 + GROUP 채팅방
  const canRename =
    editSelectedIds.length === 1 &&
    rooms.find((r) => r.id === editSelectedIds[0])?.type === 'GROUP';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.controlPanel}>
        <View style={styles.screenHead}>
          <View>
            <Text style={styles.screenKicker}>CHAT</Text>
            <Text style={styles.screenTitle}>대화 목록</Text>
          </View>
          <View style={styles.headRight}>
            {!editMode ? (
              <>
                <Text style={styles.screenCount}>{filtered.length}개</Text>
                <TouchableOpacity style={styles.editBtn} onPress={enterEditMode}>
                  <Text style={styles.editBtnText}>편집</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={exitEditMode}>
                <Text style={[styles.editBtnText, styles.editBtnDone]}>완료</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!editMode && (
          <SearchBar value={search} onChangeText={setSearch} placeholder="채팅방 검색" />
        )}
        {editMode && editSelectedIds.length > 0 && (
          <Text style={styles.editHint}>{editSelectedIds.length}개 선택됨</Text>
        )}
        {editMode && editSelectedIds.length === 0 && (
          <Text style={styles.editHint}>수정하거나 삭제할 채팅방을 선택하세요.</Text>
        )}
      </View>

      {loading && rooms.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, editMode && styles.listEdit]}
          renderItem={({ item }) => {
            const isSelected = editSelectedIds.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.roomItem, isSelected && styles.roomItemSelected]}
                onPress={() => {
                  if (editMode) {
                    toggleEditSelect(item.id);
                  } else {
                    navigation.navigate('ChatRoom', {
                      roomId: item.id,
                      roomName: item.name,
                      roomType: item.type,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                {/* 편집 체크박스 */}
                {editMode && (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                )}

                {/* 아바타 */}
                <View style={[styles.avatar, item.type === 'GROUP' && styles.avatarGroup]}>
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>

                {/* 채팅방 정보 */}
                <View style={styles.roomInfo}>
                  <View style={styles.roomTop}>
                    <Text style={styles.roomName}>{item.name}</Text>
                    {item.type === 'GROUP' && (
                      <Text style={styles.memberCount}>{item.members}</Text>
                    )}
                    {!editMode && <Text style={styles.roomTime}>{item.lastAt}</Text>}
                  </View>
                  {!editMode && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  )}
                  {editMode && item.type === 'DIRECT' && (
                    <Text style={styles.roomTypeBadge}>1:1 채팅</Text>
                  )}
                  {editMode && item.type === 'GROUP' && (
                    <Text style={styles.roomTypeBadge}>그룹 채팅</Text>
                  )}
                </View>

                {/* 안읽음 뱃지 (일반 모드만) */}
                {!editMode && item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>채팅방이 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 편집 모드 하단 액션 바 */}
      {editMode && (
        <View style={styles.editBar}>
          <TouchableOpacity
            style={[styles.editBarBtn, styles.editBarRenameBtn, (!canRename) && styles.editBarBtnDisabled]}
            onPress={handleEditRename}
            disabled={!canRename}
          >
            <Text style={[styles.editBarBtnText, !canRename && styles.editBarBtnTextDisabled]}>
              이름 수정
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editBarBtn, styles.editBarDeleteBtn, editSelectedIds.length === 0 && styles.editBarBtnDisabled]}
            onPress={handleEditDelete}
            disabled={editSelectedIds.length === 0}
          >
            <Text style={[styles.editBarBtnText, styles.editBarDeleteText, editSelectedIds.length === 0 && styles.editBarBtnTextDisabled]}>
              나가기
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 새 채팅 FAB (편집 모드엔 숨김) */}
      {!editMode && (
        <TouchableOpacity style={styles.fab} onPress={openNewChat} activeOpacity={0.85}>
          <Text style={styles.fabText}>✏️</Text>
        </TouchableOpacity>
      )}

      {/* 이름 수정 모달 */}
      <Modal visible={showRename} transparent animationType="slide" onRequestClose={() => setShowRename(false)}>
        <View style={styles.renameOverlay}>
          <View style={styles.renameSheet}>
            <Text style={styles.renameTitle}>방 이름 수정</Text>
            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="새 채팅방 이름"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              maxLength={50}
            />
            <View style={styles.renameBtns}>
              <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setShowRename(false)}>
                <Text style={styles.renameCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameConfirmBtn, !renameValue.trim() && styles.renameConfirmBtnDisabled]}
                onPress={handleRenameConfirm}
                disabled={!renameValue.trim()}
              >
                <Text style={styles.renameConfirmText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 새 채팅 모달 */}
      <Modal visible={showNewChat} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 채팅 시작</Text>
            <Text style={styles.modalDesc}>
              {memberSelectedIds.length === 0
                ? '대화할 직원을 선택하세요.'
                : memberSelectedIds.length === 1
                ? '1명 선택 — 1:1 채팅'
                : `${memberSelectedIds.length}명 선택 — 그룹 채팅`}
            </Text>

            {isGroupChat && (
              <TextInput
                style={styles.modalInput}
                placeholder="채팅방 이름"
                placeholderTextColor={Colors.textMuted}
                value={newChatName}
                onChangeText={setNewChatName}
              />
            )}

            {loadingMembers ? (
              <ActivityIndicator color={Colors.accent} style={{ paddingVertical: Spacing.md }} />
            ) : members.length === 0 ? (
              <Text style={styles.memberEmpty}>채팅 가능한 직원이 없습니다.</Text>
            ) : (
              <View style={styles.memberList}>
                {hqMembers.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>본사 직원</Text>
                    {hqMembers.map((m) => {
                      const selected = memberSelectedIds.includes(m.id);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.memberItem, selected && styles.memberItemSelected]}
                          onPress={() => toggleMember(m.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.memberAvatar, styles.memberAvatarHq]}>
                            <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.memberNameRow}>
                              <Text style={[styles.memberName, selected && styles.memberNameSelected]}>{m.name}</Text>
                              <View style={styles.hqBadge}><Text style={styles.hqBadgeText}>본사</Text></View>
                            </View>
                            <Text style={styles.memberCode}>{m.employeeCode}</Text>
                          </View>
                          {selected && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
                {storeMembers.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>매장 직원</Text>
                    {storeMembers.map((m) => {
                      const selected = memberSelectedIds.includes(m.id);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.memberItem, selected && styles.memberItemSelected]}
                          onPress={() => toggleMember(m.id)}
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
                  </>
                )}
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNewChat(false); setMemberSelectedIds([]); setNewChatName(''); }}
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
    gap: Spacing.sm,
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
  headRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
  editBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  editBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  editBtnDone: { color: Colors.primary },
  editHint: { fontSize: FontSize.xs, color: Colors.textMuted },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: 0,
    paddingBottom: 96,
    gap: Spacing.sm,
  },
  listEdit: { paddingBottom: 80 },
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
  roomItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0A',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTick: { fontSize: 12, color: Colors.surface, fontWeight: '700' },
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
  roomName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  memberCount: { fontSize: FontSize.xs, color: Colors.textSecondary, marginRight: Spacing.sm },
  roomTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  lastMessage: { fontSize: FontSize.sm, color: Colors.textSecondary },
  roomTypeBadge: { fontSize: FontSize.xs, color: Colors.textMuted },
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

  // 편집 하단 바
  editBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  editBarBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBarRenameBtn: { backgroundColor: Colors.surfaceMuted },
  editBarDeleteBtn: { backgroundColor: Colors.error + '12', borderColor: Colors.error + '40' },
  editBarBtnDisabled: { opacity: 0.35 },
  editBarBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  editBarDeleteText: { color: Colors.error },
  editBarBtnTextDisabled: { color: Colors.textMuted },

  // FAB
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

  // 이름 수정 모달
  renameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  renameSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  renameTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  renameInput: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  renameBtns: { flexDirection: 'row', gap: Spacing.sm },
  renameCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  renameCancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  renameConfirmBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  renameConfirmBtnDisabled: { opacity: 0.5 },
  renameConfirmText: { fontSize: FontSize.md, color: Colors.surface, fontWeight: '700' },

  // 새 채팅 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(14, 86, 128, 0.34)', justifyContent: 'flex-end' },
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
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarHq: { backgroundColor: Colors.primary + '25' },
  memberAvatarText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  memberName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  memberNameSelected: { color: Colors.primary },
  memberCode: { fontSize: FontSize.xs, color: Colors.textMuted },
  memberEmpty: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  checkMark: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingVertical: Spacing.xs,
    paddingHorizontal: 2,
  },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  hqBadge: { backgroundColor: Colors.primary, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  hqBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.surface },
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
