import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Gradients, Radius, Shadow, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useChatStore } from '../../store/useChatStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useStoreContextStore } from '../../store/useStoreContextStore';
import { canApproveEmployees, canCreateNotices, canManageStores, canRegisterEmployees } from './homePermissions';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import { Store, storeApi } from '../../api/storeApi';
import { Favorite } from '../../api/favoriteApi';

/** 오늘 날짜 포맷 */
function getTodayLabel() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

/** 오늘 날짜 키를 YYYY-MM-DD로 반환합니다. */
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

const MENU_LABEL: Record<string, string> = {
  HOME: '홈',
  SCHEDULE: '스케줄',
  INVENTORY: '재고',
  DOCUMENT: '문서',
  CHAT: '채팅',
  STORE_MANAGE: '매장 등록',
  EMPLOYEE_MANAGE: '직원 등록',
  EMPLOYEE_APPROVAL: '직원 승인',
  NOTICE: '공지',
};

export default function HomeScreen() {
  // any 타입 사용 — HomeStack + MainTab 양쪽으로 네비게이션 필요
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const schedules = useScheduleStore((s) => s.schedules);
  const fetchSchedules = useScheduleStore((s) => s.fetchSchedules);
  const rooms = useChatStore((s) => s.rooms);
  const fetchRooms = useChatStore((s) => s.fetchRooms);
  const notices = useNoticeStore((s) => s.notices);
  const unreadNoticeCount = useNoticeStore((s) => s.unreadCount);
  const fetchNotices = useNoticeStore((s) => s.fetchNotices);
  const fetchUnreadCount = useNoticeStore((s) => s.fetchUnreadCount);
  const favorites = useFavoriteStore((s) => s.favorites);
  const fetchFavorites = useFavoriteStore((s) => s.fetchFavorites);
  const selectedStore = useStoreContextStore((s) => s.selectedStore);
  const setSelectedStore = useStoreContextStore((s) => s.setSelectedStore);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeModalVisible, setStoreModalVisible] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchRooms();
    fetchNotices();
    fetchUnreadCount();
    fetchFavorites();
  }, [fetchFavorites, fetchNotices, fetchRooms, fetchSchedules, fetchUnreadCount]);

  const todayKey = getTodayKey();
  const todaySchedules = schedules.filter((s) => s.dueDate.startsWith(todayKey));
  const inProgressCount = todaySchedules.filter((s) => s.status === 'IN_PROGRESS').length;
  const totalUnread = rooms.reduce((sum, r) => sum + r.unread, 0);
  const headlineNotice = useMemo(() => notices.find((notice) => notice.pinned) ?? notices[0], [notices]);

  const displayStoreName = selectedStore?.storeName ?? user?.storeName ?? '매장 미지정';
  const canShowStoreManage = canManageStores(user?.role);
  const canShowEmployeeManage = canRegisterEmployees(user?.role);
  const canShowEmployeeApproval = canApproveEmployees(user?.role);
  const canSelectStore = canManageStores(user?.role);

  const openStoreSelector = async () => {
    if (!canSelectStore) return;
    try {
      const list = await storeApi.getList();
      setStores(list);
      setStoreModalVisible(true);
    } catch {
      setStores([]);
      setStoreModalVisible(true);
    }
  };

  const navigateFavorite = (favorite: Favorite) => {
    if (favorite.targetType === 'MENU') {
      const key = favorite.targetKey;
      if (key === 'SCHEDULE') navigation.navigate('ScheduleTab');
      else if (key === 'INVENTORY') navigation.navigate('InventoryTab');
      else if (key === 'DOCUMENT') navigation.navigate('DocumentTab');
      else if (key === 'CHAT') navigation.navigate('ChatTab');
      else if (key === 'NOTICE') navigation.navigate('NoticeList');
      else if (key === 'STORE_MANAGE') navigation.navigate('StoreManage');
      else if (key === 'EMPLOYEE_MANAGE') navigation.navigate('EmployeeManage');
      else if (key === 'EMPLOYEE_APPROVAL') navigation.navigate('EmployeeApproval');
      return;
    }

    if (favorite.targetType === 'DOCUMENT' && favorite.targetId) {
      navigation.navigate('DocumentTab', {
        screen: 'DocumentDetail',
        params: { documentId: favorite.targetId, title: favorite.label ?? '문서' },
      });
    } else if (favorite.targetType === 'SCHEDULE' && favorite.targetId) {
      navigation.navigate('ScheduleTab', {
        screen: 'ScheduleDetail',
        params: { scheduleId: favorite.targetId },
      });
    } else if (favorite.targetType === 'CHAT_ROOM' && favorite.targetId) {
      navigation.navigate('ChatTab', {
        screen: 'ChatRoom',
        params: { roomId: favorite.targetId, roomName: favorite.label ?? '채팅방', roomType: 'GROUP' },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>안녕하세요, {user?.name ?? '직원'}님</Text>
              <TouchableOpacity style={styles.storeChip} onPress={openStoreSelector} disabled={!canSelectStore} activeOpacity={0.82}>
                <Text style={styles.storeChipText} numberOfLines={1}>{displayStoreName}</Text>
                {canSelectStore ? <Text style={styles.storeChipArrow}>⌄</Text> : null}
              </TouchableOpacity>
              <Text style={styles.todayLabel}>{getTodayLabel()}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
              <Avatar name={user?.name} size={50} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => headlineNotice && navigation.navigate('NoticeDetail', { noticeId: headlineNotice.id })}
            disabled={!headlineNotice}
          >
            <Card style={styles.noticeBanner}>
              <View style={styles.noticeBannerTop}>
                <Text style={styles.noticeEyebrow}>공지</Text>
                {unreadNoticeCount > 0 ? <Badge label={unreadNoticeCount} color={Colors.error} subtle={false} /> : null}
              </View>
              {headlineNotice ? (
                <>
                  <Text style={styles.noticeTitle} numberOfLines={1}>{headlineNotice.title}</Text>
                  <Text style={styles.noticeBody} numberOfLines={2}>{headlineNotice.content || '내용 없음'}</Text>
                  <TouchableOpacity style={styles.noticeMore} onPress={() => navigation.navigate('NoticeList')}>
                    <Text style={styles.noticeMoreText}>전체 보기</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noticeBody}>등록된 공지가 없습니다.</Text>
              )}
            </Card>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <SummaryCard label="오늘 스케줄" value={String(todaySchedules.length)} sub={inProgressCount > 0 ? `진행 중 ${inProgressCount}건` : '진행 중 없음'} color={Colors.primary} />
            <SummaryCard label="안읽은 채팅" value={String(totalUnread)} sub="메시지" color={Colors.success} />
            <SummaryCard label="안읽은 공지" value={String(unreadNoticeCount)} sub="새 공지" color={Colors.accent} />
          </View>

          <View style={styles.section}>
            <SectionHeader title="즐겨찾기" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteList}>
              {favorites.length === 0 ? (
                <Card style={styles.favoriteEmpty}>
                  <EmptyState icon="⭐" title="즐겨찾기가 없습니다" description="문서, 스케줄, 채팅 상세 화면에서 별표를 눌러 추가하세요." />
                </Card>
              ) : (
                favorites.map((favorite) => (
                  <TouchableOpacity key={favorite.id} style={styles.favoriteChip} onPress={() => navigateFavorite(favorite)} activeOpacity={0.84}>
                    <Text style={styles.favoriteIcon}>⭐</Text>
                    <Text style={styles.favoriteLabel} numberOfLines={1}>
                      {favorite.label ?? (favorite.targetKey ? MENU_LABEL[favorite.targetKey] : '즐겨찾기')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {(canShowStoreManage || canShowEmployeeManage || canShowEmployeeApproval) && (
            <View style={styles.section}>
              <SectionHeader title="관리 바로가기" />
              <View style={styles.managementGrid}>
                {canShowStoreManage && <ManagementCard title="매장 등록" sub="점별 코드와 매장명 관리" onPress={() => navigation.navigate('StoreManage')} />}
                {canShowEmployeeManage && <ManagementCard title="직원 등록" sub="직원 아이디 발급" onPress={() => navigation.navigate('EmployeeManage')} />}
                {canShowEmployeeApproval && <ManagementCard title="직원 승인" sub="승인 대기 확인" onPress={() => navigation.navigate('EmployeeApproval')} />}
                {canCreateNotices(user?.role) && <ManagementCard title="공지 작성" sub="매장 공지 등록" onPress={() => navigation.navigate('NoticeCreate')} />}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="오늘 스케줄" onAction={() => navigation.navigate('ScheduleTab')} />
            {todaySchedules.length === 0 ? (
              <Card>
                <EmptyState title="오늘 등록된 스케줄이 없습니다." />
              </Card>
            ) : (
              todaySchedules.slice(0, 3).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.scheduleCard}
                  onPress={() => navigation.navigate('ScheduleTab', {
                    screen: 'ScheduleDetail',
                    params: { scheduleId: s.id },
                  })}
                >
                  <View style={[styles.typeBar, { backgroundColor: Colors.scheduleType[s.type] }]} />
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{s.title}</Text>
                    <Text style={styles.scheduleDue}>{s.dueDate.split('T')[0]}</Text>
                  </View>
                  <Badge label={STATUS_LABEL[s.status]} color={Colors.statusBadge[s.status]} />
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="최근 채팅" onAction={() => navigation.navigate('ChatTab')} />
            {rooms.length === 0 ? (
              <Card>
                <EmptyState title="참여 중인 채팅방이 없습니다." />
              </Card>
            ) : (
              rooms.slice(0, 3).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.chatRow}
                  onPress={() => navigation.navigate('ChatTab', {
                    screen: 'ChatRoom',
                    params: { roomId: r.id, roomName: r.name, roomType: r.type },
                  })}
                >
                  <Text style={styles.chatIcon}>{r.type === 'GROUP' ? '👥' : '💬'}</Text>
                  <Text style={styles.chatTitle} numberOfLines={1}>{r.name}</Text>
                  {r.unread > 0 ? <Badge label={r.unread} color={Colors.error} subtle={false} /> : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={storeModalVisible} transparent animationType="fade" onRequestClose={() => setStoreModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>매장 컨텍스트</Text>
            <TouchableOpacity style={styles.storeOption} onPress={() => { setSelectedStore(null); setStoreModalVisible(false); }}>
              <Text style={styles.storeOptionName}>내 기본 매장</Text>
              <Text style={styles.storeOptionCode}>{user?.storeName ?? '-'}</Text>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity key={store.id} style={styles.storeOption} onPress={() => { setSelectedStore(store); setStoreModalVisible(false); }}>
                <Text style={styles.storeOptionName}>{store.storeName}</Text>
                <Text style={styles.storeOptionCode}>{store.storeCode}</Text>
              </TouchableOpacity>
            ))}
            {stores.length === 0 ? <Text style={styles.storeEmptyText}>매장 목록을 불러오지 못했습니다.</Text> : null}
            <TouchableOpacity style={styles.modalClose} onPress={() => setStoreModalVisible(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summarySub}>{sub}</Text>
    </Card>
  );
}

function ManagementCard({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.managementCard} onPress={onPress} activeOpacity={0.84}>
      <Text style={styles.managementTitle}>{title}</Text>
      <Text style={styles.managementSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 58,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerText: { flex: 1 },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.surface,
  },
  storeChip: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.surface}26`,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  storeChipText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  storeChipArrow: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  todayLabel: {
    marginTop: Spacing.sm,
    color: `${Colors.surface}CC`,
    fontSize: FontSize.sm,
  },
  content: {
    marginTop: -38,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  noticeBanner: {
    marginBottom: Spacing.md,
    borderColor: `${Colors.accent}55`,
  },
  noticeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  noticeEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    color: Colors.accent,
  },
  noticeTitle: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  noticeBody: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  noticeMore: { alignSelf: 'flex-start', marginTop: Spacing.sm },
  noticeMoreText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: {
    flex: 1,
    minHeight: 108,
    padding: Spacing.sm,
  },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '700' },
  summarySub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  section: { marginBottom: Spacing.lg },
  favoriteList: { gap: Spacing.sm, paddingRight: Spacing.md },
  favoriteEmpty: { width: 260, padding: Spacing.sm },
  favoriteChip: {
    width: 136,
    minHeight: 64,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    justifyContent: 'center',
    ...Shadow.card,
  },
  favoriteIcon: { fontSize: FontSize.lg, marginBottom: 2 },
  favoriteLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '800' },
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  managementCard: {
    width: '48%',
    minHeight: 82,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'center',
    ...Shadow.card,
  },
  managementTitle: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '900' },
  managementSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  typeBar: { width: 5, alignSelf: 'stretch' },
  scheduleInfo: { flex: 1, padding: Spacing.md },
  scheduleTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  scheduleDue: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatIcon: { marginRight: Spacing.sm, fontSize: FontSize.lg },
  chatTitle: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.36)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.raised,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  storeOption: {
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeOptionName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  storeOptionCode: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  storeEmptyText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
  modalClose: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCloseText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '800',
  },
});
