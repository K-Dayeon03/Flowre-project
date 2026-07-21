import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { AddressSearchResult, OperationStatus, Store, StoreActivity, storeApi } from '../../api/storeApi';
import { Schedule, ScheduleType, scheduleApi } from '../../api/scheduleApi';
import { Notice, noticeApi } from '../../api/noticeApi';
import { Document, DocumentCategory, documentApi } from '../../api/documentApi';
import { ChatRoom, Message, chatApi } from '../../api/chatApi';
import { InventoryItem, inventoryApi } from '../../api/inventoryApi';
import { AssignableRole, Employee, employeeApi } from '../../api/employeeApi';
import { dashboardApi, HomeDashboardResponse } from '../../api/dashboardApi';
import { supportApi, InquiryTicket, AsTicket, InquiryStatus, AsTicketStatus } from '../../api/supportApi';
import { useAuthStore } from '../../store/useAuthStore';
import { logger } from '../../utils/logger';

type NavId = 'home' | 'stores' | 'employees' | 'documents' | 'chat' | 'notices' | 'inventory' | 'schedule' | 'support' | 'profile' | 'settings';

const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'stores', label: '매장 관리' },
  { id: 'employees', label: '직원 관리' },
  { id: 'documents', label: '문서' },
  { id: 'chat', label: '채팅' },
  { id: 'notices', label: '공지' },
  { id: 'inventory', label: '재고' },
  { id: 'schedule', label: '스케줄' },
  { id: 'support', label: '문의·AS' },
];

const ACCOUNT_NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'profile', label: '프로필' },
  { id: 'settings', label: '설정' },
];

