import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ChatStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatRoomList'>;

const MOCK_ROOMS = [
  {
    id: 1,
    name: '강남점 전체',
    type: 'GROUP' as const,
    lastMessage: '이번 주 마네킹 교체 일정 공유드립니다.',
    lastAt: '10:23',
    unread: 3,
    members: 8,
  },
  {
    id: 2,
    name: '이수진 (VMD팀)',
    type: 'DIRECT' as const,
    lastMessage: 'SS 가이드라인 확인하셨나요?',
    lastAt: '어제',
    unread: 1,
    members: 2,
  },
  {
    id: 3,
    name: '박소연',
    type: 'DIRECT' as const,
    lastMessage: '네, 확인했습니다!',
    lastAt: '어제',
    unread: 0,
    members: 2,
  },
  {
    id: 4,
    name: '강남점 VM 채널',
    type: 'GROUP' as const,
    lastMessage: '사진 첨부했어요.',
    lastAt: '03.09',
    unread: 0,
    members: 4,
  },
];

export default function ChatRoomListScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const filtered = MOCK_ROOMS.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

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
});
