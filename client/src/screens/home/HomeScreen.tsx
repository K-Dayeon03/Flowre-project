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
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useChatStore } from '../../store/useChatStore';
import { useNoticeStore } from '../../store/useNoticeStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useStoreContextStore } from '../../store/useStoreContextStore';
import { canApproveEmployees, canCreateNotices, canManageStores, canRegisterEmployees } from './homePermissions';
import { dashboardApi, HomeDashboardResponse } from '../../api/dashboardApi';
import { Employee, employeeApi } from '../../api/employeeApi';
import { AsTicket, InquiryTicket, supportApi } from '../../api/supportApi';
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

function toDateKey(value?: string | null) {
  if (!value) return '';
  return value.split('T')[0];
}

function getRecentDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}

function countByDate<T>(items: T[], keys: string[], getDate: (item: T) => string | undefined | null) {
  const counts = keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  items.forEach((item) => {
    const key = toDateKey(getDate(item));
    if (key in counts) counts[key] += 1;
  });
  return keys.map((key) => counts[key]);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

const INQUIRY_STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '답변중',
  DONE: '완료',
};

const AS_STATUS_LABEL: Record<string, string> = {
  NEW: '신규',
  IN_PROGRESS: '처리중',
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

type QueueFilter = 'ALL' | 'URGENT' | 'APPROVAL' | 'AS' | 'DUE_TODAY';

type QueueItem = {
  id: string;
  filter: QueueFilter;
  urgent: boolean;
  title: string;
  meta: string;
  value: string;
  tone: 'warning' | 'primary' | 'danger' | 'muted';
  onPress?: () => void;
};

type StoreIssue = {
  storeName: string;
  count: number;
};

const QUEUE_FILTERS: Array<{ label: string; value: QueueFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '긴급', value: 'URGENT' },
  { label: '승인', value: 'APPROVAL' },
  { label: 'AS', value: 'AS' },
  { label: '금일마감', value: 'DUE_TODAY' },
];

