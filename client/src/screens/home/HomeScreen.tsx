import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontSize, Radius, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useChatStore } from '../../store/useChatStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useStoreContextStore } from '../../store/useStoreContextStore';
import { canApproveEmployees, canCreateNotices, canManageStores, canRegisterEmployees } from './homePermissions';
import { storeApi, OperationStatus, StoreActivity } from '../../api/storeApi';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
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

const DashboardColors = {
  page: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceSoft: '#F5F8FF',
  ink: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#DBEAFE',
  lineStrong: '#93C5FD',
  gray: '#3B82F6',
  grayDark: '#1E3A8A',
  graySoft: '#EFF6FF',
  shadow: 'rgba(30, 58, 138, 0.12)',
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

  const isHq = user?.role === 'HQ_STAFF' || user?.role === 'ADMIN';
  const isManager = user?.role === 'STORE_MANAGER';

  const [myStoreActivity, setMyStoreActivity] = useState<StoreActivity | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadMyStoreStatus = useCallback(async () => {
    if (!isManager) return;
    try {
      const list = await storeApi.getActivity();
      if (list.length > 0) setMyStoreActivity(list[0]);
    } catch { /* silent */ }
  }, [isManager]);

  useEffect(() => { loadMyStoreStatus(); }, [loadMyStoreStatus]);

  const handleToggleMyStore = async () => {
    if (!myStoreActivity) return;
    const next: OperationStatus = myStoreActivity.operationStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const label = next === 'OPEN' ? '운영 시작' : '영업 종료';
    Alert.alert('운영 상태 변경', `${label}으로 변경하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          setUpdatingStatus(true);
          try {
            await storeApi.updateOperationStatus(myStoreActivity.storeId, next);
            setMyStoreActivity((prev) => prev ? { ...prev, operationStatus: next } : prev);
          } catch {
            Alert.alert('오류', '상태를 변경하지 못했습니다.');
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const displayStoreName = selectedStore?.storeName ?? user?.storeName ?? '매장 미지정';
  const canShowStoreManage = canManageStores(user?.role);
  const canShowEmployeeManage = canRegisterEmployees(user?.role);
  const canShowEmployeeApproval = canApproveEmployees(user?.role);
  const pendingCount = schedules.filter((s) => s.status === 'PENDING').length;
  const doneCount = schedules.filter((s) => s.status === 'DONE').length;
  const scheduleTotal = pendingCount + inProgressCount + doneCount;
  const completionRate = scheduleTotal > 0 ? Math.round((doneCount / scheduleTotal) * 100) : 0;

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.workspace}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, responsive.isMobile && styles.topBarMobile]}>
          <View style={styles.topCopy}>
            <Text style={styles.topKicker}>{getTodayLabel()}</Text>
            <Text style={styles.topTitle}>매장 통합관리 대시보드</Text>
            <Text style={styles.topSubtitle}>
              {displayStoreName} · {user?.name ?? '직원'}님 업무 현황
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>실시간 운영</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <DashboardMetric label="오늘 스케줄" value={String(todaySchedules.length)} sub={inProgressCount > 0 ? `진행 중 ${inProgressCount}` : '진행 없음'} />
          <DashboardMetric label="완료율" value={`${completionRate}%`} sub={scheduleTotal > 0 ? `${doneCount}/${scheduleTotal} 완료` : '업무 없음'} />
          <DashboardMetric label="안읽은 채팅" value={String(totalUnread)} sub="메시지" />
          <DashboardMetric label="안읽은 공지" value={String(unreadNoticeCount)} sub="새 공지" />
        </View>

        <View style={[styles.dashboardGrid, responsive.isWide && styles.dashboardGridWide]}>
          <View style={[styles.dashboardMain, responsive.isWide && styles.dashboardMainWide]}>
            <View style={styles.panel}>
              <SectionHeader title="업무 상태" onAction={() => navigation.navigate('ScheduleList')} />
              <View style={styles.statusStrip}>
                <StatusTile label="대기" value={pendingCount} />
                <StatusTile label="진행 중" value={inProgressCount} />
                <StatusTile label="완료" value={doneCount} />
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
                    <View style={styles.typeBar} />
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleTitle}>{s.title}</Text>
                      <Text style={styles.scheduleDue}>{s.dueDate.split('T')[0]}</Text>
                    </View>
                    <Badge label={STATUS_LABEL[s.status]} color={DashboardColors.gray} />
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
                    <View style={styles.chatIcon}>
                      <Text style={styles.chatIconText}>{r.type === 'GROUP' ? 'G' : '1:1'}</Text>
                    </View>
                    <Text style={styles.chatTitle} numberOfLines={1}>{r.name}</Text>
                    {r.unread > 0 ? <Badge label={r.unread} color={DashboardColors.grayDark} subtle={false} /> : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <View style={[styles.dashboardSide, responsive.isWide && styles.dashboardSideWide]}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => headlineNotice && navigation.navigate('NoticeDetail', { noticeId: headlineNotice.id })}
              disabled={!headlineNotice}
            >
              <Card style={styles.noticeBanner}>
                <View style={styles.noticeBannerTop}>
                  <Text style={styles.noticeEyebrow}>공지 브리핑</Text>
                  {unreadNoticeCount > 0 ? <Badge label={unreadNoticeCount} color={DashboardColors.grayDark} subtle={false} /> : null}
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
                      <View style={styles.favoriteMark} />
                      <Text style={styles.favoriteLabel} numberOfLines={1}>
                        {favorite.label ?? (favorite.targetKey ? MENU_LABEL[favorite.targetKey] : '즐겨찾기')}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {isHq && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('StoreActivity')}
                style={[styles.panel, styles.activityBanner]}
              >
                <View style={styles.activityBannerRow}>
                  <View>
                    <Text style={styles.activityBannerKicker}>STORE ACTIVITY</Text>
                    <Text style={styles.activityBannerTitle}>매장 현황 보기</Text>
                    <Text style={styles.activityBannerSub}>운영 상태 · 스케줄 · 직원 수</Text>
                  </View>
                  <Text style={styles.activityBannerArrow}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {isManager && (
              <View style={[styles.panel, myStoreActivity?.operationStatus === 'OPEN' && styles.panelOpen]}>
                <Text style={styles.activityBannerKicker}>내 매장 운영 상태</Text>
                <View style={styles.managerStatusRow}>
                  <View style={[styles.statusPill, myStoreActivity?.operationStatus === 'OPEN' ? styles.pillOpen : styles.pillClosed]}>
                    <Text style={[styles.statusPillText, myStoreActivity?.operationStatus === 'OPEN' ? styles.pillTextOpen : styles.pillTextClosed]}>
                      {myStoreActivity ? (myStoreActivity.operationStatus === 'OPEN' ? '운영 중' : '영업 종료') : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.managerToggleBtn, myStoreActivity?.operationStatus === 'OPEN' ? styles.toggleClose : styles.toggleOpen, updatingStatus && styles.toggleDisabled]}
                    onPress={handleToggleMyStore}
                    disabled={updatingStatus || !myStoreActivity}
                    activeOpacity={0.8}
                  >
                    {updatingStatus
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.managerToggleText}>{myStoreActivity?.operationStatus === 'OPEN' ? '영업 종료' : '운영 시작'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
        <HomeFooterBar
          storeName={displayStoreName}
          scheduleCount={todaySchedules.length}
          unreadCount={totalUnread + unreadNoticeCount}
          isCompact={responsive.isMobile}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardMetric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricAccent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub != null ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
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

function StatusTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statusTile}>
      <View style={styles.statusDot} />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

function HomeFooterBar({
  storeName,
  scheduleCount,
  unreadCount,
  isCompact,
}: {
  storeName: string;
  scheduleCount: number;
  unreadCount: number;
  isCompact: boolean;
}) {
  return (
    <View style={[styles.footerBar, isCompact && styles.footerBarMobile]}>
      <View style={styles.footerBrand}>
        <Text style={styles.footerBrandText}>flowre</Text>
        <Text style={styles.footerSubText}>{storeName}</Text>
      </View>
      <View style={[styles.footerMeta, isCompact && styles.footerMetaMobile]}>
        <Text style={styles.footerMetaText}>오늘 업무 {scheduleCount}</Text>
        <Text style={styles.footerDivider}>·</Text>
        <Text style={styles.footerMetaText}>미확인 {unreadCount}</Text>
        <Text style={styles.footerDivider}>·</Text>
        <Text style={styles.footerMetaText}>© 2026 Flowre</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DashboardColors.page },
  scroll: { flex: 1, backgroundColor: DashboardColors.page },
  workspace: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DashboardColors.line,
  },
  topBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  topKicker: {
    fontSize: FontSize.sm,
    color: DashboardColors.muted,
    fontWeight: '700',
    letterSpacing: 0,
  },
  topTitle: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xxl,
    color: DashboardColors.ink,
    fontWeight: '900',
    lineHeight: 30,
  },
  topSubtitle: {
    marginTop: Spacing.xs,
    color: DashboardColors.muted,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 86,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.graySoft,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
  liveText: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    flexBasis: 150,
    minWidth: 138,
    minHeight: 104,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: DashboardColors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    shadowColor: DashboardColors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 1,
  },
  metricAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: DashboardColors.lineStrong,
  },
  metricValue: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  metricLabel: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
    marginTop: 2,
  },
  metricSub: {
    color: DashboardColors.faint,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  dashboardGrid: {
    flex: 1,
    gap: Spacing.md,
  },
  dashboardGridWide: {
    flexDirection: 'row',
  },
  dashboardMain: {
    flex: 1,
    gap: Spacing.md,
  },
  dashboardMainWide: {
    flex: 1.6,
  },
  dashboardSide: {
    flex: 1,
    gap: Spacing.md,
  },
  dashboardSideWide: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
  },
  panel: {
    backgroundColor: DashboardColors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    padding: Spacing.md,
    shadowColor: DashboardColors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 1,
  },
  panelEmptyCard: {
    backgroundColor: DashboardColors.surfaceSoft,
    borderColor: DashboardColors.line,
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
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    backgroundColor: DashboardColors.gray,
  },
  statusValue: { color: DashboardColors.grayDark, fontSize: FontSize.xxl, fontWeight: '900' },
  statusLabel: {
    marginTop: 2,
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  noticeBanner: {
    borderColor: DashboardColors.line,
    padding: Spacing.lg,
    backgroundColor: DashboardColors.surface,
    borderRadius: Radius.lg,
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
    color: DashboardColors.grayDark,
    letterSpacing: 0,
  },
  noticeTitle: {
    fontSize: FontSize.lg,
    color: DashboardColors.ink,
    fontWeight: '900',
  },
  noticeBody: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: DashboardColors.muted,
    lineHeight: 19,
  },
  noticeMore: { alignSelf: 'flex-start', marginTop: Spacing.sm },
  noticeMoreText: { color: DashboardColors.grayDark, fontSize: FontSize.sm, fontWeight: '800' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: DashboardColors.surfaceSoft,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  favoriteMark: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
  favoriteLabel: { flex: 1, fontSize: FontSize.sm, color: DashboardColors.ink, fontWeight: '800' },
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  managementCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 76,
    backgroundColor: DashboardColors.surfaceSoft,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  managementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  managementTitle: { fontSize: FontSize.md, color: DashboardColors.ink, fontWeight: '900' },
  managementArrow: { fontSize: FontSize.xl, color: DashboardColors.gray, fontWeight: '900', lineHeight: 22 },
  managementSub: { fontSize: FontSize.xs, color: DashboardColors.muted, marginTop: 2 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DashboardColors.surfaceSoft,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DashboardColors.line,
  },
  typeBar: { width: 4, alignSelf: 'stretch', backgroundColor: DashboardColors.lineStrong },
  scheduleInfo: { flex: 1, padding: Spacing.sm + 4 },
  scheduleTitle: { fontSize: FontSize.md, fontWeight: '800', color: DashboardColors.ink },
  scheduleDue: { fontSize: FontSize.xs, color: DashboardColors.muted, marginTop: 2 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DashboardColors.surfaceSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
  },
  chatIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.graySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  chatIconText: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  chatTitle: { flex: 1, fontSize: FontSize.md, color: DashboardColors.ink, fontWeight: '700' },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surface,
  },
  footerBarMobile: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  footerBrand: {
    minWidth: 0,
  },
  footerBrandText: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  footerSubText: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  footerMetaMobile: {
    justifyContent: 'flex-start',
  },
  footerMetaText: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  footerDivider: {
    color: DashboardColors.faint,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },

  activityBanner: {
    backgroundColor: DashboardColors.grayDark,
    borderColor: DashboardColors.grayDark,
  },
  activityBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityBannerKicker: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  activityBannerTitle: {
    marginTop: 4,
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: '#fff',
  },
  activityBannerSub: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: '#93C5FD',
    fontWeight: '600',
  },
  activityBannerArrow: {
    fontSize: 32,
    color: '#93C5FD',
    fontWeight: '900',
    lineHeight: 36,
  },

  panelOpen: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  managerStatusRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillOpen: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  pillClosed: { backgroundColor: DashboardColors.surfaceSoft, borderColor: DashboardColors.line },
  statusPillText: { fontSize: FontSize.sm, fontWeight: '700' },
  pillTextOpen: { color: '#16A34A' },
  pillTextClosed: { color: DashboardColors.muted },
  managerToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  toggleOpen: { backgroundColor: DashboardColors.grayDark },
  toggleClose: { backgroundColor: '#EF4444' },
  toggleDisabled: { opacity: 0.5 },
  managerToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
});