const SECTION_TITLE: Record<NavId, string> = {
  home: '대시보드',
  stores: '매장 관리',
  employees: '직원 관리',
  documents: '문서 관리',
  chat: '채팅',
  notices: '공지사항',
  inventory: '재고 관리',
  schedule: '스케줄',
  support: '문의 & AS 접수',
  profile: '프로필',
  settings: '설정',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

const TYPE_LABEL: Record<string, string> = {
  MANNEQUIN: '마네킹',
  HQ_VISIT: '본사 방문',
  VM_CHECK: 'VM 체크',
  OTHER: '기타',
};

const DOC_CATEGORY_LABEL: Record<string, string> = {
  MANUAL: '매뉴얼',
  NOTICE: '공지',
  REPORT: '리포트',
};

const DOC_CATEGORIES: Array<{ key: DocumentCategory; label: string }> = [
  { key: 'MANUAL', label: '매뉴얼' },
  { key: 'NOTICE', label: '공지' },
  { key: 'REPORT', label: '리포트' },
];

const SCHEDULE_TYPES: Array<{ key: ScheduleType; label: string }> = [
  { key: 'MANNEQUIN', label: '마네킹 교체' },
  { key: 'HQ_VISIT', label: '본사 방문' },
  { key: 'VM_CHECK', label: 'VM 점검' },
  { key: 'OTHER', label: '기타' },
];

/** 날짜 문자열을 현재 시각 기준 상대 시간으로 변환합니다. */
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '활동 없음';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

/** 백분율을 0~100 범위로 보정합니다. */
function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** ISO 날짜 문자열에서 날짜만 표시합니다. */
function dateOnly(value?: string): string {
  if (!value) return '-';
  return value.split('T')[0];
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 날짜를 YYYY-MM-DD 키로 변환합니다. */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 날짜를 스케줄 화면용 긴 라벨로 변환합니다. */
function formatScheduleDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

/** 날짜를 월 라벨로 변환합니다. */
function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

/** ISO 일시에서 시간만 표시합니다. */
function formatScheduleTime(value?: string): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.includes('T') ? value.split('T')[1].slice(0, 5) : '00:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 월간 달력 셀을 생성합니다. */
function buildCalendarCells(monthDate: Date): Array<{ key: string; day: number | null; date?: Date }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}`, day: null }));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return { key: toDateKey(date), day: index + 1, date };
  });
  return [...blanks, ...days];
}

/** 파일명으로 업로드 Content-Type을 추론합니다. */
function inferContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

/** 사용자 권한 코드를 화면 표시명으로 변환합니다. */
function roleLabel(role: string): string {
  if (role === 'ADMIN') return '관리자';
  if (role === 'HQ_STAFF') return '본사';
  if (role === 'STORE_MANAGER') return '점장';
  return '직원';
}

/** 직원 상태 코드를 화면 표시명으로 변환합니다. */
function statusLabel(status: string): string {
  if (status === 'ACTIVE') return '활성';
  if (status === 'PENDING') return '승인 대기';
  if (status === 'REJECTED') return '거절';
  if (status === 'INACTIVE') return '비활성';
  return status;
}

export default function StoreManagementDashboard({ initialSection = 'home' }: { initialSection?: NavId }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [active, setActive] = useState<NavId>(initialSection);
  const [activities, setActivities] = useState<StoreActivity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [homeSummary, setHomeSummary] = useState<HomeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStoreId, setUpdatingStoreId] = useState<number | null>(null);
  const [supportTab, setSupportTab] = useState<'inquiries' | 'as-tickets'>('inquiries');

  const isHq = user?.role === 'HQ_STAFF' || user?.role === 'ADMIN';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [activityResult, scheduleResult, unreadResult, homeResult] = await Promise.all([
        storeApi.getActivity().catch(() => [] as StoreActivity[]),
        scheduleApi.getList().catch(() => [] as Schedule[]),
        noticeApi.getUnreadCount().catch(() => 0),
        dashboardApi.getHome(3).catch(() => null),
      ]);
      setActivities(activityResult);
      setSchedules(scheduleResult);
      setUnreadNotices(unreadResult);
      setHomeSummary(homeResult);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalSchedules = schedules.length;
  const doneSchedules = schedules.filter((schedule) => schedule.status === 'DONE').length;
  const pendingSchedules = schedules.filter((schedule) => schedule.status === 'PENDING').length;
  const inProgressSchedules = schedules.filter((schedule) => schedule.status === 'IN_PROGRESS').length;
  const openStoreCount = activities.filter((activity) => activity.operationStatus === 'OPEN').length;
  const completionRate = totalSchedules > 0 ? Math.round((doneSchedules / totalSchedules) * 100) : 0;

  const chartItems = useMemo(() => {
    return activities.slice(0, 7).map((activity) => {
      const rate = activity.todayScheduleTotal > 0
        ? Math.round((activity.todayScheduleDone / activity.todayScheduleTotal) * 100)
        : 0;
      return { ...activity, rate: clampPercent(rate) };
    });
  }, [activities]);

  /** 매장 운영 상태를 백엔드에 저장하고 현재 테이블에 반영합니다. */
  const handleToggleStatus = (activity: StoreActivity) => {
    const next: OperationStatus = activity.operationStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const label = next === 'OPEN' ? '운영 시작' : '영업 종료';
    Alert.alert(activity.storeName, `${label}으로 변경하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          setUpdatingStoreId(activity.storeId);
          try {
            await storeApi.updateOperationStatus(activity.storeId, next);
            setActivities((prev) =>
              prev.map((item) => item.storeId === activity.storeId ? { ...item, operationStatus: next } : item)
            );
          } catch {
            Alert.alert('오류', '운영 상태를 변경하지 못했습니다.');
          } finally {
            setUpdatingStoreId(null);
          }
        },
      },
    ]);
  };

  /** 현재 선택된 콘솔 섹션을 렌더링합니다. */
  const renderSection = () => {
    if (active === 'home') {
      return loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <HomeSection
          activities={activities}
          chartItems={chartItems}
          completionRate={completionRate}
          doneSchedules={doneSchedules}
          inProgressSchedules={inProgressSchedules}
          isHq={isHq}
          openStoreCount={openStoreCount}
          pendingSchedules={pendingSchedules}
          recentInquiries={homeSummary?.recentInquiries ?? []}
          asStatus={homeSummary?.asStatus ?? null}
          schedules={schedules}
          totalSchedules={totalSchedules}
          unreadNotices={unreadNotices}
          isWide={isWide}
          onViewAllStores={() => setActive('stores')}
          onViewAllInquiries={() => { setSupportTab('inquiries'); setActive('support'); }}
          onViewAllAsTickets={() => { setSupportTab('as-tickets'); setActive('support'); }}
        />
      );
    }

    if (active === 'stores') return <StoresAdminSection activities={activities} onToggleStatus={handleToggleStatus} onReload={loadDashboard} updatingStoreId={updatingStoreId} />;
    if (active === 'support') return <SupportSection initialTab={supportTab} />;
    if (active === 'employees') return <EmployeesAdminSection onNavigateToStores={() => setActive('stores')} />;
    if (active === 'documents') return <DocumentsSection />;
    if (active === 'chat') return <ChatSection />;
    if (active === 'notices') return <NoticesSection />;
    if (active === 'inventory') return <InventorySection />;
    if (active === 'schedule') return <ScheduleSection />;
    if (active === 'profile') return <ProfileSection userName={user?.name ?? ''} role={user?.role ?? ''} storeName={user?.storeName ?? '브랜드'} />;
    return <SettingsSection onRefresh={loadDashboard} onLogout={logout} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, !isWide && styles.shellMobile]}>
        {isWide ? (
          <Sidebar
            active={active}
            userName={user?.name ?? ''}
            role={user?.role ?? ''}
            storeName={user?.storeName ?? ''}
            onSelect={setActive}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNav}>
            {[...NAV_ITEMS.filter((item) => item.id !== 'stores' || isHq), ...ACCOUNT_NAV_ITEMS].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.mobileNavItem, active === item.id && styles.mobileNavActive]}
                onPress={() => setActive(item.id)}
                activeOpacity={0.82}
              >
                <Text style={[styles.mobileNavText, active === item.id && styles.mobileNavTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={styles.sectionTitle}>{SECTION_TITLE[active]}</Text>
          {renderSection()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function HomeSection({
  activities,
  chartItems,
  completionRate,
  doneSchedules,
  inProgressSchedules,
  isHq,
  isWide,
  openStoreCount,
  pendingSchedules,
  recentInquiries,
  asStatus,
  schedules,
  totalSchedules,
  unreadNotices,
  onViewAllStores,
  onViewAllInquiries,
  onViewAllAsTickets,
}: {
  activities: Array<StoreActivity>;
  chartItems: Array<StoreActivity & { rate: number }>;
  completionRate: number;
  doneSchedules: number;
  inProgressSchedules: number;
  isHq: boolean;
  isWide: boolean;
  openStoreCount: number;
  pendingSchedules: number;
  recentInquiries: Array<{ id: number; storeName: string; requesterName: string; title: string; status: 'PENDING' | 'IN_PROGRESS' | 'DONE'; createdAt: string }>;
  asStatus: {
    newCount: number;
    inProgressCount: number;
    doneCount: number;
    urgentCount: number;
    completionRate: number;
    updatedAt: string;
  } | null;
  schedules: Schedule[];
  totalSchedules: number;
  unreadNotices: number;
  onViewAllStores: () => void;
  onViewAllInquiries: () => void;
  onViewAllAsTickets: () => void;
}) {
  const openActivities = activities.filter((a) => a.operationStatus === 'OPEN');

  const inquiryStatusLabel: Record<'PENDING' | 'IN_PROGRESS' | 'DONE', string> = {
    PENDING: '대기',
    IN_PROGRESS: '답변중',
    DONE: '완료',
  };
  const asSummary = asStatus ?? {
    newCount: 0,
    inProgressCount: 0,
    doneCount: 0,
    urgentCount: 0,
    completionRate: 0,
    updatedAt: new Date().toISOString(),
  };

  return (
    <>
      <View style={[styles.kpiGrid, isWide && styles.kpiGridWide]}>
        <KpiCard label="전체 스케줄" value={String(totalSchedules)} unit={`완료율 ${completionRate}%`} tone="info" />
        <KpiCard label="미완료 스케줄" value={String(pendingSchedules + inProgressSchedules)} unit="건" tone="warning" />
        <KpiCard label="미확인 공지" value={String(unreadNotices)} unit="건" tone="primary" />
      </View>

      {isHq ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>운영 중 매장</Text>
            <TouchableOpacity onPress={onViewAllStores} style={styles.smallOutlineAction} activeOpacity={0.8}>
              <Text style={styles.smallOutlineActionText}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          {openActivities.length === 0 ? (
            <Text style={styles.emptyText}>운영 중인 매장이 없습니다.</Text>
          ) : (
            openActivities.slice(0, 3).map((activity) => {
              const rate = activity.todayScheduleTotal > 0
                ? Math.round((activity.todayScheduleDone / activity.todayScheduleTotal) * 100)
                : 0;
              return (
                <View key={activity.storeId} style={styles.storeRow}>
                  <View style={styles.storeMain}>
                    <Text style={styles.storeName}>{activity.storeName}</Text>
                    <Text style={styles.storeCode}>{activity.storeCode}</Text>
                  </View>
                  <View style={[styles.statusPill, styles.statusOpen]}>
                    <Text style={[styles.statusText, styles.statusOpenText]}>운영 중</Text>
                  </View>
                  <Text style={styles.tableText}>{timeAgo(activity.lastActivityAt)}</Text>
                  <Text style={styles.tableText}>{activity.todayScheduleDone}/{activity.todayScheduleTotal}건</Text>
                  <View style={styles.rateCell}>
                    <View style={styles.rateTrack}>
                      <View style={[styles.rateFill, { width: `${clampPercent(rate)}%` }]} />
                    </View>
                    <Text style={styles.rateText}>{rate}%</Text>
                  </View>
                  <Text style={styles.tableText}>{activity.activeStaffCount}명</Text>
                </View>
              );
            })
          )}
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>업무 상태</Text>
          <View style={styles.statusGrid}>
            <StatusCount label="대기" value={pendingSchedules} color={Colors.textMuted} />
            <StatusCount label="진행 중" value={inProgressSchedules} color={Colors.info} />
            <StatusCount label="완료" value={doneSchedules} color={Colors.success} />
          </View>
        </View>
      )}

      <View style={[styles.lowerGrid, isWide && styles.lowerGridWide]}>
        <View style={[styles.panel, isWide && styles.chartPanel]}>
          <Text style={styles.panelTitle}>매장별 오늘 스케줄 현황</Text>
          <Text style={styles.panelMeta}>완료 vs 전체</Text>
          {chartItems.length === 0 ? (
            <Text style={styles.emptyText}>데이터가 없습니다.</Text>
          ) : (
            chartItems.map((activity) => (
              <View key={activity.storeId} style={styles.chartRow}>
                <Text style={styles.chartLabel} numberOfLines={1}>{activity.storeName.replace('점', '')}</Text>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartDone, { width: `${activity.rate}%` }]} />
                </View>
                <Text style={styles.chartValue}>{activity.todayScheduleDone}/{activity.todayScheduleTotal}</Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.panel, isWide && styles.recentPanel]}>
          <Text style={styles.panelTitle}>최근 스케줄</Text>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>스케줄이 없습니다.</Text>
          ) : (
            schedules.slice(0, 6).map((schedule) => (
              <View key={schedule.id} style={styles.scheduleRow}>
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleTitle, schedule.status === 'DONE' && styles.doneSchedule]} numberOfLines={1}>
                    {schedule.title}
                  </Text>
                  <Text style={styles.scheduleMeta}>
                    {TYPE_LABEL[schedule.type]} · {schedule.assignee || '미배정'}
                  </Text>
                </View>
                <View style={styles.scheduleBadge}>
                  <Text style={styles.scheduleBadgeText}>{STATUS_LABEL[schedule.status]}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={[styles.lowerGrid, isWide && styles.lowerGridWide]}>
        <View style={[styles.panel, isWide && styles.recentPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>최근 문의</Text>
            <TouchableOpacity onPress={onViewAllInquiries} style={styles.smallOutlineAction} activeOpacity={0.8}>
              <Text style={styles.smallOutlineActionText}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          {recentInquiries.length === 0 ? (
            <Text style={styles.emptyText}>문의가 없습니다.</Text>
          ) : recentInquiries.map((item) => (
            <View key={item.id} style={styles.supportRow}>
              <View style={styles.supportMain}>
                <Text style={styles.supportTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.supportMeta}>{item.storeName} · {item.requesterName} · {timeAgo(item.createdAt)}</Text>
              </View>
              <BadgeText label={inquiryStatusLabel[item.status]} tone={item.status === 'PENDING' ? 'warning' : undefined} />
            </View>
          ))}
        </View>

        <View style={[styles.panel, isWide && styles.chartPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>AS 접수 현황</Text>
            <TouchableOpacity onPress={onViewAllAsTickets} style={styles.smallOutlineAction} activeOpacity={0.8}>
              <Text style={styles.smallOutlineActionText}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.asStatusGrid}>
            <View style={styles.asStatusCard}>
              <Text style={styles.asStatusLabel}>신규 접수</Text>
              <Text style={[styles.asStatusValue, { color: Colors.warning }]}>{asSummary.newCount}</Text>
            </View>
            <View style={styles.asStatusCard}>
              <Text style={styles.asStatusLabel}>처리 중</Text>
              <Text style={[styles.asStatusValue, { color: Colors.primary }]}>{asSummary.inProgressCount}</Text>
            </View>
            <View style={styles.asStatusCard}>
              <Text style={styles.asStatusLabel}>완료</Text>
              <Text style={[styles.asStatusValue, { color: Colors.accent }]}>{asSummary.doneCount}</Text>
            </View>
          </View>
          <View style={styles.asProgressTrack}>
            <View style={[styles.asProgressFill, { width: `${asSummary.completionRate}%` }]} />
          </View>
          <Text style={styles.panelMeta}>평균 처리율 {asSummary.completionRate}% · 긴급 {asSummary.urgentCount}건</Text>
        </View>
      </View>
    </>
  );
}

function StoresAdminSection({
  activities,
  onReload,
  onToggleStatus,
  updatingStoreId,
}: {
  activities: StoreActivity[];
  onReload: () => void;
  onToggleStatus: (activity: StoreActivity) => void;
  updatingStoreId: number | null;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeName, setStoreName] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchResult | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [detailAddress, setDetailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStores = useCallback(() => {
    setLoading(true);
    storeApi.getList()
      .then(setStores)
      .catch((err) => {
        logger.warn('[Stores] loadStores 실패:', err);
        setStores([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    setSearchingAddress(true);
    setAddressResults([]);
    try {
      const results = await storeApi.searchAddresses(addressQuery.trim());
      setAddressResults(results);
      if (results.length === 0) Alert.alert('검색 결과 없음', '다른 검색어를 입력해보세요.');
    } catch {
      Alert.alert('오류', '주소 검색에 실패했습니다.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectAddress = (result: AddressSearchResult) => {
    setSelectedAddress(result);
    setAddressQuery(result.roadAddress);
    setAddressResults([]);
  };

  const resetForm = () => {
    setStoreName('');
    setAddressQuery('');
    setAddressResults([]);
    setSelectedAddress(null);
    setDetailAddress('');
  };

  const handleCreateStore = async () => {
    if (!storeName.trim() || !selectedAddress) {
      Alert.alert('입력 필요', '매장명과 주소를 검색해 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      await storeApi.create({
        storeName: storeName.trim(),
        postalCode: selectedAddress.postalCode,
        roadAddress: selectedAddress.roadAddress,
        jibunAddress: selectedAddress.jibunAddress,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        detailAddress: detailAddress.trim() || undefined,
      });
      resetForm();
      loadStores();
      onReload();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '매장 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>매장 등록</Text>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInputWide} value={storeName} onChangeText={setStoreName} placeholder="매장명" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.addressSearchRow}>
          <TextInput
            style={[styles.formInputWide, styles.addressSearchInput]}
            value={addressQuery}
            onChangeText={(text) => {
              setAddressQuery(text);
              if (selectedAddress && text !== selectedAddress.roadAddress) setSelectedAddress(null);
            }}
            placeholder="도로명·지번 주소 검색"
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={searchAddress}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, searchingAddress && styles.disabled]}
            onPress={searchAddress}
            disabled={searchingAddress}
            activeOpacity={0.82}
          >
            <Text style={styles.searchBtnText}>{searchingAddress ? '...' : '검색'}</Text>
          </TouchableOpacity>
        </View>
        {addressResults.length > 0 ? (
          <View style={styles.addressDropdown}>
            {addressResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.addressItem}
                onPress={() => selectAddress(result)}
                activeOpacity={0.82}
              >
                <Text style={styles.addressItemRoad}>{result.roadAddress}</Text>
                <Text style={styles.addressItemMeta}>{result.postalCode} · {result.jibunAddress}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : selectedAddress ? (
          <View style={styles.addressFilledRow}>
            <View style={styles.addressFilledInfo}>
              <Text style={styles.addressFilledRoad}>{selectedAddress.roadAddress}</Text>
              <Text style={styles.addressFilledMeta}>{selectedAddress.postalCode}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedAddress(null); setAddressQuery(''); }}>
              <Text style={styles.addressClearBtn}>변경</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.formGrid}>
          <TextInput style={styles.formInputWide} value={detailAddress} onChangeText={setDetailAddress} placeholder="상세 주소 (동·호수 등)" placeholderTextColor={Colors.textMuted} />
        </View>
        <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={handleCreateStore} disabled={saving}>
          <Text style={styles.primaryActionText}>{saving ? '등록 중...' : '매장 등록'}</Text>
        </TouchableOpacity>
      </View>

      <DataPanel loading={loading} empty={stores.length === 0} emptyText="등록된 매장이 없습니다.">
        {stores.map((store) => {
          const activity = activities.find((item) => item.storeId === store.id);
          const isOpen = (activity?.operationStatus ?? store.operationStatus) === 'OPEN';
          return (
            <View key={store.id} style={styles.dataRow}>
              <View style={styles.dataMain}>
                <Text style={styles.dataTitle}>{store.storeName}</Text>
                <Text style={styles.dataMeta}>{store.storeCode} · {store.roadAddress ?? '주소 없음'}</Text>
              </View>
              <BadgeText label={isOpen ? '운영 중' : '영업 종료'} tone={isOpen ? undefined : 'warning'} />
              <Text style={styles.tableText}>
                {activity?.dailySales != null ? `₩${activity.dailySales.toLocaleString()}` : '—'}
              </Text>
              {activity ? (
                <TouchableOpacity
                  style={[styles.smallAction, isOpen ? styles.closeAction : styles.openAction, updatingStoreId === store.id && styles.disabled]}
                  onPress={() => onToggleStatus(activity)}
                  disabled={updatingStoreId === store.id}
                >
                  <Text style={styles.smallActionText}>{isOpen ? '종료' : '시작'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </DataPanel>
    </View>
  );
}

function EmployeesAdminSection({ onNavigateToStores }: { onNavigateToStores?: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AssignableRole>('STORE_STAFF');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<AssignableRole>('STORE_STAFF');
  const [resetPassword, setResetPassword] = useState('');

  const selectedStore = stores.find((s) => s.storeCode === storeCode);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    employeeApi.getList()
      .then(setEmployees)
      .catch((err) => {
        logger.warn('[Employees] loadEmployees 실패:', err);
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEmployees();
    storeApi.getList().then(setStores).catch((err) => {
      logger.warn('[Employees] loadStores 실패:', err);
      setStores([]);
    });
  }, [loadEmployees]);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !storeCode.trim() || !employeeCode.trim() || password.length < 8) {
      Alert.alert('입력 필요', '이름, 이메일, 점별 코드, 직원 아이디, 8자 이상 비밀번호를 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await employeeApi.create({
        name: name.trim(),
        email: email.trim(),
        storeCode: storeCode.trim(),
        employeeCode: employeeCode.trim(),
        password,
        role,
      });
      setName('');
      setEmail('');
      setStoreCode('');
      setEmployeeCode('');
      setPassword('');
      setRole('STORE_STAFF');
      setStorePickerOpen(false);
      loadEmployees();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '직원 계정 발급에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setEditName(employee.name);
    setEditEmail(employee.email);
    setEditRole((employee.role === 'ADMIN' ? 'HQ_STAFF' : employee.role) as AssignableRole);
    setResetPassword('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName('');
    setEditEmail('');
    setEditRole('STORE_STAFF');
    setResetPassword('');
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('입력 필요', '이름과 이메일을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await employeeApi.update(editing.id, { name: editName.trim(), email: editEmail.trim(), role: editRole });
      closeEdit();
      loadEmployees();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '직원 정보를 수정하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editing) return;
    if (resetPassword.length < 8) {
      Alert.alert('입력 필요', '새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setSaving(true);
    try {
      await employeeApi.resetPassword(editing.id, resetPassword);
      setResetPassword('');
      Alert.alert('완료', '비밀번호를 초기화했습니다.');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '비밀번호 초기화에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateCode = async (employee: Employee) => {
    try {
      const result = await employeeApi.rotateCode(employee.id);
      Alert.alert('코드 로테이션 완료', `새 직원 아이디: ${result.newEmployeeCode}`);
      loadEmployees();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '직원 코드 로테이션에 실패했습니다.');
    }
  };

  const handleDelete = (employee: Employee) => {
    Alert.alert('계정 비활성화', `"${employee.name}" 계정을 비활성화할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '비활성화',
        style: 'destructive',
        onPress: async () => {
          try {
            await employeeApi.delete(employee.id);
            setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
            if (editing?.id === employee.id) closeEdit();
          } catch (e: any) {
            Alert.alert('오류', e?.response?.data?.error?.message ?? '계정 비활성화에 실패했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionStack}>
      <EmployeeApprovalsSection onChanged={loadEmployees} />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>직원 계정 발급</Text>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="이름" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.formInput} value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={Colors.textMuted} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={styles.storePickerWrap}>
          <TouchableOpacity
            style={styles.storePickerTrigger}
            onPress={() => setStorePickerOpen((v) => !v)}
            activeOpacity={0.82}
          >
            <Text style={selectedStore ? styles.storePickerSelected : styles.storePickerPlaceholder}>
              {selectedStore ? `${selectedStore.storeName}  (${selectedStore.storeCode})` : '매장 선택'}
            </Text>
            <Text style={styles.storePickerArrow}>{storePickerOpen ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {storePickerOpen ? (
            <View style={styles.storePickerDropdown}>
              {stores.length === 0 ? (
                <Text style={styles.emptyText}>매장 없음</Text>
              ) : stores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storePickerItem, store.storeCode === storeCode && styles.storePickerItemActive]}
                  onPress={() => {
                    setStoreCode(store.storeCode);
                    setEmployeeCode(store.storeCode);
                    setStorePickerOpen(false);
                  }}
                  activeOpacity={0.82}
                >
                  <Text style={styles.storePickerItemName}>{store.storeName}</Text>
                  <Text style={styles.storePickerItemCode}>{store.storeCode}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.storePickerRegisterItem}
                onPress={() => {
                  setStorePickerOpen(false);
                  onNavigateToStores?.();
                }}
                activeOpacity={0.82}
              >
                <Text style={styles.storePickerRegisterText}>매장 등록하기 →</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInput} value={employeeCode} onChangeText={setEmployeeCode} placeholder="직원 아이디 예: 1001ABCD!" placeholderTextColor={Colors.textMuted} autoCapitalize="none" autoCorrect={false} />
          <TextInput style={styles.formInput} value={password} onChangeText={setPassword} placeholder="초기 비밀번호" placeholderTextColor={Colors.textMuted} secureTextEntry />
        </View>
        <View style={styles.filterRow}>
          {(['STORE_STAFF', 'STORE_MANAGER', 'HQ_STAFF'] as AssignableRole[]).map((option) => (
            <TouchableOpacity key={option} style={[styles.filterButton, role === option && styles.filterButtonActive]} onPress={() => setRole(option)}>
              <Text style={[styles.filterText, role === option && styles.filterTextActive]}>{roleLabel(option)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.primaryActionText}>{saving ? '발급 중...' : '직원 발급'}</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>직원 정보 수정</Text>
          <View style={styles.formGrid}>
            <TextInput style={styles.formInput} value={editName} onChangeText={setEditName} placeholder="이름" placeholderTextColor={Colors.textMuted} />
            <TextInput style={styles.formInput} value={editEmail} onChangeText={setEditEmail} placeholder="이메일" placeholderTextColor={Colors.textMuted} />
            <TextInput style={styles.formInput} value={resetPassword} onChangeText={setResetPassword} placeholder="새 비밀번호" placeholderTextColor={Colors.textMuted} secureTextEntry />
          </View>
          <View style={styles.filterRow}>
            {(['STORE_STAFF', 'STORE_MANAGER', 'HQ_STAFF'] as AssignableRole[]).map((option) => (
              <TouchableOpacity key={option} style={[styles.filterButton, editRole === option && styles.filterButtonActive]} onPress={() => setEditRole(option)}>
                <Text style={[styles.filterText, editRole === option && styles.filterTextActive]}>{roleLabel(option)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={handleUpdate} disabled={saving}>
              <Text style={styles.primaryActionText}>수정 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallOutlineAction} onPress={handleResetPassword}>
              <Text style={styles.smallOutlineActionText}>비밀번호 초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallOutlineAction} onPress={closeEdit}>
              <Text style={styles.smallOutlineActionText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <DataPanel loading={loading} empty={employees.length === 0} emptyText="직원 계정이 없습니다.">
        {employees.map((employee) => (
          <View key={employee.id} style={styles.dataRow}>
            <View style={styles.dataMain}>
              <Text style={styles.dataTitle}>{employee.name}</Text>
              <Text style={styles.dataMeta}>{employee.employeeCode} · {employee.storeName} · {employee.email}</Text>
            </View>
            <BadgeText label={roleLabel(employee.role)} />
            <BadgeText label={statusLabel(employee.status)} tone={employee.status === 'PENDING' ? 'warning' : undefined} />
            {employee.role !== 'ADMIN' ? (
              <>
                <TouchableOpacity style={styles.smallOutlineAction} onPress={() => openEdit(employee)}>
                  <Text style={styles.smallOutlineActionText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallOutlineAction} onPress={() => handleRotateCode(employee)}>
                  <Text style={styles.smallOutlineActionText}>코드 순환</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallDangerAction} onPress={() => handleDelete(employee)}>
                  <Text style={styles.smallDangerActionText}>비활성화</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ))}
      </DataPanel>
    </View>
  );
}

function EmployeeApprovalsSection({ onChanged }: { onChanged?: () => void }) {
  const [pending, setPending] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('소속 확인 불가');

  const loadPending = useCallback(() => {
    setLoading(true);
    employeeApi.getPending()
      .then(setPending)
      .catch((err) => {
        logger.warn('[Approvals] loadPending 실패:', err);
        setPending([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const approve = async (employee: Employee) => {
    setProcessingId(employee.id);
    try {
      await employeeApi.approve(employee.id);
      setPending((prev) => prev.filter((item) => item.id !== employee.id));
      onChanged?.();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '승인에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (employee: Employee) => {
    if (!rejectReason.trim()) {
      Alert.alert('입력 필요', '거절 사유를 입력해주세요.');
      return;
    }
    setProcessingId(employee.id);
    try {
      await employeeApi.reject(employee.id, rejectReason.trim());
      setPending((prev) => prev.filter((item) => item.id !== employee.id));
      onChanged?.();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '거절에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>직원 승인</Text>
        <Text style={styles.panelMeta}>신규 가입 직원의 소속을 확인하고 승인 또는 거절합니다.</Text>
        <TextInput
          style={[styles.searchInput, styles.inlineSearchInput]}
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="거절 사유 기본값"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <DataPanel loading={loading} empty={pending.length === 0} emptyText="승인 대기 직원이 없습니다.">
        {pending.map((employee) => (
          <View key={employee.id} style={styles.dataRow}>
            <View style={styles.dataMain}>
              <Text style={styles.dataTitle}>{employee.name}</Text>
              <Text style={styles.dataMeta}>{employee.employeeCode} · {roleLabel(employee.role)} · {employee.storeName}</Text>
              <Text style={styles.dataMeta}>{employee.email}</Text>
            </View>
            <TouchableOpacity style={[styles.smallOutlineAction, processingId === employee.id && styles.disabled]} onPress={() => reject(employee)} disabled={processingId === employee.id}>
              <Text style={styles.smallOutlineActionText}>거절</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallAction, styles.openAction, processingId === employee.id && styles.disabled]} onPress={() => approve(employee)} disabled={processingId === employee.id}>
              <Text style={styles.smallActionText}>승인</Text>
            </TouchableOpacity>
          </View>
        ))}
      </DataPanel>
    </View>
  );
}

function DocumentsSection() {
  const user = useAuthStore((s) => s.user);
  const isHqDoc = user?.role === 'ADMIN' || user?.role === 'HQ_STAFF';
  const [docs, setDocs] = useState<Document[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('MANUAL');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size?: number;
    mimeType?: string;
    uri?: string;
    file?: Blob;
  } | null>(null);

  const loadDocs = useCallback(() => {
    setLoading(true);
    documentApi.getList()
      .then(setDocs)
      .catch((err) => {
        logger.warn('[Documents] loadDocs 실패:', err);
        setDocs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const filtered = docs.filter((doc) =>
    doc.title.includes(query) || doc.uploader.includes(query) || DOC_CATEGORY_LABEL[doc.category].includes(query)
  );

  const resetForm = () => {
    setShowEditor(false);
    setEditing(null);
    setTitle('');
    setCategory('MANUAL');
    setDescription('');
    setSelectedFile(null);
  };

  const openEdit = (doc: Document) => {
    setShowEditor(true);
    setEditing(doc);
    setTitle(doc.title);
    setCategory(doc.category);
    setDescription(doc.description ?? '');
    setSelectedFile(null);
  };

  const openCreate = () => {
    resetForm();
    setShowEditor(true);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: '*/*',
      });
      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      setSelectedFile({
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uri: file.uri,
        file: 'file' in file ? file.file : undefined,
      });
    } catch {
      Alert.alert('오류', '파일 선택창을 열지 못했습니다.');
    }
  };

  const saveDocument = async () => {
    if (!title.trim()) {
      Alert.alert('입력 필요', '문서 제목을 입력해주세요.');
      return;
    }
    if (!editing && !selectedFile) {
      Alert.alert('입력 필요', '업로드할 파일을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const fileName = selectedFile?.name.trim() ?? '';
      const contentType = selectedFile?.mimeType ?? (fileName ? inferContentType(fileName) : undefined);
      const presigned = fileName && contentType
        ? await documentApi.getPresignedUrl(fileName, contentType)
        : undefined;

      if (presigned && selectedFile && contentType) {
        const blob = selectedFile.file
          ?? (selectedFile.uri ? await fetch(selectedFile.uri).then((response) => response.blob()) : null);
        if (!blob) throw new Error('파일 경로를 찾을 수 없습니다.');
        await documentApi.uploadToS3(presigned.presignedUrl, blob, contentType);
      }

      const payload = {
        title: title.trim(),
        category,
        s3Key: presigned?.s3Key,
        description: description.trim() || undefined,
        fileType: contentType,
        fileSize: selectedFile?.size,
      };

      if (editing) {
        await documentApi.update(editing.id, payload);
      } else if (presigned?.s3Key) {
        await documentApi.create({ ...payload, s3Key: presigned.s3Key });
      } else {
        throw new Error('파일을 선택해주세요.');
      }
      resetForm();
      loadDocs();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? (editing ? '문서를 수정하지 못했습니다.' : '문서를 업로드하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = (doc: Document) => {
    Alert.alert('문서 삭제', `"${doc.title}" 문서를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await documentApi.delete(doc.id);
            setDocs((prev) => prev.filter((item) => item.id !== doc.id));
            if (editing?.id === doc.id) resetForm();
          } catch {
            Alert.alert('오류', '문서를 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.documentToolbar}>
        <TextInput
          style={[styles.searchInput, styles.documentSearchInput]}
          value={query}
          onChangeText={setQuery}
          placeholder="문서 검색..."
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity style={styles.documentCreateButton} onPress={openCreate} activeOpacity={0.86}>
          <Text style={styles.documentCreateButtonText}>+ 새 문서</Text>
        </TouchableOpacity>
      </View>

      {showEditor ? (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{editing ? '문서 수정' : '문서 업로드'}</Text>
        <TouchableOpacity style={styles.filePickerInline} onPress={pickFile} activeOpacity={0.82}>
          <Text style={styles.filePickerTitle}>{selectedFile?.name ?? (editing ? '파일을 교체하려면 선택하세요' : '파일 선택')}</Text>
          <Text style={styles.dataMeta}>
            {selectedFile?.size ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : 'PDF, 이미지, Word, Excel 지원'}
          </Text>
        </TouchableOpacity>
        <View style={styles.filterRow}>
          {DOC_CATEGORIES.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.filterButton, category === item.key && styles.filterButtonActive]} onPress={() => setCategory(item.key)}>
              <Text style={[styles.filterText, category === item.key && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInputWide} value={title} onChangeText={setTitle} placeholder="문서 제목" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.formInputWide} value={description} onChangeText={setDescription} placeholder="설명" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={saveDocument} disabled={saving}>
            <Text style={styles.primaryActionText}>{saving ? '저장 중...' : editing ? '수정 저장' : '업로드'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallOutlineAction} onPress={resetForm}>
            <Text style={styles.smallOutlineActionText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

      <DataPanel loading={loading} empty={filtered.length === 0} emptyText="문서가 없습니다.">
        {filtered.map((doc) => (
          <View key={doc.id} style={styles.dataRow}>
            <View style={styles.dataMain}>
              <Text style={styles.dataTitle} numberOfLines={1}>{doc.title}</Text>
              <Text style={styles.dataMeta}>{doc.uploader} · {dateOnly(doc.createdAt)}</Text>
            </View>
            <BadgeText label={DOC_CATEGORY_LABEL[doc.category]} />
            {(isHqDoc || doc.uploaderId === user?.id) && (
              <TouchableOpacity style={styles.smallOutlineAction} onPress={() => openEdit(doc)}>
                <Text style={styles.smallOutlineActionText}>수정</Text>
              </TouchableOpacity>
            )}
            {(isHqDoc || doc.uploaderId === user?.id) && (
              <TouchableOpacity style={styles.smallDangerAction} onPress={() => deleteDocument(doc)}>
                <Text style={styles.smallDangerActionText}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </DataPanel>
    </View>
  );
}

function ChatSection() {
  const user = useAuthStore((s) => s.user);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadRooms = useCallback(() => {
    setLoadingRooms(true);
    chatApi.getRooms()
      .then((list) => {
        setRooms(list);
        setSelectedRoom((prev) => prev ? list.find((room) => room.id === prev.id) ?? list[0] ?? null : list[0] ?? null);
      })
      .catch((err) => {
        logger.warn('[Chat] loadRooms 실패:', err);
        setRooms([]);
      })
      .finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoadingMessages(true);
    chatApi.getMessages(selectedRoom.id)
      .then(setMessages)
      .catch((err) => {
        logger.warn('[Chat] getMessages 실패 roomId=' + selectedRoom.id + ':', err);
        setMessages([]);
      })
      .finally(() => setLoadingMessages(false));
    chatApi.markRead(selectedRoom.id).catch(() => {});
  }, [selectedRoom]);

  const handleSend = async () => {
    if (!selectedRoom || !messageInput.trim() || sending) return;
    setSending(true);
    try {
      const sent = await chatApi.sendMessage({
        roomId: selectedRoom.id,
        content: messageInput.trim(),
        type: 'TEXT',
      });
      setMessages((prev) => [...prev, sent]);
      setMessageInput('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('입력 필요', '채팅방 이름을 입력해주세요.');
      return;
    }
    const ids = memberIds
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    try {
      await chatApi.createRoom({ name: roomName.trim(), memberUserIds: ids });
      setRoomName('');
      setMemberIds('');
      loadRooms();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '채팅방 생성에 실패했습니다.');
    }
  };

  const renameRoom = async () => {
    if (!selectedRoom || !roomName.trim()) {
      Alert.alert('입력 필요', '선택한 채팅방과 새 이름이 필요합니다.');
      return;
    }
    try {
      await chatApi.updateRoom(selectedRoom.id, roomName.trim());
      setRoomName('');
      loadRooms();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '채팅방 이름 수정에 실패했습니다.');
    }
  };

  const leaveRoom = () => {
    if (!selectedRoom) return;
    Alert.alert('채팅방 나가기', `"${selectedRoom.name}" 채팅방에서 나갈까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatApi.leaveRoom(selectedRoom.id);
            setSelectedRoom(null);
            setMessages([]);
            loadRooms();
          } catch (e: any) {
            Alert.alert('오류', e?.response?.data?.error?.message ?? '채팅방 나가기에 실패했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.chatGrid}>
      <View style={styles.roomPanel}>
        <Text style={styles.panelTitle}>채팅방</Text>
        <View style={styles.panel}>
          <TextInput style={styles.formInputWide} value={roomName} onChangeText={setRoomName} placeholder="채팅방 이름" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.formInputWide} value={memberIds} onChangeText={setMemberIds} placeholder="멤버 ID 쉼표 구분 (선택)" placeholderTextColor={Colors.textMuted} />
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryAction} onPress={createRoom}>
              <Text style={styles.primaryActionText}>방 생성</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallOutlineAction} onPress={renameRoom}>
              <Text style={styles.smallOutlineActionText}>이름 수정</Text>
            </TouchableOpacity>
          </View>
        </View>
        <DataPanel loading={loadingRooms} empty={rooms.length === 0} emptyText="채팅방이 없습니다." compact>
          {rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[styles.roomRow, selectedRoom?.id === room.id && styles.roomRowActive]}
              onPress={() => setSelectedRoom(room)}
              activeOpacity={0.82}
            >
              <View style={styles.roomTop}>
                <BadgeText label={room.type === 'GROUP' ? '그룹' : '1:1'} />
                {room.unread > 0 ? <Text style={styles.unreadBadge}>{room.unread}</Text> : null}
              </View>
              <Text style={styles.dataTitle} numberOfLines={1}>{room.name}</Text>
              <Text style={styles.dataMeta} numberOfLines={1}>{room.lastMessage || '메시지 없음'}</Text>
            </TouchableOpacity>
          ))}
        </DataPanel>
      </View>

      <View style={styles.messagePanel}>
        {selectedRoom ? (
          <>
            <View style={styles.messageHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.panelTitle}>{selectedRoom.name}</Text>
              <Text style={styles.panelMeta}>{selectedRoom.type === 'GROUP' ? '그룹' : '1:1'}</Text>
              <TouchableOpacity style={styles.messageHeaderAction} onPress={leaveRoom}>
                <Text style={styles.smallDangerActionText}>나가기</Text>
              </TouchableOpacity>
            </View>
            <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListInner}>
              {loadingMessages ? (
                <ActivityIndicator color={Colors.primary} />
              ) : messages.length === 0 ? (
                <Text style={styles.emptyText}>메시지가 없습니다.</Text>
              ) : messages.map((message) => {
                const isMine = message.senderId === user?.id || message.isMe;
                return (
                  <View key={message.id} style={[styles.messageBubbleRow, isMine && styles.messageBubbleRowMine]}>
                    <View style={[styles.messageBubble, isMine && styles.messageBubbleMine]}>
                      <Text style={[styles.messageSender, isMine && styles.messageSenderMine]}>{message.senderName}</Text>
                      <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{message.content}</Text>
                      <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                        {new Date(message.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.messageInputRow}>
              <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="메시지 입력..."
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={handleSend} disabled={sending}>
                <Text style={styles.sendButtonText}>전송</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>채팅방을 선택하세요.</Text>
        )}
      </View>
    </View>
  );
}

function NoticesSection() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);

  const loadNotices = useCallback(() => {
    setLoading(true);
    noticeApi.getNotices()
      .then(setNotices)
      .catch((err) => {
        logger.warn('[Notices] loadNotices 실패:', err);
        setNotices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const selected = notices[selectedIndex];

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const notice = notices[index];
    if (notice) noticeApi.markRead(notice.id).catch(() => {});
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditing(null);
    setTitle('');
    setContent('');
    setPinned(false);
  };

  const openEdit = (notice: Notice) => {
    setShowEditor(true);
    setEditing(notice);
    setTitle(notice.title);
    setContent(notice.content ?? '');
    setPinned(notice.pinned);
  };

  const openCreate = () => {
    resetForm();
    setShowEditor(true);
  };

  const saveNotice = async () => {
    if (!title.trim()) {
      Alert.alert('입력 필요', '공지 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await noticeApi.updateNotice(editing.id, { title: title.trim(), content: content.trim(), pinned });
      } else {
        await noticeApi.createNotice({ title: title.trim(), content: content.trim(), pinned });
      }
      resetForm();
      loadNotices();
    } catch {
      Alert.alert('오류', editing ? '공지를 수정하지 못했습니다.' : '공지를 작성하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = (notice: Notice) => {
    Alert.alert('공지 삭제', `"${notice.title}" 공지를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await noticeApi.deleteNotice(notice.id);
            setNotices((prev) => prev.filter((item) => item.id !== notice.id));
            if (editing?.id === notice.id) resetForm();
            setSelectedIndex(0);
          } catch {
            Alert.alert('오류', '공지를 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionMetaRow}>
        <TouchableOpacity style={styles.documentCreateButton} onPress={openCreate} activeOpacity={0.86}>
          <Text style={styles.documentCreateButtonText}>+ 새 공지</Text>
        </TouchableOpacity>
      </View>
      {showEditor ? (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{editing ? '공지 수정' : '공지 작성'}</Text>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInputWide} value={title} onChangeText={setTitle} placeholder="공지 제목" placeholderTextColor={Colors.textMuted} />
          <TextInput
            style={[styles.formInputWide, styles.textAreaInline]}
            value={content}
            onChangeText={setContent}
            placeholder="공지 내용"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
        </View>
        <TouchableOpacity style={styles.inlineToggle} onPress={() => setPinned((value) => !value)} activeOpacity={0.82}>
          <View style={[styles.inlineCheckbox, pinned && styles.inlineCheckboxActive]}>
            {pinned ? <Text style={styles.inlineCheckText}>✓</Text> : null}
          </View>
          <Text style={styles.inlineToggleText}>상단 고정</Text>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={saveNotice} disabled={saving}>
            <Text style={styles.primaryActionText}>{saving ? '저장 중...' : editing ? '수정 저장' : '공지 등록'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallOutlineAction} onPress={resetForm}>
            <Text style={styles.smallOutlineActionText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

      <View style={styles.splitGrid}>
        <View style={styles.listPanel}>
        <Text style={styles.panelTitle}>공지사항</Text>
        <DataPanel loading={loading} empty={notices.length === 0} emptyText="공지사항이 없습니다." compact>
          {notices.map((notice, index) => (
            <TouchableOpacity
              key={notice.id}
              style={[styles.noticeRow, selectedIndex === index && styles.roomRowActive]}
              onPress={() => handleSelect(index)}
              activeOpacity={0.82}
            >
              <View style={styles.roomTop}>
                {notice.pinned ? <BadgeText label="고정" tone="warning" /> : null}
                <Text style={styles.dataMeta}>{notice.authorName}</Text>
              </View>
              <Text style={styles.dataTitle} numberOfLines={2}>{notice.title}</Text>
              <Text style={styles.dataMeta}>{dateOnly(notice.createdAt)}</Text>
            </TouchableOpacity>
          ))}
        </DataPanel>
        </View>
        <View style={styles.detailPanel}>
        {selected ? (
          <>
            <View style={styles.roomTop}>
              {selected.pinned ? <BadgeText label="고정" tone="warning" /> : null}
              <Text style={styles.dataMeta}>{selected.authorName}</Text>
              <Text style={styles.detailDate}>{dateOnly(selected.createdAt)}</Text>
            </View>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.smallOutlineAction} onPress={() => openEdit(selected)}>
                <Text style={styles.smallOutlineActionText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallDangerAction} onPress={() => deleteNotice(selected)}>
                <Text style={styles.smallDangerActionText}>삭제</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <Text style={styles.detailBody}>{selected.content || '내용 없음'}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>공지를 선택하세요.</Text>
        )}
        </View>
      </View>
    </View>
  );
}

function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [archiveLabel, setArchiveLabel] = useState('보관함');
  const [archivePurpose, setArchivePurpose] = useState('');

  const loadItems = useCallback(() => {
    setLoading(true);
    inventoryApi.search({ archived })
      .then((page) => setItems(page.items))
      .catch((err) => {
        logger.warn('[Inventory] loadItems 실패:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [archived]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = items.filter((item) =>
    item.productName.includes(query)
    || item.productCode.includes(query)
    || (item.colorName ?? '').includes(query)
  );
  const lowStock = items.filter((item) => item.quantity > 0 && item.quantity <= 5).length;
  const zeroStock = items.filter((item) => item.quantity === 0).length;

  const openItemAction = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity('1');
    setReason('');
    setArchiveLabel(item.archiveLabelName ?? '보관함');
    setArchivePurpose(item.archiveItemName ?? item.productName);
  };

  const closeItemAction = () => {
    setSelectedItem(null);
    setQuantity('1');
    setReason('');
    setArchiveLabel('보관함');
    setArchivePurpose('');
  };

  const adjustQuantity = async (sign: 1 | -1) => {
    if (!selectedItem) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      Alert.alert('입력 필요', '수량은 1 이상이어야 합니다.');
      return;
    }
    setProcessing(true);
    try {
      await inventoryApi.adjust(selectedItem.id, {
        quantityChange: qty * sign,
        version: selectedItem.version,
        reason: reason.trim() || undefined,
      });
      closeItemAction();
      loadItems();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '수량 조정에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const archiveItem = async () => {
    if (!selectedItem) return;
    const qty = Number(quantity);
    if (!archivePurpose.trim() || !Number.isFinite(qty) || qty < 1) {
      Alert.alert('입력 필요', '보관 목적과 수량을 입력해주세요.');
      return;
    }
    setProcessing(true);
    try {
      await inventoryApi.archive(selectedItem.id, {
        labelName: archiveLabel.trim() || '보관함',
        archiveItemName: archivePurpose.trim(),
        archiveQuantity: qty,
      });
      closeItemAction();
      loadItems();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '보관함 이동에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const unarchiveItem = async (item: InventoryItem) => {
    setProcessing(true);
    try {
      await inventoryApi.unarchive(item.id);
      loadItems();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '복원에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const reloadInventory = async () => {
    setProcessing(true);
    try {
      const result = await inventoryApi.reload();
      Alert.alert('재동기화 완료', `${result.rowCount}개 행을 처리했습니다.`);
      loadItems();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '재동기화에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const uploadDailyInventory = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });
      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      setProcessing(true);
      const loaded = await inventoryApi.uploadDaily({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? inferContentType(file.name),
      });
      Alert.alert('업로드 완료', `${loaded.rowCount}개 행을 처리했습니다.`);
      loadItems();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '재고 파일 업로드에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.kpiGridWide}>
        <KpiCard label="전체 품목" value={String(items.length)} unit="개" tone="primary" />
        <KpiCard label="재고 부족" value={String(lowStock)} unit="5개 이하" tone="warning" />
        <KpiCard label="재고 없음" value={String(zeroStock)} unit="개" tone="success" />
      </View>
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterButton, !archived && styles.filterButtonActive]} onPress={() => setArchived(false)}>
          <Text style={[styles.filterText, !archived && styles.filterTextActive]}>실시간 재고</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, archived && styles.filterButtonActive]} onPress={() => setArchived(true)}>
          <Text style={[styles.filterText, archived && styles.filterTextActive]}>보관함</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallOutlineAction} onPress={reloadInventory} disabled={processing}>
          <Text style={styles.smallOutlineActionText}>서버 재동기화</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallOutlineAction} onPress={uploadDailyInventory} disabled={processing}>
          <Text style={styles.smallOutlineActionText}>엑셀 업로드</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="상품명, 상품코드, 색상 검색..."
        placeholderTextColor={Colors.textMuted}
      />
      {selectedItem ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{selectedItem.productName}</Text>
          <Text style={styles.dataMeta}>현재 수량 {selectedItem.quantity} · version {selectedItem.version}</Text>
          <View style={styles.formGrid}>
            <TextInput style={styles.formInput} value={quantity} onChangeText={setQuantity} placeholder="수량" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
            <TextInput style={styles.formInputWide} value={reason} onChangeText={setReason} placeholder="수량 조정 사유" placeholderTextColor={Colors.textMuted} />
            {!archived ? (
              <>
                <TextInput style={styles.formInput} value={archiveLabel} onChangeText={setArchiveLabel} placeholder="보관 라벨" placeholderTextColor={Colors.textMuted} />
                <TextInput style={styles.formInputWide} value={archivePurpose} onChangeText={setArchivePurpose} placeholder="보관 목적" placeholderTextColor={Colors.textMuted} />
              </>
            ) : null}
          </View>
          <View style={styles.actionRow}>
            {!archived ? (
              <>
                <TouchableOpacity style={styles.smallOutlineAction} onPress={() => adjustQuantity(1)} disabled={processing}>
                  <Text style={styles.smallOutlineActionText}>입고</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallOutlineAction} onPress={() => adjustQuantity(-1)} disabled={processing}>
                  <Text style={styles.smallOutlineActionText}>출고</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryAction} onPress={archiveItem} disabled={processing}>
                  <Text style={styles.primaryActionText}>보관함 이동</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryAction} onPress={() => unarchiveItem(selectedItem)} disabled={processing}>
                <Text style={styles.primaryActionText}>실시간 재고로 복원</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.smallOutlineAction} onPress={closeItemAction}>
              <Text style={styles.smallOutlineActionText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <DataPanel loading={loading} empty={filtered.length === 0} emptyText="재고 데이터가 없습니다.">
        {filtered.slice(0, 50).map((item) => (
          <View key={item.id} style={styles.dataRow}>
            <View style={styles.dataMain}>
              <Text style={styles.dataTitle} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.dataMeta}>{item.productCode} · {item.colorName ?? '-'} · {item.sizeName ?? '-'}</Text>
            </View>
            <Text style={[
              styles.quantityText,
              item.quantity === 0 ? styles.errorText : item.quantity <= 5 ? styles.warningText : null,
            ]}>
              {item.quantity}
            </Text>
            {archived ? (
              <TouchableOpacity style={styles.smallOutlineAction} onPress={() => unarchiveItem(item)} disabled={processing}>
                <Text style={styles.smallOutlineActionText}>복원</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.smallOutlineAction} onPress={() => openItemAction(item)}>
                <Text style={styles.smallOutlineActionText}>관리</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </DataPanel>
    </View>
  );
}

function ScheduleSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>('MANNEQUIN');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    scheduleApi.getList()
      .then((items) => {
        setSchedules(items);
        setUpdatedAt(new Date());
      })
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDateKey = toDateKey(selectedDate);
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const scheduleDateKeys = useMemo(() => new Set(schedules.map((schedule) => dateOnly(schedule.dueDate))), [schedules]);
  const selectedDaySchedules = useMemo(
    () => schedules
      .filter((schedule) => dateOnly(schedule.dueDate) === selectedDateKey)
      .sort((a, b) => formatScheduleTime(a.dueDate).localeCompare(formatScheduleTime(b.dueDate))),
    [schedules, selectedDateKey]
  );
  const filtered = schedules.filter((schedule) => filter === 'ALL' || schedule.status === filter);

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const pickDate = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setType('MANNEQUIN');
    setDueDate('');
    setAssignee('');
    setDescription('');
  };

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setTitle(schedule.title);
    setType(schedule.type);
    setDueDate(dateOnly(schedule.dueDate));
    setAssignee(schedule.assignee ?? '');
    setDescription(schedule.description ?? '');
  };

  const saveSchedule = async () => {
    if (!title.trim() || !dueDate.trim()) {
      Alert.alert('입력 필요', '제목과 마감일을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        dueDate: dueDate.includes('T') ? dueDate : `${dueDate}T00:00:00`,
        assignee: assignee.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (editing) {
        await scheduleApi.update(editing.id, payload);
      } else {
        await scheduleApi.create(payload);
      }
      resetForm();
      load();
    } catch {
      Alert.alert('오류', editing ? '스케줄을 수정하지 못했습니다.' : '스케줄을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await scheduleApi.complete(id);
      setSchedules((prev) => prev.map((schedule) => schedule.id === id ? { ...schedule, status: 'DONE' } : schedule));
    } catch {
      Alert.alert('오류', '완료 처리에 실패했습니다.');
    }
  };

  const deleteSchedule = (schedule: Schedule) => {
    Alert.alert('스케줄 삭제', `"${schedule.title}" 스케줄을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await scheduleApi.delete(schedule.id);
            setSchedules((prev) => prev.filter((item) => item.id !== schedule.id));
            if (editing?.id === schedule.id) resetForm();
          } catch {
            Alert.alert('오류', '스케줄을 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.schedulePageTop}>
        <Text style={styles.schedulePageDate}>{formatScheduleDate(selectedDate)} · 마지막 업데이트 {formatScheduleTime(updatedAt.toISOString())}</Text>
      </View>

      <View style={[styles.scheduleDesktopGrid, !isDesktop && styles.scheduleDesktopGridMobile]}>
        <View style={styles.scheduleCalendarCard}>
          <View style={styles.scheduleCalendarHeader}>
            <Text style={styles.scheduleCalendarTitle}>{formatMonthLabel(visibleMonth)}</Text>
            <View style={styles.calendarNavControls}>
              <TouchableOpacity style={styles.calendarNavButton} onPress={() => moveMonth(-1)} activeOpacity={0.8}>
                <Text style={styles.calendarNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarNavButton} onPress={() => moveMonth(1)} activeOpacity={0.8}>
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calendarWeekRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.calendarWeekText}>{label}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              if (!cell.day || !cell.date) return <View key={cell.key} style={styles.calendarDayBlank} />;
              const cellDate = cell.date;
              const key = toDateKey(cellDate);
              const selected = key === selectedDateKey;
              const hasSchedule = scheduleDateKeys.has(key);
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[styles.calendarDay, selected && styles.calendarDaySelected]}
                  onPress={() => pickDate(cellDate)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{cell.day}</Text>
                  {hasSchedule ? <View style={[styles.calendarDot, selected && styles.calendarDotSelected]} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.scheduleTimelineCard}>
          <View style={styles.scheduleTimelineHeader}>
            <Text style={styles.scheduleTimelineTitle}>{`${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${WEEKDAY_LABELS[selectedDate.getDay()]}) 일정`}</Text>
          </View>
          {loading ? (
            <View style={styles.timelineLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : selectedDaySchedules.length === 0 ? (
            <Text style={styles.emptyText}>선택한 날짜의 일정이 없습니다.</Text>
          ) : (
            selectedDaySchedules.map((schedule) => {
              const done = schedule.status === 'DONE';
              return (
                <View key={schedule.id} style={styles.scheduleTimelineRow}>
                  <Text style={styles.scheduleTimelineTime}>{formatScheduleTime(schedule.dueDate)}</Text>
                  <View style={[styles.scheduleTimelineLine, done && styles.scheduleTimelineLineDone]} />
                  <TouchableOpacity style={styles.scheduleTimelineMain} onPress={() => openEdit(schedule)} activeOpacity={0.82}>
                    <Text style={[styles.scheduleTimelineItemTitle, done && styles.scheduleTimelineItemDone]}>{schedule.title}</Text>
                    <Text style={[styles.scheduleTimelineAssignee, done && styles.scheduleTimelineItemDone]}>{schedule.assignee || '전체'}</Text>
                  </TouchableOpacity>
                  {done ? (
                    <Text style={styles.scheduleDoneIcon}>✓</Text>
                  ) : (
                    <TouchableOpacity style={styles.scheduleCompleteButton} onPress={() => handleComplete(schedule.id)} activeOpacity={0.82}>
                      <Text style={styles.scheduleCompleteButtonText}>완료</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{editing ? '스케줄 수정' : '스케줄 등록'}</Text>
        <View style={styles.filterRow}>
          {SCHEDULE_TYPES.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.filterButton, type === item.key && styles.filterButtonActive]} onPress={() => setType(item.key)}>
              <Text style={[styles.filterText, type === item.key && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.formGrid}>
          <TextInput style={styles.formInputWide} value={title} onChangeText={setTitle} placeholder="스케줄 제목" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.formInput} value={dueDate} onChangeText={setDueDate} placeholder="마감일 YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.formInput} value={assignee} onChangeText={setAssignee} placeholder="담당자" placeholderTextColor={Colors.textMuted} />
          <TextInput style={[styles.formInputWide, styles.textAreaInline]} value={description} onChangeText={setDescription} placeholder="상세 내용" placeholderTextColor={Colors.textMuted} multiline />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.primaryAction, saving && styles.disabled]} onPress={saveSchedule} disabled={saving}>
            <Text style={styles.primaryActionText}>{saving ? '저장 중...' : editing ? '수정 저장' : '스케줄 등록'}</Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity style={styles.smallOutlineAction} onPress={resetForm}>
              <Text style={styles.smallOutlineActionText}>취소</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'DONE'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.filterButton, filter === value && styles.filterButtonActive]}
            onPress={() => setFilter(value)}
            activeOpacity={0.82}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
              {value === 'ALL' ? '전체' : STATUS_LABEL[value]}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.filterRefresh} onPress={load}>
          <Text style={styles.outlineButtonText}>새로고침</Text>
        </TouchableOpacity>
      </View>
      <DataPanel loading={loading} empty={filtered.length === 0} emptyText="스케줄이 없습니다.">
        {filtered.map((schedule) => (
          <View key={schedule.id} style={[styles.dataRow, schedule.status === 'DONE' && styles.doneRow]}>
            <View style={styles.dataMain}>
              <Text style={[styles.dataTitle, schedule.status === 'DONE' && styles.doneSchedule]} numberOfLines={1}>
                {schedule.title}
              </Text>
              <Text style={styles.dataMeta}>
                {TYPE_LABEL[schedule.type]} · {dateOnly(schedule.dueDate)} · {schedule.assignee || '미배정'}
              </Text>
            </View>
            <BadgeText label={STATUS_LABEL[schedule.status]} />
            <TouchableOpacity style={styles.smallOutlineAction} onPress={() => openEdit(schedule)}>
              <Text style={styles.smallOutlineActionText}>수정</Text>
            </TouchableOpacity>
            {schedule.status !== 'DONE' ? (
              <TouchableOpacity style={styles.smallOutlineAction} onPress={() => handleComplete(schedule.id)}>
                <Text style={styles.smallOutlineActionText}>완료</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.smallDangerAction} onPress={() => deleteSchedule(schedule)}>
              <Text style={styles.smallDangerActionText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ))}
      </DataPanel>
    </View>
  );
}

function Sidebar({
  active,
  role,
  userName,
  storeName,
  onSelect,
}: {
  active: NavId;
  role: string;
  userName: string;
  storeName: string;
  onSelect: (id: NavId) => void;
}) {
  const roleLabel = role === 'ADMIN' ? '관리자' : role === 'HQ_STAFF' ? '본사 직원' : role === 'STORE_MANAGER' ? '점장' : '직원';
  const isHqRole = role === 'ADMIN' || role === 'HQ_STAFF';
  const visibleNavItems = NAV_ITEMS.filter((item) => item.id !== 'stores' || isHqRole);

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandBlock}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>F</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>Flowre 관리 콘솔</Text>
          <Text style={styles.brandSub} numberOfLines={1}>{storeName}</Text>
        </View>
      </View>
      <Text style={styles.navKicker}>메뉴</Text>
      {visibleNavItems.map((item) => {
        const isActive = active === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.84}
          >
            <View style={[styles.navDot, isActive && styles.navDotActive]} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.sidebarAccountNav}>
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.84}
            >
              <View style={[styles.navDot, isActive && styles.navDotActive]} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.sidebarFooter}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.slice(0, 1)}</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.brandSub}>{roleLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function ProfileSection({ userName, role, storeName }: { userName: string; role: string; storeName: string }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarText}>{userName.slice(0, 1) || 'F'}</Text>
        </View>
        <View style={styles.profileHeroCopy}>
          <Text style={styles.profileKicker}>Flowre 관리 콘솔</Text>
          <Text style={styles.profileName}>{userName || '사용자'}</Text>
          <Text style={styles.profileMeta}>{storeName} · {roleLabel(role)}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>프로필 정보</Text>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>소속</Text>
          <Text style={styles.profileInfoValue}>{storeName}</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>권한</Text>
          <Text style={styles.profileInfoValue}>{roleLabel(role)}</Text>
        </View>
        <View style={styles.profileInfoRow}>
          <Text style={styles.profileInfoLabel}>콘솔</Text>
          <Text style={styles.profileInfoValue}>Flowre 관리 콘솔</Text>
        </View>
      </View>
    </View>
  );
}

const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '답변 중',
  DONE: '완료',
};

const AS_STATUS_LABEL: Record<AsTicketStatus, string> = {
  NEW: '신규',
  IN_PROGRESS: '처리 중',
  DONE: '완료',
};

function SupportSection({ initialTab = 'inquiries' }: { initialTab?: 'inquiries' | 'as-tickets' }) {
  const [tab, setTab] = useState<'inquiries' | 'as-tickets'>(initialTab);
  const [inquiries, setInquiries] = useState<InquiryTicket[]>([]);
  const [asTickets, setAsTickets] = useState<AsTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      supportApi.getInquiries().catch((err) => { logger.warn('[Support] getInquiries 실패:', err); return [] as InquiryTicket[]; }),
      supportApi.getAsTickets().catch((err) => { logger.warn('[Support] getAsTickets 실패:', err); return [] as AsTicket[]; }),
    ])
      .then(([inq, as]) => {
        setInquiries(inq);
        setAsTickets(as);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.sectionStack}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, tab === 'inquiries' && styles.filterButtonActive]}
          onPress={() => setTab('inquiries')}
        >
          <Text style={[styles.filterText, tab === 'inquiries' && styles.filterTextActive]}>
            문의 ({inquiries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, tab === 'as-tickets' && styles.filterButtonActive]}
          onPress={() => setTab('as-tickets')}
        >
          <Text style={[styles.filterText, tab === 'as-tickets' && styles.filterTextActive]}>
            AS 접수 ({asTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallOutlineAction} onPress={load}>
          <Text style={styles.smallOutlineActionText}>새로고침</Text>
        </TouchableOpacity>
      </View>

      {tab === 'inquiries' ? (
        <DataPanel loading={loading} empty={inquiries.length === 0} emptyText="등록된 문의가 없습니다.">
          {inquiries.map((item) => (
            <View key={item.id} style={styles.dataRow}>
              <View style={styles.dataMain}>
                <Text style={styles.dataTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dataMeta}>
                  {item.storeName} · {item.requesterName} · {dateOnly(item.createdAt)}
                </Text>
              </View>
              <BadgeText label={INQUIRY_STATUS_LABEL[item.status]} tone={item.status === 'PENDING' ? 'warning' : undefined} />
            </View>
          ))}
        </DataPanel>
      ) : (
        <DataPanel loading={loading} empty={asTickets.length === 0} emptyText="등록된 AS 접수가 없습니다.">
          {asTickets.map((item) => (
            <View key={item.id} style={styles.dataRow}>
              <View style={styles.dataMain}>
                <Text style={styles.dataTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dataMeta}>
                  {item.storeName} · {item.requesterName} · {dateOnly(item.createdAt)}
                </Text>
              </View>
              <BadgeText label={AS_STATUS_LABEL[item.status]} tone={item.status === 'NEW' ? 'warning' : undefined} />
              {item.priority === 'URGENT' ? <BadgeText label="긴급" tone="warning" /> : null}
            </View>
          ))}
        </DataPanel>
      )}
    </View>
  );
}

function SettingsSection({ onRefresh, onLogout }: { onRefresh: () => void; onLogout: () => void }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>콘솔 설정</Text>
        <Text style={styles.panelMeta}>데이터 동기화와 세션을 관리합니다.</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.outlineButton} onPress={onRefresh} activeOpacity={0.82}>
            <Text style={styles.outlineButtonText}>새로고침</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.82}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DataPanel({
  children,
  compact,
  empty,
  emptyText,
  loading,
}: {
  children: React.ReactNode;
  compact?: boolean;
  empty: boolean;
  emptyText: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={[styles.panel, compact && styles.compactPanel]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (empty) {
    return (
      <View style={[styles.panel, compact && styles.compactPanel]}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return <View style={[styles.panel, compact && styles.compactPanel]}>{children}</View>;
}

function KpiCard({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: 'success' | 'info' | 'warning' | 'primary' }) {
  const toneColor = tone === 'success'
    ? Colors.success
    : tone === 'warning'
      ? Colors.warning
      : tone === 'info'
        ? Colors.info
        : Colors.primary;
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View style={[styles.kpiIndicator, { backgroundColor: toneColor }]} />
      </View>
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function StatusCount({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statusCountCard}>
      <Text style={[styles.statusCountValue, { color }]}>{value}</Text>
      <Text style={styles.statusCountLabel}>{label}</Text>
    </View>
  );
}

function BadgeText({ label, tone }: { label: string; tone?: 'warning' }) {
  return (
    <View style={[styles.badge, tone === 'warning' && styles.warningBadge]}>
      <Text style={[styles.badgeText, tone === 'warning' && styles.warningBadgeText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },
  shellMobile: { flexDirection: 'column' },
  sidebar: {
    width: 220,
    backgroundColor: Colors.sidebar,
    borderRightWidth: 1,
    borderRightColor: Colors.sidebarBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sidebarBorder,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  brandCopy: { flex: 1, minWidth: 0 },
  brandTitle: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  brandSub: { color: Colors.sidebarText, fontSize: FontSize.xs, opacity: 0.7, marginTop: 2 },
  navKicker: {
    color: Colors.sidebarText,
    opacity: 0.55,
    fontSize: FontSize.xs,
    fontWeight: '900',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 11,
    borderRadius: Radius.md,
  },
  navItemActive: { backgroundColor: Colors.sidebarMuted },
  navDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.sidebarText, opacity: 0.45 },
  navDotActive: { backgroundColor: Colors.surface, opacity: 1 },
  navLabel: { color: Colors.sidebarText, fontSize: FontSize.sm, fontWeight: '700' },
  navLabelActive: { color: Colors.surface, fontWeight: '900' },
  sidebarAccountNav: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: Colors.sidebarBorder,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.sidebarBorder,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.sidebarMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  userName: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '800' },
  mobileNav: {
    maxHeight: 56,
    backgroundColor: Colors.sidebar,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sidebarBorder,
  },
  mobileNavItem: {
    height: 44,
    marginLeft: Spacing.sm,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavActive: { backgroundColor: Colors.sidebarMuted },
  mobileNavText: { color: Colors.sidebarText, fontSize: FontSize.sm, fontWeight: '700' },
  mobileNavTextActive: { color: Colors.surface, fontWeight: '900' },
  content: { flex: 1 },
  contentInner: { padding: Spacing.lg, gap: Spacing.md },
  header: {
    minHeight: 72,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Shadow.card,
  },
  headerCopy: { flex: 1, minWidth: 180 },
  breadcrumb: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginTop: 2 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  outlineButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  outlineButtonText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '900' },
  logoutButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  logoutText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  profileAvatarText: { color: Colors.surface, fontSize: FontSize.xxl, fontWeight: '900' },
  profileHeroCopy: { flex: 1, minWidth: 160 },
  profileKicker: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '900' },
  profileName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
  profileMeta: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 },
  profileInfoRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  profileInfoLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  profileInfoValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900', textAlign: 'right' },
  loadingBox: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiGrid: { gap: Spacing.sm },
  kpiGridWide: { flexDirection: 'row', gap: Spacing.sm },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 116,
    justifyContent: 'space-between',
    ...Shadow.card,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  kpiLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '900' },
  kpiIndicator: { width: 9, height: 9, borderRadius: Radius.full },
  kpiValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  kpiValue: { color: Colors.textPrimary, fontSize: 30, fontWeight: '900' },
  kpiUnit: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 6 },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  compactPanel: { minHeight: 120 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  panelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  panelMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl },
  sectionStack: { gap: Spacing.md },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  inlineSearchInput: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
  },
  documentToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  documentSearchInput: {
    flex: 1,
    minHeight: 48,
  },
  documentCreateButton: {
    alignSelf: 'flex-end',
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
  },
  documentCreateButtonText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formInput: {
    minWidth: 180,
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  storePickerWrap: {
    marginBottom: Spacing.xs,
  },
  storePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  storePickerSelected: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  storePickerPlaceholder: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  storePickerArrow: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  storePickerDropdown: {
    marginTop: 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  storePickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storePickerItemActive: {
    backgroundColor: Colors.surfaceMuted,
  },
  storePickerItemName: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  storePickerItemCode: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  storePickerRegisterItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  storePickerRegisterText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '700',
  },
  addressSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addressSearchInput: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchBtnText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  addressDropdown: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  addressItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  addressItemRoad: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  addressItemMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  addressFilledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressFilledInfo: {
    flex: 1,
    gap: 2,
  },
  addressFilledRoad: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  addressFilledMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  addressClearBtn: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '700',
    marginLeft: Spacing.md,
  },
  formInputWide: {
    minWidth: 260,
    flex: 2,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  primaryAction: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primaryActionText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filePickerInline: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    gap: 2,
  },
  filePickerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  textAreaInline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  inlineCheckbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  inlineCheckText: {
    color: Colors.surface,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  inlineToggleText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    flexWrap: 'wrap',
  },
  dataMain: { flex: 1, minWidth: 180 },
  dataTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },
  dataMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  badge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '900' },
  warningBadge: { backgroundColor: Colors.surfaceMuted },
  warningBadgeText: { color: Colors.warning },
  storeRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  storeMain: { minWidth: 120, flex: 1.2 },
  storeName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },
  storeCode: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusOpen: { backgroundColor: Colors.success + '14', borderColor: Colors.success },
  statusClosed: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.borderStrong },
  statusText: { fontSize: FontSize.xs, fontWeight: '900' },
  statusOpenText: { color: Colors.success },
  statusClosedText: { color: Colors.textMuted },
  tableText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', minWidth: 72 },
  rateCell: { width: 110, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rateTrack: { flex: 1, height: 7, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.full, overflow: 'hidden' },
  rateFill: { height: 7, backgroundColor: Colors.primary, borderRadius: Radius.full },
  rateText: { width: 34, color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', textAlign: 'right' },
  smallAction: {
    minWidth: 54,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  openAction: { backgroundColor: Colors.primary },
  closeAction: { backgroundColor: Colors.error },
  disabled: { opacity: 0.55 },
  smallActionText: { color: Colors.surface, fontSize: FontSize.xs, fontWeight: '900' },
  statusGrid: { flexDirection: 'row', gap: Spacing.sm },
  statusCountCard: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statusCountValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  statusCountLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', marginTop: 2 },
  lowerGrid: { gap: Spacing.md },
  lowerGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  chartPanel: { flex: 2 },
  recentPanel: { flex: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 30 },
  chartLabel: { width: 74, color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '800' },
  chartTrack: { flex: 1, height: 14, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.sm, overflow: 'hidden' },
  chartDone: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.accent },
  chartValue: { width: 52, color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', textAlign: 'right' },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scheduleInfo: { flex: 1, minWidth: 0 },
  scheduleTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },
  doneSchedule: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  scheduleMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  scheduleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentLight,
  },
  scheduleBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '900' },
  supportRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  supportMain: { flex: 1, minWidth: 140 },
  supportTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },
  supportMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 3 },
  asStatusGrid: { flexDirection: 'row', gap: Spacing.sm },
  asStatusCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  asStatusLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '900' },
  asStatusValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  asProgressTrack: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  asProgressFill: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  chatGrid: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  roomPanel: { width: 280, gap: Spacing.sm },
  messagePanel: {
    flex: 1,
    minHeight: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  roomRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  roomRowActive: { backgroundColor: Colors.accentLight },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  unreadBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.primary,
    color: Colors.surface,
    borderRadius: Radius.full,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.md,
  },
  messageHeaderAction: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: Colors.error + '55',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.error + '10',
  },
  liveDot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.success },
  messageList: { flex: 1 },
  messageListInner: { padding: Spacing.md, gap: Spacing.sm },
  messageBubbleRow: { flexDirection: 'row' },
  messageBubbleRowMine: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '72%',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  messageBubbleMine: { backgroundColor: Colors.primary },
  messageSender: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '900', marginBottom: 2 },
  messageSenderMine: { color: Colors.surface },
  messageText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  messageTextMine: { color: Colors.surface },
  messageTime: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  messageTimeMine: { color: Colors.sidebarText },
  messageInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  sendButtonText: { color: Colors.surface, fontSize: FontSize.sm, fontWeight: '900' },
  splitGrid: { flexDirection: 'row', gap: Spacing.md },
  listPanel: { width: 320, gap: Spacing.sm },
  detailPanel: {
    flex: 1,
    minHeight: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  noticeRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  detailDate: { marginLeft: 'auto', color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  detailTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900', marginTop: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  detailBody: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },
  quantityText: { minWidth: 58, textAlign: 'right', color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  warningText: { color: Colors.warning },
  errorText: { color: Colors.error },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  filterButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '900' },
  filterTextActive: { color: Colors.surface },
  filterRefresh: { marginLeft: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  schedulePageTop: { alignItems: 'flex-end' },
  sectionMetaRow: { alignItems: 'flex-end' },
  schedulePageDate: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  scheduleDesktopGrid: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  scheduleDesktopGridMobile: { flexDirection: 'column' },
  scheduleCalendarCard: {
    flex: 0.9,
    minHeight: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  scheduleCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  scheduleCalendarTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  calendarNavControls: { flexDirection: 'row', gap: Spacing.sm },
  calendarNavButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  calendarNavText: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: '900', lineHeight: 26 },
  calendarWeekRow: { flexDirection: 'row', marginBottom: Spacing.md },
  calendarWeekText: { flex: 1, textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayBlank: { width: `${100 / 7}%`, aspectRatio: 1.08 },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1.08,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  calendarDaySelected: { backgroundColor: Colors.primary },
  calendarDayText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  calendarDayTextSelected: { color: Colors.surface },
  calendarDot: { width: 3, height: 3, borderRadius: Radius.full, backgroundColor: Colors.primary, marginTop: 3 },
  calendarDotSelected: { backgroundColor: Colors.surface },
  scheduleTimelineCard: {
    flex: 1.7,
    minHeight: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  scheduleTimelineHeader: {
    minHeight: 70,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  scheduleTimelineTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900' },
  timelineLoading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  scheduleTimelineRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  scheduleTimelineTime: { width: 64, color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '900' },
  scheduleTimelineLine: { width: 2, height: 46, backgroundColor: Colors.borderStrong },
  scheduleTimelineLineDone: { backgroundColor: Colors.accent },
  scheduleTimelineMain: { flex: 1, minWidth: 120 },
  scheduleTimelineItemTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900' },
  scheduleTimelineAssignee: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800', marginTop: 4 },
  scheduleTimelineItemDone: { color: Colors.textMuted },
  scheduleDoneIcon: { color: Colors.accent, fontSize: 26, fontWeight: '900', width: 48, textAlign: 'center' },
  scheduleCompleteButton: {
    minWidth: 58,
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  scheduleCompleteButtonText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '900' },
  doneRow: { opacity: 0.62 },
  smallOutlineAction: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  smallOutlineActionText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '900' },
  smallDangerAction: {
    borderWidth: 1,
    borderColor: Colors.error + '55',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.error + '10',
  },
  smallDangerActionText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: '900' },
});