const DashboardColors = {
  page: Colors.background,
  surface: Colors.surface,
  surfaceSoft: Colors.surfaceMuted,
  ink: Colors.textPrimary,
  muted: Colors.textSecondary,
  faint: Colors.textMuted,
  line: Colors.border,
  lineStrong: Colors.borderStrong,
  gray: Colors.accent,
  grayDark: Colors.primary,
  graySoft: Colors.accentLight,
  shadow: 'rgba(34, 52, 55, 0.09)',
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
  const [storeActivities, setStoreActivities] = useState<StoreActivity[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [inquiries, setInquiries] = useState<InquiryTicket[]>([]);
  const [asTickets, setAsTickets] = useState<AsTicket[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeDashboardResponse | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadMyStoreStatus = useCallback(async () => {
    if (!isManager && !isHq) {
      setStoreActivities([]);
      setMyStoreActivity(null);
      return;
    }
    try {
      const list = await storeApi.getActivity();
      setStoreActivities(list);
      setMyStoreActivity(isManager && list.length > 0 ? list[0] : null);
    } catch { /* silent */ }
  }, [isHq, isManager]);

  useEffect(() => { loadMyStoreStatus(); }, [loadMyStoreStatus]);

  useEffect(() => {
    dashboardApi.getHome(3)
      .then(setHomeSummary)
      .catch(() => setHomeSummary(null));
  }, []);

  useEffect(() => {
    Promise.all([
      supportApi.getInquiries({ limit: 50 }).catch(() => [] as InquiryTicket[]),
      supportApi.getAsTickets({ limit: 50 }).catch(() => [] as AsTicket[]),
    ]).then(([nextInquiries, nextAsTickets]) => {
      setInquiries(nextInquiries);
      setAsTickets(nextAsTickets);
    });
  }, []);

  useEffect(() => {
    if (!canApproveEmployees(user?.role)) {
      setPendingEmployees([]);
      return;
    }
    employeeApi.getPending()
      .then(setPendingEmployees)
      .catch(() => setPendingEmployees([]));
  }, [user?.role]);

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
            setStoreActivities((prev) => prev.map((activity) =>
              activity.storeId === myStoreActivity.storeId ? { ...activity, operationStatus: next } : activity
            ));
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
  const asSummary = homeSummary?.asStatus ?? {
    newCount: 0,
    inProgressCount: 0,
    doneCount: 0,
    urgentCount: 0,
    completionRate: 0,
    updatedAt: '',
  };
  const recentInquiry = homeSummary?.recentInquiries?.[0];
  const approvalPendingCount = pendingEmployees.length;
  const unresolvedAsCount = asSummary.newCount + asSummary.inProgressCount;
  const openStoreCount = storeActivities.filter((activity) => activity.operationStatus === 'OPEN').length;
  const totalStoreCount = storeActivities.length;
  const asCompletionRate = clampPercent(asSummary.completionRate);
  const slaTargetRate = 80;
  const slaGap = asCompletionRate - slaTargetRate;
  const last7DateKeys = useMemo(() => getRecentDateKeys(7), []);
  const last14DateKeys = useMemo(() => getRecentDateKeys(14), []);
  const approvalTrend = useMemo(
    () => countByDate(pendingEmployees, last7DateKeys, (employee) => employee.createdAt),
    [last7DateKeys, pendingEmployees]
  );
  const asTrend = useMemo(
    () => countByDate(asTickets.filter((ticket) => ticket.status !== 'DONE'), last7DateKeys, (ticket) => ticket.createdAt),
    [asTickets, last7DateKeys]
  );
  const urgentTrend = useMemo(
    () => countByDate(asTickets.filter((ticket) => ticket.priority === 'URGENT'), last7DateKeys, (ticket) => ticket.createdAt),
    [asTickets, last7DateKeys]
  );
  const scheduleTrend = useMemo(
    () => countByDate(schedules, last7DateKeys, (schedule) => schedule.dueDate),
    [schedules, last7DateKeys]
  );
  const supportTrend = useMemo(
    () => countByDate([...inquiries, ...asTickets], last14DateKeys, (ticket) => ticket.createdAt),
    [asTickets, inquiries, last14DateKeys]
  );
  const topStoreIssues = useMemo<StoreIssue[]>(() => {
    const counts = new Map<string, number>();
    const addIssue = (storeName?: string) => {
      const key = storeName?.trim() || '매장 미지정';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };

    inquiries
      .filter((inquiry) => inquiry.status !== 'DONE')
      .forEach((inquiry) => addIssue(inquiry.storeName));
    asTickets
      .filter((ticket) => ticket.status !== 'DONE')
      .forEach((ticket) => addIssue(ticket.storeName));

    return Array.from(counts.entries())
      .map(([storeName, count]) => ({ storeName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [asTickets, inquiries]);
  const queueItems = useMemo<QueueItem[]>(() => {
    const approvalItems = pendingEmployees.slice(0, 3).map((employee) => ({
      id: `employee-${employee.id}`,
      filter: 'APPROVAL' as const,
      urgent: false,
      title: `${employee.name} 계정 승인 요청`,
      meta: `${employee.storeName} · ${employee.employeeCode}`,
      value: '승인',
      tone: 'warning' as const,
      onPress: canShowEmployeeApproval ? () => navigation.navigate('EmployeeApproval') : undefined,
    }));

    const asItems = asTickets
      .filter((ticket) => ticket.status !== 'DONE')
      .slice(0, 4)
      .map((ticket) => ({
        id: `as-${ticket.id}`,
        filter: 'AS' as const,
        urgent: ticket.priority === 'URGENT',
        title: ticket.title,
        meta: `${ticket.storeName} · ${ticket.requesterName} · ${AS_STATUS_LABEL[ticket.status]}`,
        value: ticket.priority === 'URGENT' ? '긴급' : AS_STATUS_LABEL[ticket.status],
        tone: ticket.priority === 'URGENT' ? 'danger' as const : ticket.status === 'NEW' ? 'warning' as const : 'primary' as const,
        onPress: () => navigation.navigate('Support', { initialTab: 'as-tickets' }),
      }));

    const inquiryItems = inquiries
      .filter((inquiry) => inquiry.status !== 'DONE')
      .slice(0, 3)
      .map((inquiry) => ({
        id: `inquiry-${inquiry.id}`,
        filter: 'AS' as const,
        urgent: false,
        title: inquiry.title,
        meta: `${inquiry.storeName} · ${inquiry.requesterName} · ${INQUIRY_STATUS_LABEL[inquiry.status]}`,
        value: INQUIRY_STATUS_LABEL[inquiry.status],
        tone: inquiry.status === 'PENDING' ? 'warning' as const : 'primary' as const,
        onPress: () => navigation.navigate('Support', { initialTab: 'inquiries' }),
      }));

    const dueItems = todaySchedules
      .filter((schedule) => schedule.status !== 'DONE')
      .slice(0, 3)
      .map((schedule) => ({
        id: `schedule-${schedule.id}`,
        filter: 'DUE_TODAY' as const,
        urgent: false,
        title: schedule.title,
        meta: `${schedule.assignee || '미배정'} · ${STATUS_LABEL[schedule.status]}`,
        value: '오늘',
        tone: schedule.status === 'PENDING' ? 'warning' as const : 'primary' as const,
        onPress: () => navigation.navigate('ScheduleDetail', { scheduleId: schedule.id }),
      }));

    return [...asItems.filter((item) => item.urgent), ...approvalItems, ...asItems.filter((item) => !item.urgent), ...inquiryItems, ...dueItems];
  }, [asTickets, canShowEmployeeApproval, inquiries, navigation, pendingEmployees, todaySchedules]);
  const filteredQueueItems = queueItems
    .filter((item) => queueFilter === 'ALL' || (queueFilter === 'URGENT' ? item.urgent : item.filter === queueFilter))
    .slice(0, 6);

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
          <DashboardMetric label="승인 대기" value={`${approvalPendingCount}건`} sub="직원 확인" trend={approvalTrend} />
          <DashboardMetric label="미처리 AS" value={`${unresolvedAsCount}건`} sub={`완료 ${asSummary.doneCount}건`} trend={asTrend} />
          <DashboardMetric label="긴급 문의" value={`${asSummary.urgentCount}건`} sub="즉시 확인" trend={urgentTrend} />
          <DashboardMetric label="오늘 일정" value={`${todaySchedules.length}건`} sub={inProgressCount > 0 ? `진행 중 ${inProgressCount}건` : '진행 없음'} trend={scheduleTrend} />
          <DashboardMetric label="운영 매장" value={totalStoreCount > 0 ? `${openStoreCount}/${totalStoreCount}` : '0'} sub="현재 선택 범위" />
        </View>

        {(isHq || isManager || favorites.length > 0 || canShowStoreManage || canShowEmployeeManage || canShowEmployeeApproval || canCreateNotices(user?.role)) && (
          <View style={styles.quickDock}>
            {isHq && (
              <QuickAction
                title="매장 현황"
                sub="운영 상태"
                onPress={() => navigation.navigate('StoreActivity')}
              />
            )}
            {canShowStoreManage && <QuickAction title="매장 등록" sub="코드 관리" onPress={() => navigation.navigate('StoreManage')} />}
            {canShowEmployeeManage && <QuickAction title="직원 등록" sub="아이디 발급" onPress={() => navigation.navigate('EmployeeManage')} />}
            {canShowEmployeeApproval && <QuickAction title="직원 승인" sub="대기 확인" onPress={() => navigation.navigate('EmployeeApproval')} />}
            {canCreateNotices(user?.role) && <QuickAction title="공지 작성" sub="공지 등록" onPress={() => navigation.navigate('NoticeCreate')} />}

            {isManager && (
              <View style={[styles.managerMini, myStoreActivity?.operationStatus === 'OPEN' && styles.managerMiniOpen]}>
                <View style={styles.managerMiniCopy}>
                  <Text style={styles.managerMiniLabel}>내 매장</Text>
                  <Text style={[styles.managerMiniValue, myStoreActivity?.operationStatus === 'OPEN' && styles.managerMiniValueOpen]}>
                    {myStoreActivity ? (myStoreActivity.operationStatus === 'OPEN' ? '운영 중' : '영업 종료') : '상태 없음'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.managerMiniButton, myStoreActivity?.operationStatus === 'OPEN' ? styles.managerMiniButtonClose : styles.managerMiniButtonOpen, updatingStatus && styles.toggleDisabled]}
                  onPress={handleToggleMyStore}
                  disabled={updatingStatus || !myStoreActivity}
                  activeOpacity={0.8}
                >
                  {updatingStatus
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.managerMiniButtonText}>{myStoreActivity?.operationStatus === 'OPEN' ? '종료' : '시작'}</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {favorites.length > 0 && (
              <View style={styles.favoriteDock}>
                <Text style={styles.favoriteDockTitle}>즐겨찾기</Text>
                <View style={styles.favoriteDockList}>
                  {favorites.slice(0, 3).map((favorite) => (
                    <TouchableOpacity
                      key={favorite.id}
                      style={styles.favoriteDockChip}
                      onPress={() => navigateFavorite(favorite)}
                      activeOpacity={0.84}
                    >
                      <View style={styles.favoriteMark} />
                      <Text style={styles.favoriteDockLabel} numberOfLines={1}>
                        {favorite.label ?? (favorite.targetKey ? MENU_LABEL[favorite.targetKey] : '즐겨찾기')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={[styles.dashboardGrid, responsive.isWide && styles.dashboardGridWide]}>
          <View style={[styles.dashboardMain, responsive.isWide && styles.dashboardMainWide]}>
            <View style={styles.panel}>
              <SectionHeader title="최근 14일 문의·AS 추이" />
              <TrendBars
                values={supportTrend}
                labels={last14DateKeys.map((key) => key.slice(5).replace('-', '/'))}
              />
            </View>
          </View>

          <View style={[styles.dashboardSide, responsive.isWide && styles.dashboardSideWide]}>
            <View style={styles.panel}>
              <SectionHeader title="문의 상태 분포" />
              <View style={styles.supportSummaryRow}>
                <SupportMetric label="신규 AS" value={asSummary.newCount} tone="warning" />
                <SupportMetric label="처리 중" value={asSummary.inProgressCount} tone="primary" />
                <SupportMetric label="긴급" value={asSummary.urgentCount} tone="danger" />
              </View>
              <AsStackedStatus
                newCount={asSummary.newCount}
                inProgressCount={asSummary.inProgressCount}
                doneCount={asSummary.doneCount}
              />
            </View>

            <View style={styles.panel}>
              <SectionHeader title="SLA 처리율" />
              <View style={styles.slaHeader}>
                <Text style={styles.slaValue}>{asCompletionRate}%</Text>
                <Text style={[styles.slaDelta, slaGap < 0 && styles.slaDeltaDanger]}>
                  목표 대비 {slaGap >= 0 ? '+' : ''}{slaGap}%p
                </Text>
              </View>
              <View style={styles.supportProgress}>
                <View style={[styles.supportProgressTarget, { left: `${slaTargetRate}%` as const }]} />
                <View style={[styles.supportProgressFill, { width: `${asCompletionRate}%` }]} />
              </View>
              <Text style={styles.supportMeta}>목표 {slaTargetRate}% · 완료 {asSummary.doneCount}건 · 미처리 {unresolvedAsCount}건</Text>
            </View>
          </View>
        </View>

        <View style={[styles.chartGrid, responsive.isWide && styles.chartGridWide]}>
          <View style={[styles.panel, styles.chartPanel]}>
            <SectionHeader title="매장별 미처리 이슈 TOP 5" />
            {topStoreIssues.length === 0 ? (
              <Text style={styles.chartEmpty}>미처리 이슈가 없습니다.</Text>
            ) : (
              <View style={styles.storeIssueList}>
                {topStoreIssues.map((issue) => (
                  <StoreIssueRow key={issue.storeName} issue={issue} maxCount={topStoreIssues[0]?.count ?? 1} />
                ))}
              </View>
            )}
          </View>

          <View style={[styles.panel, styles.chartPanel]}>
            <SectionHeader
              title="바로 처리 목록"
              actionLabel={canShowEmployeeApproval ? '승인 보기' : '문의/AS 보기'}
              onAction={() => navigation.navigate(canShowEmployeeApproval ? 'EmployeeApproval' : 'Support')}
            />
            <View style={styles.queueFilters}>
              {QUEUE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.queueFilter, queueFilter === filter.value && styles.queueFilterActive]}
                  onPress={() => setQueueFilter(filter.value)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.queueFilterText, queueFilter === filter.value && styles.queueFilterTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filteredQueueItems.length === 0 ? (
              <Card style={styles.panelEmptyCard}>
                <EmptyState title="처리할 큐가 없습니다." />
              </Card>
            ) : (
              <View style={styles.queueList}>
                {filteredQueueItems.map((item) => (
                  <QueueRow
                    key={item.id}
                    title={item.title}
                    meta={item.meta}
                    value={item.value}
                    tone={item.tone}
                    onPress={item.onPress}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.chartGrid, responsive.isWide && styles.chartGridWide]}>
          <View style={[styles.panel, styles.chartPanel]}>
            <SectionHeader title="오늘 일정" onAction={() => navigation.navigate('ScheduleList')} />
            {todaySchedules.length === 0 ? (
              <Card style={styles.panelEmptyCard}>
                <EmptyState title="오늘 등록된 일정이 없습니다." />
              </Card>
            ) : (
              todaySchedules.slice(0, 3).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.scheduleCard}
                  onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: s.id })}
                  activeOpacity={0.84}
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

          <View style={[styles.panel, styles.chartPanel]}>
            <SectionHeader title="공지 및 커뮤니케이션" actionLabel="공지 보기" onAction={() => navigation.navigate('NoticeList')} />
            <View style={[styles.updateGrid, responsive.isWide && styles.updateGridWide]}>
              <TouchableOpacity
                style={styles.updateBlock}
                activeOpacity={0.86}
                onPress={() => headlineNotice && navigation.navigate('NoticeDetail', { noticeId: headlineNotice.id })}
                disabled={!headlineNotice}
              >
                <View style={styles.updateHeader}>
                  <Text style={styles.updateKicker}>공지</Text>
                  {unreadNoticeCount > 0 ? <Badge label={unreadNoticeCount} color={DashboardColors.grayDark} subtle={false} /> : null}
                </View>
                {headlineNotice ? (
                  <>
                    <Text style={styles.updateTitle} numberOfLines={1}>{headlineNotice.title}</Text>
                    <Text style={styles.updateText} numberOfLines={2}>{headlineNotice.content || '내용 없음'}</Text>
                  </>
                ) : (
                  <Text style={styles.updateText}>등록된 공지가 없습니다.</Text>
                )}
              </TouchableOpacity>

              <View style={styles.updateBlock}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateKicker}>채팅</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ChatRoomList')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.updateLink}>전체 보기</Text>
                  </TouchableOpacity>
                </View>
                {rooms.length === 0 ? (
                  <Text style={styles.updateText}>참여 중인 채팅방이 없습니다.</Text>
                ) : (
                  rooms.slice(0, 2).map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.updateChatRow}
                      onPress={() => navigation.navigate('ChatRoom', { roomId: r.id, roomName: r.name, roomType: r.type })}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.updateChatType}>{r.type === 'GROUP' ? 'G' : '1:1'}</Text>
                      <Text style={styles.updateChatName} numberOfLines={1}>{r.name}</Text>
                      {r.unread > 0 ? <Badge label={r.unread} color={DashboardColors.grayDark} subtle={false} /> : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
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

function DashboardMetric({ label, value, sub, trend }: { label: string; value: string | number; sub?: string; trend?: number[] }) {
  const trendDelta = trend && trend.length >= 2 ? trend[trend.length - 1] - trend[trend.length - 2] : null;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricAccent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub != null ? <Text style={styles.metricSub}>{sub}</Text> : null}
      {trend ? (
        <View style={styles.metricTrendRow}>
          <MiniSparkBars values={trend} />
          {trendDelta != null ? (
            <Text style={styles.metricDelta}>
              전일 {trendDelta >= 0 ? '+' : ''}{trendDelta}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MiniSparkBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.sparkline}>
      {values.map((value, index) => (
        <View
          key={`${index}-${value}`}
          style={[styles.sparkBar, { height: Math.max(4, Math.round((value / max) * 18)) }]}
        />
      ))}
    </View>
  );
}

function QuickAction({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.84}>
      <View style={styles.quickActionMark} />
      <View style={styles.quickActionCopy}>
        <Text style={styles.quickActionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.quickActionSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={styles.quickActionArrow}>›</Text>
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

function QueueRow({
  title,
  meta,
  value,
  tone,
  onPress,
}: {
  title: string;
  meta: string;
  value: string;
  tone: 'warning' | 'primary' | 'danger' | 'muted';
  onPress?: () => void;
}) {
  const color = tone === 'warning'
    ? Colors.warning
    : tone === 'danger'
      ? Colors.error
      : tone === 'primary'
        ? Colors.primary
        : Colors.textMuted;
  const content = (
    <>
      <View style={[styles.queueTone, { backgroundColor: color }]} />
      <View style={styles.queueCopy}>
        <Text style={styles.queueTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.queueMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Text style={[styles.queueValue, { color }]}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.queueRow} onPress={onPress} activeOpacity={0.84}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.queueRow}>{content}</View>;
}

function SupportMetric({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'primary' | 'danger' }) {
  const color = tone === 'warning' ? Colors.warning : tone === 'danger' ? Colors.error : Colors.primary;
  return (
    <View style={styles.supportMetric}>
      <Text style={[styles.supportMetricValue, { color }]}>{value}</Text>
      <Text style={styles.supportMetricLabel}>{label}</Text>
    </View>
  );
}

function AsStackedStatus({
  newCount,
  inProgressCount,
  doneCount,
}: {
  newCount: number;
  inProgressCount: number;
  doneCount: number;
}) {
  const total = Math.max(newCount + inProgressCount + doneCount, 1);
  const segments = [
    { label: '신규', value: newCount, style: styles.asSegmentNew },
    { label: '처리중', value: inProgressCount, style: styles.asSegmentProgress },
    { label: '완료', value: doneCount, style: styles.asSegmentDone },
  ];

  return (
    <View style={styles.asStatusBlock}>
      <View style={styles.asStackedBar}>
        {segments.map((segment) => (
          <View
            key={segment.label}
            style={[
              styles.asSegment,
              segment.style,
              { width: `${Math.max((segment.value / total) * 100, segment.value > 0 ? 8 : 0)}%` as const },
            ]}
          />
        ))}
      </View>
      <View style={styles.asLegend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.asLegendItem}>
            <View style={[styles.asLegendDot, segment.style]} />
            <Text style={styles.asLegendText}>{segment.label} {segment.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendBars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.trendChart}>
      <View style={styles.trendBars}>
        {values.map((value, index) => (
          <View key={`${labels[index]}-${index}`} style={styles.trendColumn}>
            <Text style={styles.trendValue}>{value > 0 ? value : ''}</Text>
            <View style={styles.trendTrack}>
              <View style={[styles.trendFill, { height: Math.max(5, Math.round((value / max) * 82)) }]} />
            </View>
            {index % 3 === 0 || index === values.length - 1 ? (
              <Text style={styles.trendLabel}>{labels[index]}</Text>
            ) : (
              <Text style={styles.trendLabel}> </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function StoreIssueRow({ issue, maxCount }: { issue: StoreIssue; maxCount: number }) {
  const width = `${Math.max((issue.count / Math.max(maxCount, 1)) * 100, 8)}%` as const;
  return (
    <View style={styles.storeIssueRow}>
      <View style={styles.storeIssueHeader}>
        <Text style={styles.storeIssueName} numberOfLines={1}>{issue.storeName}</Text>
        <Text style={styles.storeIssueCount}>{issue.count}건</Text>
      </View>
      <View style={styles.storeIssueTrack}>
        <View style={[styles.storeIssueFill, { width }]} />
      </View>
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
  quickDock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surface,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  quickActionMark: {
    width: 7,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
  quickActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickActionTitle: {
    color: DashboardColors.ink,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  quickActionSub: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  quickActionArrow: {
    color: DashboardColors.gray,
    fontSize: FontSize.lg,
    fontWeight: '900',
    lineHeight: 20,
  },
  managerMini: {
    flexGrow: 1,
    flexBasis: 210,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  managerMiniOpen: {
    borderColor: Colors.success + '50',
    backgroundColor: Colors.success + '10',
  },
  managerMiniCopy: {
    flex: 1,
    minWidth: 0,
  },
  managerMiniLabel: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  managerMiniValue: {
    marginTop: 2,
    color: DashboardColors.ink,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  managerMiniValueOpen: {
    color: Colors.success,
  },
  managerMiniButton: {
    minWidth: 52,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  managerMiniButtonOpen: {
    backgroundColor: DashboardColors.grayDark,
  },
  managerMiniButtonClose: {
    backgroundColor: Colors.error,
  },
  managerMiniButtonText: {
    color: DashboardColors.surface,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  favoriteDock: {
    flexGrow: 1,
    flexBasis: 260,
    minHeight: 56,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  favoriteDockTitle: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  favoriteDockList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  favoriteDockChip: {
    flexGrow: 1,
    flexBasis: 74,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.surface,
    borderWidth: 1,
    borderColor: DashboardColors.line,
  },
  favoriteDockLabel: {
    flex: 1,
    minWidth: 0,
    color: DashboardColors.ink,
    fontSize: FontSize.xs,
    fontWeight: '800',
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
  metricTrendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sparkline: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  sparkBar: {
    width: 7,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.lineStrong,
  },
  metricDelta: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '900',
    paddingBottom: 1,
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
  queueFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  queueFilter: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  queueFilterActive: {
    borderColor: DashboardColors.grayDark,
    backgroundColor: DashboardColors.grayDark,
  },
  queueFilterText: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  queueFilterTextActive: {
    color: DashboardColors.surface,
  },
  queueList: {
    gap: Spacing.sm,
  },
  queueRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  queueTone: {
    width: 7,
    height: 32,
    borderRadius: Radius.full,
  },
  queueCopy: {
    flex: 1,
    minWidth: 0,
  },
  queueTitle: {
    color: DashboardColors.ink,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  queueMeta: {
    marginTop: 2,
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  queueValue: {
    minWidth: 58,
    textAlign: 'right',
    fontSize: FontSize.md,
    fontWeight: '900',
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
  supportSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  supportMetric: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  supportMetricValue: {
    fontSize: FontSize.xl,
    fontWeight: '900',
  },
  supportMetricLabel: {
    marginTop: 2,
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  asStatusBlock: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  asStackedBar: {
    height: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  asSegment: {
    height: 12,
  },
  asSegmentNew: {
    backgroundColor: Colors.warning,
  },
  asSegmentProgress: {
    backgroundColor: Colors.primary,
  },
  asSegmentDone: {
    backgroundColor: Colors.success,
  },
  asLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  asLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  asLegendDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
  },
  asLegendText: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  supportProgress: {
    height: 7,
    marginTop: Spacing.md,
    borderRadius: Radius.full,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: DashboardColors.surfaceSoft,
  },
  supportProgressTarget: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 2,
    zIndex: 2,
    backgroundColor: Colors.error,
  },
  supportProgressFill: {
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
  slaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  slaValue: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    lineHeight: 38,
  },
  slaDelta: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: '900',
    paddingBottom: 6,
  },
  slaDeltaDanger: {
    color: Colors.error,
  },
  supportMeta: {
    marginTop: Spacing.xs,
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  inquiryPreview: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: DashboardColors.line,
  },
  inquiryPreviewLabel: {
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '900',
    marginBottom: Spacing.xs,
  },
  inquiryPreviewRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inquiryPreviewText: {
    flex: 1,
    minWidth: 0,
  },
  inquiryPreviewTitle: {
    color: DashboardColors.ink,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  inquiryPreviewMeta: {
    marginTop: 2,
    color: DashboardColors.muted,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  inquiryEmpty: {
    color: DashboardColors.muted,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  updateGrid: {
    gap: Spacing.sm,
  },
  updateGridWide: {
    flexDirection: 'row',
  },
  updateBlock: {
    flex: 1,
    minWidth: 220,
    minHeight: 112,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DashboardColors.line,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  updateKicker: {
    fontSize: FontSize.xs,
    fontWeight: '900',
    color: DashboardColors.grayDark,
    letterSpacing: 0,
  },
  updateTitle: {
    fontSize: FontSize.md,
    color: DashboardColors.ink,
    fontWeight: '900',
  },
  updateText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: DashboardColors.muted,
    lineHeight: 19,
  },
  updateLink: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  updateChatRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: DashboardColors.line,
  },
  updateChatType: {
    width: 28,
    color: DashboardColors.grayDark,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  updateChatName: {
    flex: 1,
    minWidth: 0,
    color: DashboardColors.ink,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  favoriteMark: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
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
  chartGrid: {
    gap: Spacing.md,
  },
  chartGridWide: {
    flexDirection: 'row',
  },
  chartPanel: {
    flex: 1,
    minWidth: 0,
  },
  trendChart: {
    minHeight: 150,
  },
  trendBars: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  trendColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    height: 16,
    color: DashboardColors.grayDark,
    fontSize: 10,
    fontWeight: '900',
  },
  trendTrack: {
    width: '100%',
    maxWidth: 18,
    height: 86,
    justifyContent: 'flex-end',
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: DashboardColors.surfaceSoft,
  },
  trendFill: {
    width: '100%',
    borderTopLeftRadius: Radius.full,
    borderTopRightRadius: Radius.full,
    backgroundColor: DashboardColors.gray,
  },
  trendLabel: {
    height: 14,
    color: DashboardColors.faint,
    fontSize: 9,
    fontWeight: '800',
  },
  chartEmpty: {
    minHeight: 120,
    textAlignVertical: 'center',
    color: DashboardColors.muted,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  storeIssueList: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  storeIssueRow: {
    gap: Spacing.xs,
  },
  storeIssueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  storeIssueName: {
    flex: 1,
    minWidth: 0,
    color: DashboardColors.ink,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  storeIssueCount: {
    color: DashboardColors.grayDark,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  storeIssueTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.surfaceSoft,
  },
  storeIssueFill: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: DashboardColors.lineStrong,
  },
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
  toggleDisabled: { opacity: 0.5 },
});
