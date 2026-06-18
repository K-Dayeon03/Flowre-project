import React, { useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useChatStore } from '../../store/useChatStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useStoreContextStore } from '../../store/useStoreContextStore';
import { canApproveEmployees, canCreateNotices, canManageStores, canRegisterEmployees } from './homePermissions';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import MetricCard from '../../components/MetricCard';
import SectionHeader from '../../components/SectionHeader';
import { useResponsive } from '../../hooks/useResponsive';
import { Favorite } from '../../api/favoriteApi';

function getTodayLabel() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

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
  const navigation = useNavigation<any>();
  const responsive = useResponsive();
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
  const headlineNotice = useMemo(() => notices.find((n) => n.pinned) ?? notices[0], [notices]);

  const displayStoreName = selectedStore?.storeName ?? user?.storeName ?? '매장 미지정';
  const canShowStoreManage = canManageStores(user?.role);
  const canShowEmployeeManage = canRegisterEmployees(user?.role);
  const canShowEmployeeApproval = canApproveEmployees(user?.role);
  const pendingCount = schedules.filter((s) => s.status === 'PENDING').length;
  const doneCount = schedules.filter((s) => s.status === 'DONE').length;

  const navigateFavorite = (favorite: Favorite) => {
    if (favorite.targetType === 'MENU') {
      const key = favorite.targetKey;
      if (key === 'SCHEDULE') navigation.navigate('ScheduleList');
      else if (key === 'INVENTORY') navigation.navigate('InventoryList');
      else if (key === 'DOCUMENT') navigation.navigate('DocumentList');
      else if (key === 'CHAT') navigation.navigate('ChatRoomList');
      else if (key === 'NOTICE') navigation.navigate('NoticeList');
      else if (key === 'STORE_MANAGE') navigation.navigate('StoreManage');
      else if (key === 'EMPLOYEE_MANAGE') navigation.navigate('EmployeeManage');
      else if (key === 'EMPLOYEE_APPROVAL') navigation.navigate('EmployeeApproval');
      return;
    }
    if (favorite.targetType === 'DOCUMENT' && favorite.targetId) {
      navigation.navigate('DocumentDetail', { documentId: favorite.targetId, title: favorite.label ?? '문서' });
    } else if (favorite.targetType === 'SCHEDULE' && favorite.targetId) {
      navigation.navigate('ScheduleDetail', { scheduleId: favorite.targetId });
    } else if (favorite.targetType === 'CHAT_ROOM' && favorite.targetId) {
      navigation.navigate('ChatRoom', { roomId: favorite.targetId, roomName: favorite.label ?? '채팅방', roomType: 'GROUP' });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.workspace}>
        {/* 대시보드 헤더 */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topKicker}>{getTodayLabel()}</Text>
            <Text style={styles.topTitle}>{user?.name ?? '직원'}님, 오늘의 업무 현황</Text>
            <Text style={styles.topSubtitle}>{displayStoreName}</Text>
          </View>
        </View>

        {/* KPI 요약 카드 */}
        <View style={styles.summaryRow}>
          <MetricCard label="오늘 스케줄" value={String(todaySchedules.length)} sub={inProgressCount > 0 ? `진행 중 ${inProgressCount}` : '진행 없음'} color={Colors.primary} />
          <MetricCard label="안읽은 채팅" value={String(totalUnread)} sub="메시지" color={Colors.success} />
          <MetricCard label="안읽은 공지" value={String(unreadNoticeCount)} sub="새 공지" color={Colors.info} />
          <MetricCard label="완료 스케줄" value={String(doneCount)} sub={pendingCount > 0 ? `대기 ${pendingCount}` : '대기 없음'} color={Colors.warning} />
        </View>

        {/* 대시보드 콘텐츠 그리드 */}
        <View style={[styles.dashboardGrid, responsive.isWide && styles.dashboardGridWide]}>
          {/* 좌/메인 컬럼 */}
          <View style={[styles.dashboardMain, responsive.isWide && styles.dashboardMainWide]}>
            <View style={styles.panel}>
              <SectionHeader title="스케줄 현황" onAction={() => navigation.navigate('ScheduleList')} />
              <View style={styles.statusStrip}>
                <StatusTile label="대기" value={pendingCount} color={Colors.warning} />
                <StatusTile label="진행 중" value={inProgressCount} color={Colors.primary} />
                <StatusTile label="완료" value={doneCount} color={Colors.success} />
              </View>
            </View>

            <View style={styles.panel}>
              <SectionHeader title="오늘 스케줄" onAction={() => navigation.navigate('ScheduleList')} />
              {todaySchedules.length === 0 ? (
                <Card style={styles.panelEmptyCard}>
                  <EmptyState title="오늘 등록된 스케줄이 없습니다." />
                </Card>
              ) : (
                todaySchedules.slice(0, 4).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.scheduleCard}
                    onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: s.id })}
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

            <View style={styles.panel}>
              <SectionHeader title="최근 채팅" onAction={() => navigation.navigate('ChatRoomList')} />
              {rooms.length === 0 ? (
                <Card style={styles.panelEmptyCard}>
                  <EmptyState title="참여 중인 채팅방이 없습니다." />
                </Card>
              ) : (
                rooms.slice(0, 4).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.chatRow}
                    onPress={() => navigation.navigate('ChatRoom', { roomId: r.id, roomName: r.name, roomType: r.type })}
                  >
                    <Text style={styles.chatIcon}>{r.type === 'GROUP' ? '👥' : '💬'}</Text>
                    <Text style={styles.chatTitle} numberOfLines={1}>{r.name}</Text>
                    {r.unread > 0 ? <Badge label={r.unread} color={Colors.error} subtle={false} /> : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {/* 우/사이드 컬럼 */}
          <View style={[styles.dashboardSide, responsive.isWide && styles.dashboardSideWide]}>
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
                    <Text style={styles.noticeTitle} numberOfLines={2}>{headlineNotice.title}</Text>
                    <Text style={styles.noticeBody} numberOfLines={3}>{headlineNotice.content || '내용 없음'}</Text>
                    <TouchableOpacity style={styles.noticeMore} onPress={() => navigation.navigate('NoticeList')}>
                      <Text style={styles.noticeMoreText}>전체 보기</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.noticeBody}>등록된 공지가 없습니다.</Text>
                )}
              </Card>
            </TouchableOpacity>

            <View style={styles.panel}>
              <SectionHeader title="즐겨찾기" />
              <View style={styles.favoriteGrid}>
                {favorites.length === 0 ? (
                  <Card style={styles.favoriteEmpty}>
                    <EmptyState icon="⭐" title="즐겨찾기가 없습니다" description="상세 화면에서 별표를 눌러 추가하세요." />
                  </Card>
                ) : (
                  favorites.slice(0, 4).map((favorite) => (
                    <TouchableOpacity key={favorite.id} style={styles.favoriteChip} onPress={() => navigateFavorite(favorite)} activeOpacity={0.84}>
                      <Text style={styles.favoriteIcon}>⭐</Text>
                      <Text style={styles.favoriteLabel} numberOfLines={1}>
                        {favorite.label ?? (favorite.targetKey ? MENU_LABEL[favorite.targetKey] : '즐겨찾기')}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {(canShowStoreManage || canShowEmployeeManage || canShowEmployeeApproval || canCreateNotices(user?.role)) && (
              <View style={styles.panel}>
                <SectionHeader title="관리 바로가기" />
                <View style={styles.managementGrid}>
                  {canShowStoreManage && <ManagementCard title="매장 등록" sub="점별 코드·매장명 관리" onPress={() => navigation.navigate('StoreManage')} />}
                  {canShowEmployeeManage && <ManagementCard title="직원 등록" sub="직원 아이디 발급" onPress={() => navigation.navigate('EmployeeManage')} />}
                  {canShowEmployeeApproval && <ManagementCard title="직원 승인" sub="승인 대기 확인" onPress={() => navigation.navigate('EmployeeApproval')} />}
                  {canCreateNotices(user?.role) && <ManagementCard title="공지 작성" sub="매장 공지 등록" onPress={() => navigation.navigate('NoticeCreate')} />}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ManagementCard({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.managementCard} onPress={onPress} activeOpacity={0.84}>
      <View style={styles.managementTop}>
        <Text style={styles.managementTitle}>{title}</Text>
        <Text style={styles.managementArrow}>›</Text>
      </View>
      <Text style={styles.managementSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function StatusTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statusTile, { borderColor: `${color}2E`, backgroundColor: `${color}0D` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  workspace: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topKicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  topTitle: {
    marginTop: 2,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  topSubtitle: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dashboardGrid: {
    flex: 1,
    gap: Spacing.sm,
  },
  dashboardGridWide: {
    flexDirection: 'row',
  },
  dashboardMain: {
    flex: 1,
    gap: Spacing.sm,
  },
  dashboardMainWide: {
    flex: 1.6,
  },
  dashboardSide: {
    flex: 1,
    gap: Spacing.sm,
  },
  dashboardSideWide: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
  },
  panel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  panelEmptyCard: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  statusStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusTile: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  statusValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  statusLabel: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  noticeBanner: {
    borderColor: Colors.border,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
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
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  noticeMoreText: { color: Colors.primaryDark, fontSize: FontSize.sm, fontWeight: '800' },
  favoriteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  favoriteEmpty: { width: '100%', padding: Spacing.sm },
  favoriteChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 58,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  favoriteIcon: { fontSize: FontSize.md, marginBottom: 2 },
  favoriteLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '800' },
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  managementCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 76,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  managementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  managementTitle: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '900' },
  managementArrow: { fontSize: FontSize.xl, color: Colors.primary, fontWeight: '900', lineHeight: 22 },
  managementSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBar: { width: 4, alignSelf: 'stretch' },
  scheduleInfo: { flex: 1, padding: Spacing.sm + 4 },
  scheduleTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  scheduleDue: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatIcon: { marginRight: Spacing.sm, fontSize: FontSize.lg },
  chatTitle: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '700' },
});
