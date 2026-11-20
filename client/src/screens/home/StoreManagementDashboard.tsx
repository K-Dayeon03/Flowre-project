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
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { AddressSearchResult, Store, StoreActivity, storeApi } from '../../api/storeApi';
import { Schedule, ScheduleType, scheduleApi } from '../../api/scheduleApi';
import { Notice, noticeApi } from '../../api/noticeApi';
import { Document, DocumentCategory, documentApi } from '../../api/documentApi';
import { ChatRoom, Message, chatApi } from '../../api/chatApi';
import { CategoryCount, InventoryItem, inventoryApi } from '../../api/inventoryApi';
import { AssignableRole, Employee, employeeApi } from '../../api/employeeApi';
import { dashboardApi, HomeDashboardResponse } from '../../api/dashboardApi';
import { supportApi, InquiryTicket, AsTicket, InquiryStatus, AsTicketStatus } from '../../api/supportApi';
import { useAuthStore } from '../../store/useAuthStore';
import { logger } from '../../utils/logger';
import OrderListScreen from '../order/OrderListScreen';
import SalesDashboardScreen from '../sales/SalesDashboardScreen';
import AttendanceScreen from '../attendance/AttendanceScreen';
import CommunicationHubScreen from '../hub/CommunicationHubScreen';

type NavId = 'home' | 'hub' | 'stores' | 'employees' | 'approvals' | 'documents' | 'chat' | 'notices' | 'inventory' | 'orders' | 'sales' | 'attendance' | 'schedule' | 'support' | 'profile' | 'settings';

const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'hub', label: '허브' },
  { id: 'stores', label: '매장 관리' },
  { id: 'employees', label: '직원 관리' },
  { id: 'approvals', label: '직원 승인' },
  { id: 'documents', label: '문서' },
  { id: 'chat', label: '채팅' },
  { id: 'notices', label: '공지' },
  { id: 'inventory', label: '재고' },
  { id: 'orders', label: '발주' },
  { id: 'sales', label: '매출' },
  { id: 'attendance', label: '근태' },
  { id: 'schedule', label: '스케줄' },
  { id: 'support', label: '문의·AS' },
];

const NAV_SECTIONS: Array<{ title: string; items: Array<{ id: NavId; label: string; badge?: (ctx: { unreadNotices: number }) => number }> }> = [
  { title: '메인', items: [{ id: 'home', label: '대시보드' }, { id: 'hub', label: '허브' }] },
  {
    title: '업무관리',
    items: [
      { id: 'schedule', label: '스케줄' },
      { id: 'documents', label: '문서' },
      { id: 'notices', label: '공지', badge: ({ unreadNotices }) => unreadNotices },
      { id: 'chat', label: '채팅' },
      { id: 'support', label: '문의·AS' },
    ],
  },
  {
    title: '매장관리',
    items: [
      { id: 'inventory', label: '재고' },
      { id: 'orders', label: '발주' },
      { id: 'sales', label: '매출' },
      { id: 'attendance', label: '근태' },
      { id: 'employees', label: '직원관리' },
      { id: 'approvals', label: '직원승인' },
      { id: 'stores', label: '매장정보' },
    ],
  },
];

const ACCOUNT_NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'profile', label: '프로필' },
  { id: 'settings', label: '설정' },
];

function isOutOfStock(item: InventoryItem) {
  return item.stockStatus === 'OUT_OF_STOCK' || item.quantity <= 0;
}

function isLowStock(item: InventoryItem) {
  return item.stockStatus === 'LOW' || (item.quantity > 0 && item.quantity < (item.minQuantity ?? 5));
}

function isInventoryAlert(item: InventoryItem) {
  return isOutOfStock(item) || isLowStock(item);
}

const SECTION_TITLE: Record<NavId, string> = {
  home: '대시보드',
  hub: '커뮤니케이션 허브',
  stores: '매장 관리',
  employees: '직원 관리',
  approvals: '직원 승인',
  documents: '문서 관리',
  chat: '채팅',
  notices: '공지사항',
  inventory: '재고 관리',
  orders: '원격 발주',
  sales: '매출 대시보드',
  attendance: '근태 관리',
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

/** 상단바에 표시할 오늘 날짜 라벨을 생성합니다. */
function formatTodayHeader(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY_LABELS[now.getDay()]}요일`;
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
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
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
  const [notices, setNotices] = useState<Notice[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryItem[]>([]);
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [homeSummary, setHomeSummary] = useState<HomeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportTab, setSupportTab] = useState<'inquiries' | 'as-tickets'>('inquiries');

  const isHq = user?.role === 'HQ_STAFF' || user?.role === 'ADMIN';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [activityResult, scheduleResult, noticeResult, roomResult, pendingEmployeeResult, inventoryResult, unreadResult, homeResult] = await Promise.all([
        storeApi.getActivity().catch(() => [] as StoreActivity[]),
        scheduleApi.getList().catch(() => [] as Schedule[]),
        noticeApi.getNotices().catch(() => [] as Notice[]),
        chatApi.getRooms().catch(() => [] as ChatRoom[]),
        employeeApi.getPending().catch(() => [] as Employee[]),
        inventoryApi.search({ archived: false, alertsOnly: true, page: 0 })
          .then((page) => page.items
            .filter(isInventoryAlert)
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 4))
          .catch(() => [] as InventoryItem[]),
        noticeApi.getUnreadCount().catch(() => 0),
        dashboardApi.getHome(3).catch(() => null),
      ]);
      setActivities(activityResult);
      setSchedules(scheduleResult);
      setNotices(noticeResult);
      setChatRooms(roomResult);
      setPendingEmployees(pendingEmployeeResult);
      setInventoryAlerts(inventoryResult);
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

  const approveDashboardEmployee = useCallback(async (employee: Employee) => {
    try {
      await employeeApi.approve(employee.id);
      setPendingEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      Alert.alert('승인 완료', `${employee.name} 직원 가입을 승인했습니다.`);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '직원 승인을 처리하지 못했습니다.');
    }
  }, []);

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
          completionRate={completionRate}
          doneSchedules={doneSchedules}
          chatRooms={chatRooms}
          inProgressSchedules={inProgressSchedules}
          inventoryAlerts={inventoryAlerts}
          isHq={isHq}
          openStoreCount={openStoreCount}
          notices={notices}
          pendingEmployees={pendingEmployees}
          pendingSchedules={pendingSchedules}
          recentInquiries={homeSummary?.recentInquiries ?? []}
          asStatus={homeSummary?.asStatus ?? null}
          schedules={schedules}
          totalSchedules={totalSchedules}
          unreadNotices={unreadNotices}
          isWide={isWide}
          onViewAllChat={() => setActive('chat')}
          onViewAllEmployees={() => setActive('approvals')}
          onViewAllInventory={() => setActive('inventory')}
          onViewAllNotices={() => setActive('notices')}
          onViewAllSchedules={() => setActive('schedule')}
          onViewAllStores={() => setActive('stores')}
          onViewAllInquiries={() => { setSupportTab('inquiries'); setActive('support'); }}
          onViewAllAsTickets={() => { setSupportTab('as-tickets'); setActive('support'); }}
          onApproveEmployee={approveDashboardEmployee}
        />
      );
    }

    if (active === 'hub') return <CommunicationHubScreen />;
    if (active === 'stores') return <StoresAdminSection activities={activities} onReload={loadDashboard} />;
    if (active === 'support') return <SupportSection initialTab={supportTab} />;
    if (active === 'employees') return <EmployeesAdminSection onNavigateToStores={() => setActive('stores')} />;
    if (active === 'approvals') return <EmployeeApprovalsSection onChanged={loadDashboard} />;
    if (active === 'documents') return <DocumentsSection />;
    if (active === 'chat') return <ChatSection />;
    if (active === 'notices') return <NoticesSection />;
    if (active === 'inventory') return <InventorySection />;
    if (active === 'orders') return <OrderListScreen />;
    if (active === 'sales') return <SalesDashboardScreen />;
    if (active === 'attendance') return <AttendanceScreen />;
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
            unreadNotices={unreadNotices}
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
          <View style={styles.topBar}>
            <View>
              <Text style={styles.sectionTitle}>{SECTION_TITLE[active]}</Text>
              <Text style={styles.topBarMeta}>{formatTodayHeader()} · {user?.storeName ?? 'Flowre 운영 본부'}</Text>
            </View>
            <View style={styles.topBarActions}>
              <TouchableOpacity style={styles.searchPill} onPress={() => setActive('schedule')} activeOpacity={0.82}>
                <Text style={styles.searchIcon}>⌕</Text>
                <Text style={styles.searchPillText}>검색</Text>
                <Text style={styles.searchShortcut}>⌘K</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bellButton} onPress={() => setActive('notices')} activeOpacity={0.82}>
                <Text style={styles.bellText}>!</Text>
                {unreadNotices > 0 ? <View style={styles.bellDot} /> : null}
              </TouchableOpacity>
            </View>
          </View>
          {renderSection()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function HomeSection({
  activities,
  chatRooms,
  completionRate,
  doneSchedules,
  inProgressSchedules,
  inventoryAlerts,
  isHq,
  isWide,
  notices,
  openStoreCount,
  pendingEmployees,
  pendingSchedules,
  recentInquiries,
  asStatus,
  schedules,
  totalSchedules,
  unreadNotices,
  onViewAllChat,
  onViewAllEmployees,
  onViewAllInventory,
  onViewAllNotices,
  onViewAllSchedules,
  onViewAllStores,
  onViewAllInquiries,
  onViewAllAsTickets,
  onApproveEmployee,
}: {
  activities: Array<StoreActivity>;
  chatRooms: ChatRoom[];
  completionRate: number;
  doneSchedules: number;
  inProgressSchedules: number;
  inventoryAlerts: InventoryItem[];
  isHq: boolean;
  isWide: boolean;
  notices: Notice[];
  openStoreCount: number;
  pendingEmployees: Employee[];
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
  onViewAllChat: () => void;
  onViewAllEmployees: () => void;
  onViewAllInventory: () => void;
  onViewAllNotices: () => void;
  onViewAllSchedules: () => void;
  onViewAllStores: () => void;
  onViewAllInquiries: () => void;
  onViewAllAsTickets: () => void;
  onApproveEmployee: (employee: Employee) => Promise<void>;
}) {
  const navigation = useNavigation<any>();
  const [scheduleTab, setScheduleTab] = useState<'list' | 'chart'>('chart');
  const [approvingEmployeeId, setApprovingEmployeeId] = useState<number | null>(null);
  const todayKey = toDateKey(new Date());
  const todaySchedules = schedules.filter((schedule) => schedule.dueDate.startsWith(todayKey));
  const visibleSchedules = (todaySchedules.length > 0 ? todaySchedules : schedules).slice(0, 5);
  const asSummary = asStatus ?? {
    newCount: 0,
    inProgressCount: 0,
    doneCount: 0,
    urgentCount: 0,
    completionRate: 0,
    updatedAt: new Date().toISOString(),
  };
  const unresolvedAsCount = asSummary.newCount + asSummary.inProgressCount;
  const totalUnreadChat = chatRooms.reduce((sum, room) => sum + room.unread, 0);
  const weeklyScheduleItems = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    const day = start.getDay();
    start.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      const daySchedules = schedules.filter((schedule) => schedule.dueDate.startsWith(key));
      return {
        key,
        label: WEEKDAY_LABELS[date.getDay()],
        total: daySchedules.length,
        done: daySchedules.filter((schedule) => schedule.status === 'DONE').length,
      };
    });
  }, [schedules]);
  const weeklyMax = Math.max(...weeklyScheduleItems.map((item) => item.total), 8);
  const secondaryNoticeCount = recentInquiries.filter((item) => item.status !== 'DONE').length;
  const inventoryAlertCount = inventoryAlerts.length;
  const criticalInventoryCount = inventoryAlerts.filter(isOutOfStock).length;
  const lowInventoryCount = Math.max(inventoryAlertCount - criticalInventoryCount, 0);

  const approveEmployee = async (employee: Employee) => {
    setApprovingEmployeeId(employee.id);
    try {
      await onApproveEmployee(employee);
    } finally {
      setApprovingEmployeeId(null);
    }
  };

  return (
    <>
      <View style={[styles.kpiGrid, isWide && styles.kpiGridWide]}>
        <KpiCard label="오늘의 스케줄" value={`${visibleSchedules.length}건`} unit={`완료 ${doneSchedules} · 진행 ${inProgressSchedules}`} tone="primary" onPress={onViewAllSchedules} />
        <KpiCard label="승인 대기 직원" value={`${pendingEmployees.length}명`} unit="즉시 처리 필요" tone="warning" onPress={onViewAllEmployees} />
        <KpiCard label="미확인 공지" value={String(unreadNotices)} unit="필독 공지 포함" tone="info" onPress={onViewAllNotices} />
        <KpiCard label="재고 부족 알림" value={`${inventoryAlertCount}개`} unit={`CRITICAL ${criticalInventoryCount} · LOW ${lowInventoryCount}`} tone="danger" onPress={onViewAllInventory} />
      </View>

      <View style={[styles.figmaMiddleGrid, isWide && styles.figmaMiddleGridWide]}>
        <View style={[styles.panel, styles.figmaSchedulePanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>오늘의 스케줄</Text>
            <View style={styles.segmentedControl}>
              {(['list', 'chart'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.segmentedItem, scheduleTab === tab && styles.segmentedItemActive]}
                  onPress={() => setScheduleTab(tab)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.segmentedText, scheduleTab === tab && styles.segmentedTextActive]}>
                    {tab === 'list' ? '목록' : '주간 현황'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {scheduleTab === 'list' ? (
            visibleSchedules.length === 0 ? (
              <Text style={styles.emptyText}>스케줄이 없습니다.</Text>
            ) : visibleSchedules.map((schedule) => (
              <TouchableOpacity
                key={schedule.id}
                style={styles.figmaScheduleRow}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: schedule.id })}
              >
                <View style={[styles.scheduleTypeAccent, { backgroundColor: Colors.scheduleType[schedule.type] }]} />
                <View style={styles.figmaScheduleMain}>
                  <Text style={styles.figmaRowTitle} numberOfLines={1}>{schedule.title}</Text>
                  <Text style={styles.figmaRowMeta}>{TYPE_LABEL[schedule.type]} · 담당: {schedule.assignee || '미배정'}</Text>
                </View>
                <BadgeText label={STATUS_LABEL[schedule.status]} tone={schedule.status === 'PENDING' ? 'warning' : undefined} />
                <Text style={styles.figmaTimeText}>{formatScheduleTime(schedule.dueDate)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.weeklyChartBlock}>
              <Text style={styles.weeklyChartTitle}>이번 주 스케줄 완료 현황</Text>
              <View style={styles.weeklyChartArea}>
                <View style={styles.weeklyAxis}>
                  {[8, 6, 4, 2, 0].map((tick) => (
                    <Text key={tick} style={styles.weeklyAxisText}>{tick}</Text>
                  ))}
                </View>
                <View style={styles.weeklyBars}>
                  {weeklyScheduleItems.map((item) => (
                    <View key={item.key} style={styles.weeklyBarColumn}>
                      <View style={styles.weeklyBarTrack}>
                        <View style={[styles.weeklyBarTotal, { height: `${Math.max((item.total / weeklyMax) * 100, item.total > 0 ? 8 : 0)}%` as const }]} />
                        <View style={[styles.weeklyBarDone, { height: `${Math.max((item.done / weeklyMax) * 100, item.done > 0 ? 8 : 0)}%` as const }]} />
                      </View>
                      <Text style={styles.weeklyBarLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.weeklyLegend}>
                <View style={styles.weeklyLegendItem}>
                  <View style={styles.weeklyLegendTotal} />
                  <Text style={styles.weeklyLegendText}>전체</Text>
                </View>
                <View style={styles.weeklyLegendItem}>
                  <View style={styles.weeklyLegendDone} />
                  <Text style={styles.weeklyLegendText}>완료</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={onViewAllSchedules} style={styles.panelFooterAction} activeOpacity={0.82}>
            <Text style={styles.panelFooterText}>전체 보기 ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.figmaRightColumn}>
          <View style={[styles.panel, styles.figmaSidePanel]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>공지사항</Text>
              {unreadNotices > 0 ? <BadgeText label={`미확인 ${unreadNotices}`} tone="warning" /> : null}
            </View>
            {notices.length === 0 ? (
              <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
            ) : notices.slice(0, 3).map((notice) => (
              <TouchableOpacity
                key={notice.id}
                style={styles.figmaNoticeRow}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('NoticeDetail', { noticeId: notice.id })}
              >
                <View style={[styles.noticeDot, notice.read ? styles.noticeDotRead : null]} />
                <View style={styles.figmaNoticeCopy}>
                  <Text style={[styles.figmaRowTitle, !notice.read && styles.figmaUnreadTitle]} numberOfLines={1}>{notice.title}</Text>
                  <Text style={styles.figmaRowMeta}>{notice.authorName} · {dateOnly(notice.createdAt).slice(5).replace('-', '.')}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={onViewAllNotices} style={styles.panelFooterAction} activeOpacity={0.82}>
              <Text style={styles.panelFooterText}>전체 보기 ›</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.panel, styles.figmaSidePanel]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>채팅</Text>
              {totalUnreadChat > 0 ? <BadgeText label={`${totalUnreadChat} 안읽음`} /> : null}
            </View>
            {chatRooms.length === 0 ? (
              <Text style={styles.emptyText}>참여 중인 채팅방이 없습니다.</Text>
            ) : chatRooms.slice(0, 3).map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.figmaChatRow}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('ChatRoom', { roomId: room.id, roomName: room.name, roomType: room.type })}
              >
                <View style={[styles.chatAvatar, room.type === 'GROUP' && styles.chatAvatarGroup]}>
                  <Text style={styles.chatAvatarText}>{room.type === 'GROUP' ? '#' : room.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.figmaChatCopy}>
                  <Text style={styles.figmaRowTitle} numberOfLines={1}>{room.name}</Text>
                  <Text style={styles.figmaRowMeta} numberOfLines={1}>{room.lastMessage || '최근 메시지 없음'}</Text>
                </View>
                {room.unread > 0 ? <Text style={styles.chatUnread}>{room.unread}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.figmaBottomGrid, isWide && styles.figmaBottomGridWide]}>
        <View style={[styles.panel, styles.figmaInlinePanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>승인 대기 직원</Text>
            <BadgeText label={`${pendingEmployees.length}명 대기중`} tone={pendingEmployees.length > 0 ? 'warning' : undefined} />
          </View>
          {pendingEmployees.length === 0 ? (
            <Text style={styles.emptyText}>승인 대기 직원이 없습니다.</Text>
          ) : pendingEmployees.slice(0, 3).map((employee) => (
            <View key={employee.id} style={styles.employeePreviewRow}>
              <View style={styles.employeeAvatar}>
                <Text style={styles.employeeAvatarText}>{employee.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.figmaRowMain}>
                <Text style={styles.figmaRowTitle}>{employee.name}</Text>
                <Text style={styles.figmaRowMeta}>{employee.employeeCode} · {dateOnly(employee.createdAt).slice(5).replace('-', '.')} 신청</Text>
              </View>
              <TouchableOpacity
                style={[styles.inlinePrimaryMini, approvingEmployeeId === employee.id && styles.disabled]}
                onPress={() => approveEmployee(employee)}
                disabled={approvingEmployeeId === employee.id}
                activeOpacity={0.82}
              >
                <Text style={styles.inlinePrimaryMiniText}>{approvingEmployeeId === employee.id ? '처리중' : '승인'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.panel, styles.figmaInlinePanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>재고 부족 알림</Text>
            <BadgeText label={inventoryAlertCount > 0 ? '즉시 보충 필요' : '정상'} tone={inventoryAlertCount > 0 ? 'warning' : undefined} />
          </View>
          <View style={styles.inventoryTableHeader}>
            <Text style={[styles.inventoryHeaderText, styles.inventoryNameCell]}>상품명</Text>
            <Text style={styles.inventoryHeaderText}>SKU</Text>
            <Text style={[styles.inventoryHeaderText, styles.inventoryQtyCell]}>재고</Text>
          </View>
          {inventoryAlerts.length === 0 ? (
            <Text style={styles.emptyText}>재고 부족 알림이 없습니다.</Text>
          ) : inventoryAlerts.map((item) => (
            <TouchableOpacity key={item.id} style={styles.inventoryPreviewRow} activeOpacity={0.82} onPress={onViewAllInventory}>
              <View style={styles.inventoryNameCell}>
                <Text style={styles.figmaRowTitle} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.figmaRowMeta}>{item.colorName || item.colorCode || '-'} · {item.sizeName || '-'}</Text>
              </View>
              <Text style={styles.inventorySku} numberOfLines={1}>{item.productCode}</Text>
              <View style={styles.inventoryQtyWrap}>
                <Text style={styles.inventoryQty}>{item.quantity}</Text>
                <Text style={[styles.inventoryStatus, isOutOfStock(item) && styles.inventoryStatusDanger]}>
                  {isOutOfStock(item) ? '소진' : '부족'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.panel, styles.figmaInlinePanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>운영 중 매장</Text>
            <TouchableOpacity onPress={onViewAllStores} style={styles.panelTextAction} activeOpacity={0.82}>
              <Text style={styles.panelFooterText}>전체 보기 ›</Text>
            </TouchableOpacity>
          </View>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>매장 현황 데이터가 없습니다.</Text>
          ) : activities.slice(0, 4).map((activity) => (
            <View key={activity.storeId} style={styles.storeCompactRow}>
              <View style={styles.figmaRowMain}>
                <Text style={styles.figmaRowTitle} numberOfLines={1}>{activity.storeName}</Text>
                <Text style={styles.figmaRowMeta}>{activity.storeCode} · {timeAgo(activity.lastActivityAt)}</Text>
              </View>
              <BadgeText label={activity.operationStatus === 'OPEN' ? '운영 중' : '영업 종료'} tone={activity.operationStatus === 'OPEN' ? undefined : 'warning'} />
            </View>
          ))}
        </View>

        <View style={[styles.panel, styles.figmaInlinePanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>문의·AS 요약</Text>
            <TouchableOpacity onPress={unresolvedAsCount > 0 ? onViewAllAsTickets : onViewAllInquiries} style={styles.panelTextAction} activeOpacity={0.82}>
              <Text style={styles.panelFooterText}>전체 보기 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.asStatusGrid}>
            <StatusCount label="신규 AS" value={asSummary.newCount} color={Colors.warning} />
            <StatusCount label="처리 중" value={asSummary.inProgressCount} color={Colors.primary} />
            <StatusCount label="긴급" value={asSummary.urgentCount + secondaryNoticeCount} color={Colors.error} />
          </View>
          <View style={styles.asProgressTrack}>
            <View style={[styles.asProgressFill, { width: `${asSummary.completionRate}%` }]} />
          </View>
          <Text style={styles.panelMeta}>평균 처리율 {asSummary.completionRate}% · 완료 {asSummary.doneCount}건</Text>
        </View>
      </View>
    </>
  );
}

function StoresAdminSection({
  activities,
  onReload,
}: {
  activities: StoreActivity[];
  onReload: () => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;
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
      <View style={styles.summaryStrip}>
        <StatusCount label="전체 매장" value={stores.length} color={Colors.primary} />
        <StatusCount label="운영 중" value={activities.filter((activity) => activity.operationStatus === 'OPEN').length} color={Colors.success} />
        <StatusCount label="영업 종료" value={activities.filter((activity) => activity.operationStatus !== 'OPEN').length} color={Colors.textMuted} />
      </View>

      <View style={[styles.managementGrid, !isDesktop && styles.managementGridStack]}>
        <View style={[styles.panel, styles.managementFormPanel]}>
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

        <DataPanel loading={loading} empty={stores.length === 0} emptyText="등록된 매장이 없습니다." style={styles.managementListPanel}>
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
              </View>
            );
          })}
        </DataPanel>
      </View>
    </View>
  );
}

function EmployeesAdminSection({ onNavigateToStores }: { onNavigateToStores?: () => void }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1180;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        phoneNumber: phoneNumber.trim() || undefined,
        storeCode: storeCode.trim(),
        employeeCode: employeeCode.trim(),
        password,
        role,
      });
      setName('');
      setEmail('');
      setPhoneNumber('');
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
      <View style={styles.summaryStrip}>
        <StatusCount label="전체 직원" value={employees.length} color={Colors.primary} />
        <StatusCount label="승인 대기" value={employees.filter((employee) => employee.status === 'PENDING').length} color={Colors.warning} />
        <StatusCount label="활성 계정" value={employees.filter((employee) => employee.status === 'ACTIVE').length} color={Colors.success} />
      </View>

      <View style={[styles.managementGrid, !isDesktop && styles.managementGridStack]}>
        <View style={styles.managementFormColumn}>
          <EmployeeApprovalsSection onChanged={loadEmployees} embedded />

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>직원 계정 발급</Text>
            <View style={styles.formGrid}>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="이름" placeholderTextColor={Colors.textMuted} />
              <TextInput style={styles.formInput} value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={Colors.textMuted} autoCapitalize="none" autoCorrect={false} />
              <TextInput style={styles.formInput} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="휴대폰 번호 (가입 완료 문자)" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
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
        </View>

        <DataPanel loading={loading} empty={employees.length === 0} emptyText="직원 계정이 없습니다." style={styles.managementListPanel}>
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
    </View>
  );
}

function EmployeeApprovalsSection({ embedded = false, onChanged }: { embedded?: boolean; onChanged?: () => void }) {
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
    <View style={embedded ? styles.embeddedSectionStack : styles.sectionStack}>
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
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
      <View style={styles.summaryStrip}>
        <StatusCount label="전체 문서" value={docs.length} color={Colors.primary} />
        <StatusCount label="공지 문서" value={docs.filter((doc) => doc.category === 'NOTICE').length} color={Colors.info} />
        <StatusCount label="매뉴얼" value={docs.filter((doc) => doc.category === 'MANUAL').length} color={Colors.success} />
      </View>

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

      <View style={[styles.managementGrid, (!isDesktop || !showEditor) && styles.managementGridStack]}>
        {showEditor ? (
          <View style={[styles.panel, styles.managementFormPanel]}>
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

        <DataPanel loading={loading} empty={filtered.length === 0} emptyText="문서가 없습니다." style={styles.managementListPanel}>
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
    </View>
  );
}

function ChatSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
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
    <View style={[styles.chatGrid, !isDesktop && styles.chatGridStack]}>
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
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

      <View style={[styles.splitGrid, !isDesktop && styles.splitGridStack]}>
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
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [archiveLabel, setArchiveLabel] = useState('보관함');
  const [archivePurpose, setArchivePurpose] = useState('');

  const loadItems = useCallback((pageNumber = 0) => {
    if (pageNumber === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    inventoryApi.search({
      archived,
      category: selectedCategory ?? undefined,
      query: query.trim() || undefined,
      page: pageNumber,
    })
      .then((page) => {
        setItems((prev) => (pageNumber === 0 ? page.items : [...prev, ...page.items]));
        setTotalCount(page.totalCount);
        setHasNext(page.hasNext);
        setCurrentPage(pageNumber);
      })
      .catch((err) => {
        logger.warn('[Inventory] loadItems 실패:', err);
        if (pageNumber === 0) {
          setItems([]);
          setTotalCount(0);
          setHasNext(false);
          setCurrentPage(0);
        }
      })
      .finally(() => {
        if (pageNumber === 0) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      });
  }, [archived, query, selectedCategory]);

  const loadCategoryCounts = useCallback(() => {
    inventoryApi.getCategoryCounts({ archived })
      .then(setCategoryCounts)
      .catch((err) => {
        logger.warn('[Inventory] getCategoryCounts 실패:', err);
        setCategoryCounts([]);
      });
  }, [archived]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadItems(0);
      loadCategoryCounts();
    }, 250);
    return () => clearTimeout(handle);
  }, [loadCategoryCounts, loadItems]);

  const totalCategoryCount = categoryCounts.reduce((sum, item) => sum + item.count, 0);
  const lowStock = items.filter(isLowStock).length;
  const zeroStock = items.filter(isOutOfStock).length;

  const loadMoreItems = () => {
    if (!hasNext || loadingMore || loading) return;
    loadItems(currentPage + 1);
  };

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
      loadItems(0);
      loadCategoryCounts();
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
      loadItems(0);
      loadCategoryCounts();
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
      loadItems(0);
      loadCategoryCounts();
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
      Alert.alert('재동기화 완료', `${result.rowCount}개 행을 분류해 반영했습니다.`);
      loadItems(0);
      loadCategoryCounts();
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
          'text/csv',
          'application/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });
      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
        Alert.alert('파일 형식 확인', '재고 업로드는 CSV 또는 XLSX 파일만 지원합니다.');
        return;
      }
      setProcessing(true);
      const loaded = await inventoryApi.uploadDaily({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? inferContentType(file.name),
        file: file.file,
      });
      Alert.alert('업로드 완료', `${loaded.rowCount}개 행을 상품명 기준으로 분류해 반영했습니다.`);
      setArchived(false);
      setSelectedCategory(null);
      const [page, counts] = await Promise.all([
        inventoryApi.search({ archived: false, page: 0 }),
        inventoryApi.getCategoryCounts({ archived: false }),
      ]);
      setItems(page.items);
      setTotalCount(page.totalCount);
      setHasNext(page.hasNext);
      setCurrentPage(0);
      setCategoryCounts(counts);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? e?.response?.data?.error?.message ?? '재고 파일 업로드에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.kpiGridWide}>
        <KpiCard label="전체 품목" value={String(totalCount)} unit={`표시 ${items.length}개`} tone="primary" />
        <KpiCard label="현재 페이지 부족" value={String(lowStock)} unit="최소 기준 미만" tone="warning" />
        <KpiCard label="현재 페이지 소진" value={String(zeroStock)} unit="개" tone="danger" />
      </View>
      <View style={styles.managementToolbar}>
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
          style={[styles.searchInput, styles.toolbarSearchInput]}
          value={query}
          onChangeText={setQuery}
          placeholder="상품명, 상품코드, 색상 검색..."
          placeholderTextColor={Colors.textMuted}
        />
        <View style={styles.categoryChipRow}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.82}
          >
            <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextActive]}>
              전체 {totalCategoryCount}
            </Text>
          </TouchableOpacity>
          {categoryCounts.map((category) => (
            <TouchableOpacity
              key={category.category}
              style={[styles.categoryChip, selectedCategory === category.category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.category)}
              activeOpacity={0.82}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category.category && styles.categoryChipTextActive]}>
                {category.label} {category.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
      <DataPanel loading={loading} empty={items.length === 0} emptyText="재고 데이터가 없습니다.">
        {items.map((item) => (
          <View key={item.id} style={styles.dataRow}>
            <View style={styles.dataMain}>
              <Text style={styles.dataTitle} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.dataMeta}>{item.productCode} · {item.colorName ?? '-'} · {item.sizeName ?? '-'}</Text>
            </View>
            <BadgeText label={item.categoryLabel ?? '기타'} />
            <Text style={[
              styles.quantityText,
              isOutOfStock(item) ? styles.errorText : isLowStock(item) ? styles.warningText : null,
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
        {hasNext ? (
          <TouchableOpacity style={[styles.loadMoreButton, loadingMore && styles.disabled]} onPress={loadMoreItems} disabled={loadingMore} activeOpacity={0.82}>
            <Text style={styles.loadMoreButtonText}>{loadingMore ? '불러오는 중...' : `더 불러오기 (${items.length}/${totalCount})`}</Text>
          </TouchableOpacity>
        ) : totalCount > 0 ? (
          <Text style={styles.paginationMeta}>총 {totalCount}개 중 {items.length}개 표시</Text>
        ) : null}
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

      <View style={[styles.scheduleManagementGrid, !isDesktop && styles.scheduleManagementGridStack]}>
        <View style={[styles.panel, styles.scheduleEditorPanel]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{editing ? '스케줄 수정' : '스케줄 등록'}</Text>
            {editing ? (
              <TouchableOpacity style={styles.panelTextAction} onPress={resetForm} activeOpacity={0.82}>
                <Text style={styles.panelFooterText}>신규 등록</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.scheduleTypeGrid}>
            {SCHEDULE_TYPES.map((item) => (
              <TouchableOpacity key={item.key} style={[styles.scheduleTypeButton, type === item.key && styles.filterButtonActive]} onPress={() => setType(item.key)} activeOpacity={0.82}>
                <Text style={[styles.filterText, type === item.key && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.scheduleFormStack}>
            <TextInput style={styles.scheduleFormInput} value={title} onChangeText={setTitle} placeholder="스케줄 제목" placeholderTextColor={Colors.textMuted} />
            <View style={styles.scheduleFormRow}>
              <TextInput style={styles.scheduleFormHalfInput} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
              <TextInput style={styles.scheduleFormHalfInput} value={assignee} onChangeText={setAssignee} placeholder="담당자" placeholderTextColor={Colors.textMuted} />
            </View>
            <TextInput style={[styles.scheduleFormInput, styles.scheduleTextArea]} value={description} onChangeText={setDescription} placeholder="상세 내용" placeholderTextColor={Colors.textMuted} multiline />
          </View>
          <TouchableOpacity style={[styles.primaryAction, styles.scheduleSubmitButton, saving && styles.disabled]} onPress={saveSchedule} disabled={saving}>
            <Text style={styles.primaryActionText}>{saving ? '저장 중...' : editing ? '수정 저장' : '스케줄 등록'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleListColumn}>
          <View style={styles.scheduleListToolbar}>
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
            </View>
            <TouchableOpacity style={styles.smallOutlineAction} onPress={load}>
              <Text style={styles.smallOutlineActionText}>새로고침</Text>
            </TouchableOpacity>
          </View>
          <DataPanel loading={loading} empty={filtered.length === 0} emptyText="스케줄이 없습니다." style={styles.scheduleListPanel}>
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
      </View>
    </View>
  );
}

function Sidebar({
  active,
  role,
  unreadNotices,
  userName,
  storeName,
  onSelect,
}: {
  active: NavId;
  role: string;
  unreadNotices: number;
  userName: string;
  storeName: string;
  onSelect: (id: NavId) => void;
}) {
  const roleLabel = role === 'ADMIN' ? '관리자' : role === 'HQ_STAFF' ? '본사 직원' : role === 'STORE_MANAGER' ? '점장' : '직원';
  const isHqRole = role === 'ADMIN' || role === 'HQ_STAFF';

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandBlock}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>F</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>flowre</Text>
          <Text style={styles.brandSub} numberOfLines={1}>매장 통합관리</Text>
        </View>
      </View>
      {NAV_SECTIONS.map((section) => {
        const sectionItems = section.items.filter((item) => item.id !== 'stores' || isHqRole);
        if (sectionItems.length === 0) return null;
        return (
          <View key={section.title} style={styles.navSection}>
            <Text style={styles.navKicker}>{section.title}</Text>
            {sectionItems.map((item) => {
              const isActive = active === item.id;
              const badge = item.badge?.({ unreadNotices }) ?? 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onSelect(item.id)}
                  activeOpacity={0.84}
                >
                  <View style={[styles.navDot, isActive && styles.navDotActive]} />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                  {badge > 0 ? (
                    <View style={[styles.navBadge, isActive && styles.navBadgeActive]}>
                      <Text style={styles.navBadgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
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
          <Text style={styles.brandSub}>{roleLabel} · {storeName}</Text>
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

const SUPPORT_FAQS = [
  {
    id: 'account-login',
    category: '계정',
    question: '로그인이 안 될 때 먼저 확인할 것은?',
    answer: '매장 코드, 직원 번호, 비밀번호를 확인하고 그래도 안 되면 직원 관리에서 비밀번호 초기화를 요청하세요.',
  },
  {
    id: 'inventory-upload',
    category: '재고',
    question: '재고 업로드 후 반영이 늦을 때는?',
    answer: '업로드 결과가 생성된 뒤 목록을 새로고침합니다. 파일 형식이나 상품 코드 누락이 있으면 일부 행은 제외될 수 있습니다.',
  },
  {
    id: 'urgent-as',
    category: 'AS',
    question: '긴급 AS로 접수해야 하는 기준은?',
    answer: '결제, 영업, 재고 처리처럼 당일 운영에 직접 영향을 주는 장애는 긴급으로 접수하세요.',
  },
];

function SupportSection({ initialTab = 'inquiries' }: { initialTab?: 'inquiries' | 'as-tickets' }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const [tab, setTab] = useState<'inquiries' | 'as-tickets'>(initialTab);
  const [inquiries, setInquiries] = useState<InquiryTicket[]>([]);
  const [asTickets, setAsTickets] = useState<AsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState(SUPPORT_FAQS[0]?.id ?? '');

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

  const changeInquiryStatus = async (item: InquiryTicket, status: InquiryStatus) => {
    setProcessingId(item.id);
    try {
      const updated = await supportApi.changeInquiryStatus(item.id, status);
      setInquiries((prev) => prev.map((ticket) => ticket.id === item.id ? updated : ticket));
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? '문의 상태 변경에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const changeAsTicketStatus = async (item: AsTicket, status: AsTicketStatus) => {
    setProcessingId(item.id);
    try {
      const updated = await supportApi.changeAsTicketStatus(item.id, status);
      setAsTickets((prev) => prev.map((ticket) => ticket.id === item.id ? updated : ticket));
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error?.message ?? 'AS 상태 변경에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFaqs = SUPPORT_FAQS.filter((item) => !normalizedQuery
    || item.question.toLowerCase().includes(normalizedQuery)
    || item.answer.toLowerCase().includes(normalizedQuery)
    || item.category.toLowerCase().includes(normalizedQuery));
  const filteredInquiries = inquiries.filter((item) => !normalizedQuery
    || [item.title, item.content, item.storeName, item.requesterName].some((value) => (value ?? '').toLowerCase().includes(normalizedQuery)));
  const filteredAsTickets = asTickets.filter((item) => !normalizedQuery
    || [item.title, item.description, item.storeName].some((value) => (value ?? '').toLowerCase().includes(normalizedQuery)));

  return (
    <View style={styles.sectionStack}>
      <View style={styles.summaryStrip}>
        <StatusCount label="문의" value={inquiries.length} color={Colors.primary} />
        <StatusCount label="AS 접수" value={asTickets.length} color={Colors.info} />
        <StatusCount label="미처리" value={inquiries.filter((item) => item.status !== 'DONE').length + asTickets.filter((item) => item.status !== 'DONE').length} color={Colors.warning} />
      </View>

      <View style={[styles.managementGrid, !isDesktop && styles.managementGridStack]}>
        <View style={[styles.panel, styles.supportFaqPanel]}>
          <Text style={styles.panelTitle}>FAQ 게시판</Text>
          <Text style={styles.panelMeta}>자주 묻는 질문을 먼저 확인하고, 접수 게시글을 검색합니다.</Text>
          <TextInput
            style={[styles.searchInput, styles.inlineSearchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="FAQ, 제목, 매장, 요청자 검색"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.supportFaqList}>
            {filteredFaqs.map((item) => {
              const expanded = expandedFaqId === item.id;
              return (
                <TouchableOpacity key={item.id} style={styles.supportFaqItem} onPress={() => setExpandedFaqId(expanded ? '' : item.id)} activeOpacity={0.84}>
                  <View style={styles.supportFaqQuestionRow}>
                    <Text style={styles.supportFaqCategory}>{item.category}</Text>
                    <Text style={styles.supportFaqQuestion} numberOfLines={expanded ? undefined : 1}>{item.question}</Text>
                    <Text style={styles.supportFaqToggle}>{expanded ? '−' : '+'}</Text>
                  </View>
                  {expanded ? <Text style={styles.supportFaqAnswer}>{item.answer}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.supportBoardPanel}>
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
            <DataPanel loading={loading} empty={filteredInquiries.length === 0} emptyText="등록된 문의가 없습니다.">
              {filteredInquiries.map((item) => (
                <View key={item.id} style={styles.supportBoardRow}>
                  <View style={styles.dataMain}>
                    <Text style={styles.supportPostType}>문의</Text>
                    <Text style={styles.dataTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.dataMeta}>
                      {item.storeName} · {item.requesterName} · {dateOnly(item.createdAt)}
                    </Text>
                  </View>
                  <BadgeText label={INQUIRY_STATUS_LABEL[item.status]} tone={item.status === 'PENDING' ? 'warning' : undefined} />
                  {item.status !== 'IN_PROGRESS' ? (
                    <TouchableOpacity style={[styles.smallAction, styles.openAction, processingId === item.id && styles.disabled]} onPress={() => changeInquiryStatus(item, 'IN_PROGRESS')} disabled={processingId === item.id}>
                      <Text style={styles.smallActionText}>처리</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.status !== 'DONE' ? (
                    <TouchableOpacity style={[styles.smallAction, styles.openAction, processingId === item.id && styles.disabled]} onPress={() => changeInquiryStatus(item, 'DONE')} disabled={processingId === item.id}>
                      <Text style={styles.smallActionText}>완료</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </DataPanel>
          ) : (
            <DataPanel loading={loading} empty={filteredAsTickets.length === 0} emptyText="등록된 AS 접수가 없습니다.">
              {filteredAsTickets.map((item) => (
                <View key={item.id} style={styles.supportBoardRow}>
                  <View style={styles.dataMain}>
                    <Text style={styles.supportPostType}>AS</Text>
                    <Text style={styles.dataTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.dataMeta}>
                      {item.storeName} · {dateOnly(item.createdAt)}
                    </Text>
                  </View>
                  <BadgeText label={AS_STATUS_LABEL[item.status]} tone={item.status === 'NEW' ? 'warning' : undefined} />
                  {item.priority === 'URGENT' ? <BadgeText label="긴급" tone="warning" /> : null}
                  {item.status !== 'IN_PROGRESS' ? (
                    <TouchableOpacity style={[styles.smallAction, styles.openAction, processingId === item.id && styles.disabled]} onPress={() => changeAsTicketStatus(item, 'IN_PROGRESS')} disabled={processingId === item.id}>
                      <Text style={styles.smallActionText}>처리</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.status !== 'DONE' ? (
                    <TouchableOpacity style={[styles.smallAction, styles.openAction, processingId === item.id && styles.disabled]} onPress={() => changeAsTicketStatus(item, 'DONE')} disabled={processingId === item.id}>
                      <Text style={styles.smallActionText}>완료</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </DataPanel>
          )}
        </View>
      </View>
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
  style,
}: {
  children: React.ReactNode;
  compact?: boolean;
  empty: boolean;
  emptyText: string;
  loading: boolean;
  style?: ViewStyle;
}) {
  if (loading) {
    return (
      <View style={[styles.panel, compact && styles.compactPanel, style]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (empty) {
    return (
      <View style={[styles.panel, compact && styles.compactPanel, style]}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return <View style={[styles.panel, compact && styles.compactPanel, style]}>{children}</View>;
}

function KpiCard({
  label,
  onPress,
  value,
  unit,
  tone,
}: {
  label: string;
  onPress?: () => void;
  value: string;
  unit: string;
  tone: 'success' | 'info' | 'warning' | 'primary' | 'danger';
}) {
  const toneColor = tone === 'success'
    ? Colors.success
    : tone === 'warning'
      ? Colors.warning
      : tone === 'danger'
        ? Colors.error
      : tone === 'info'
        ? Colors.info
        : Colors.primary;
  const content = (
    <>
      <View style={[styles.kpiIndicator, { backgroundColor: toneColor }]} />
      <View style={styles.kpiCopy}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiUnit}>{unit}</Text>
      </View>
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.kpiCard} onPress={onPress} activeOpacity={0.86}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.kpiCard}>
      {content}
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
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 74,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sidebarBorder,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
  brandCopy: { flex: 1, minWidth: 0 },
  brandTitle: { color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: '900' },
  brandSub: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },
  navSection: {
    marginTop: 18,
  },
  navKicker: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
    paddingHorizontal: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: { backgroundColor: Colors.primary },
  navDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: '#94A3B8', opacity: 0.65 },
  navDotActive: { backgroundColor: '#FFFFFF', opacity: 1 },
  navLabel: { flex: 1, color: '#94A3B8', fontSize: FontSize.sm, fontWeight: '700' },
  navLabelActive: { color: '#FFFFFF', fontWeight: '900' },
  navBadge: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.error,
    paddingHorizontal: 5,
  },
  navBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.sidebarBorder,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
  userName: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' },
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
  mobileNavActive: { backgroundColor: Colors.primary },
  mobileNavText: { color: '#94A3B8', fontSize: FontSize.sm, fontWeight: '700' },
  mobileNavTextActive: { color: '#FFFFFF', fontWeight: '900' },
  content: { flex: 1 },
  contentInner: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    padding: 24,
    gap: 20,
  },
  topBar: {
    minHeight: 76,
    marginHorizontal: -24,
    marginTop: -24,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  topBarMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '800',
    marginTop: 4,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 8,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
  },
  searchIcon: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  searchPillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  searchShortcut: {
    color: Colors.textMuted,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '900',
  },
  bellButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  bellText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.error,
  },
  header: {
    minHeight: 104,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Shadow.raised,
  },
  headerCopy: { flex: 1, minWidth: 180 },
  breadcrumb: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginTop: 2 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '900', lineHeight: 30 },
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
  logoutText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
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
  profileAvatarText: { color: '#FFFFFF', fontSize: FontSize.xxl, fontWeight: '900' },
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
  kpiGrid: { gap: 14 },
  kpiGridWide: { flexDirection: 'row', gap: 14 },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 100,
    gap: 12,
    ...Shadow.card,
  },
  kpiTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  kpiCopy: { flex: 1, minWidth: 0 },
  kpiLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '900', lineHeight: 18 },
  kpiIndicator: { width: 8, height: 44, borderRadius: Radius.full },
  kpiValueRow: { alignItems: 'flex-end', justifyContent: 'center' },
  kpiValue: { color: Colors.textPrimary, fontSize: 32, fontWeight: '900', lineHeight: 36 },
  kpiUnit: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '800', marginTop: 6 },
  figmaMiddleGrid: {
    gap: 18,
  },
  figmaMiddleGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  figmaSchedulePanel: {
    flex: 1.12,
    aspectRatio: 3.35,
    minHeight: 0,
    overflow: 'hidden',
  },
  figmaRightColumn: {
    flex: 1,
    minWidth: 320,
    gap: 18,
  },
  figmaSidePanel: {
    flex: 1,
    minHeight: 188,
  },
  figmaBottomGrid: {
    gap: 18,
  },
  figmaBottomGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  figmaInlinePanel: {
    flex: 1,
    minWidth: 0,
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surfaceMuted,
    padding: 2,
  },
  segmentedItem: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  segmentedItemActive: {
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  segmentedText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  segmentedTextActive: {
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  figmaScheduleRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 10,
  },
  scheduleTypeAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: Radius.full,
  },
  figmaScheduleMain: {
    flex: 1,
    minWidth: 0,
  },
  figmaRowMain: {
    flex: 1,
    minWidth: 0,
  },
  figmaRowTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  figmaUnreadTitle: {
    color: Colors.textPrimary,
  },
  figmaRowMeta: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  figmaTimeText: {
    width: 42,
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  figmaChartList: {
    gap: 10,
    paddingTop: Spacing.xs,
  },
  figmaChartRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  figmaChartLabel: {
    width: 78,
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  figmaChartTrack: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  figmaChartTotal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#E2E8F0',
  },
  figmaChartDone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: Colors.primary,
  },
  figmaChartValue: {
    width: 52,
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  weeklyChartBlock: {
    flex: 1,
    minHeight: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 18,
  },
  weeklyChartTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '900',
    marginBottom: 10,
  },
  weeklyChartArea: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  weeklyAxis: {
    width: 32,
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  weeklyAxisText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '900',
    textAlign: 'right',
  },
  weeklyBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingLeft: 18,
  },
  weeklyBarColumn: {
    flex: 1,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  weeklyBarTrack: {
    width: 20,
    height: 66,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  weeklyBarTotal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  weeklyBarDone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: Colors.primary,
  },
  weeklyBarLabel: {
    marginTop: 9,
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  weeklyLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
  },
  weeklyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyLegendTotal: {
    width: 24,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: '#E2E8F0',
  },
  weeklyLegendDone: {
    width: 24,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  weeklyLegendText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  figmaNoticeRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 12,
  },
  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginTop: 5,
  },
  noticeDotRead: {
    backgroundColor: Colors.borderStrong,
  },
  figmaNoticeCopy: {
    flex: 1,
    minWidth: 0,
  },
  figmaChatRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#94A3B8',
  },
  chatAvatarGroup: {
    backgroundColor: Colors.primary,
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  figmaChatCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatUnread: {
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    overflow: 'hidden',
    textAlign: 'center',
    color: '#FFFFFF',
    backgroundColor: Colors.primary,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 18,
  },
  employeePreviewRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 10,
  },
  employeeAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  employeeAvatarText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  inlinePrimaryMini: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
  },
  inlinePrimaryMiniText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  inventoryTableHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inventoryHeaderText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  inventoryPreviewRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 9,
  },
  inventoryNameCell: {
    flex: 1,
    minWidth: 0,
  },
  inventorySku: {
    width: 76,
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  inventoryQtyCell: {
    width: 72,
    textAlign: 'right',
  },
  inventoryQtyWrap: {
    width: 72,
    alignItems: 'flex-end',
  },
  inventoryQty: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  inventoryStatus: {
    marginTop: 2,
    color: Colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  inventoryStatusDanger: {
    color: Colors.error,
  },
  storeCompactRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 9,
  },
  panelFooterAction: {
    minHeight: 32,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: -4,
  },
  panelTextAction: {
    minHeight: 28,
    justifyContent: 'center',
  },
  panelFooterText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 12,
    ...Shadow.card,
  },
  compactPanel: { minHeight: 120 },
  panelHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  panelTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '900', lineHeight: 25 },
  panelMeta: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl },
  sectionStack: { gap: Spacing.md },
  embeddedSectionStack: { gap: 12 },
  summaryStrip: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  managementGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  managementGridStack: {
    flexDirection: 'column',
  },
  managementFormColumn: {
    flex: 0.9,
    minWidth: 340,
    gap: 18,
  },
  managementFormPanel: {
    flex: 0.85,
    minWidth: 320,
  },
  managementListPanel: {
    flex: 1.45,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  managementToolbar: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    ...Shadow.card,
  },
  toolbarSearchInput: {
    minHeight: 44,
  },
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
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
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  formInput: {
    minWidth: 180,
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    flexWrap: 'wrap',
  },
  dataMain: { flex: 1, minWidth: 180 },
  dataTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },
  dataMeta: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  badge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '900' },
  warningBadge: { backgroundColor: '#FEF3C7' },
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
  smallActionText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '900' },
  statusGrid: { flexDirection: 'row', gap: Spacing.sm },
  statusCountCard: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  statusCountValue: { fontSize: FontSize.xl, fontWeight: '900' },
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
  supportFaqList: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  supportFaqItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
  },
  supportFaqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  supportFaqCategory: {
    minWidth: 42,
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  supportFaqQuestion: {
    flex: 1,
    minWidth: 0,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  supportFaqToggle: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: '900',
  },
  supportFaqAnswer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
  },
  supportBoardRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    flexWrap: 'wrap',
  },
  supportPostType: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '900',
    marginBottom: 4,
  },
  supportFaqPanel: {
    flex: 0.78,
    minWidth: 300,
  },
  supportBoardPanel: {
    flex: 1.35,
    minWidth: 0,
    gap: 12,
  },
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
  chatGridStack: { flexDirection: 'column' },
  roomPanel: { width: 320, maxWidth: '100%', gap: Spacing.sm },
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
    color: '#FFFFFF',
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
  messageSenderMine: { color: '#FFFFFF' },
  messageText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  messageTextMine: { color: '#FFFFFF' },
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
  sendButtonText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' },
  splitGrid: { flexDirection: 'row', gap: Spacing.md },
  splitGridStack: { flexDirection: 'column' },
  listPanel: { width: 320, maxWidth: '100%', gap: Spacing.sm },
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
  loadMoreButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  loadMoreButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  paginationMeta: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '800',
    textAlign: 'center',
  },
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
  filterTextActive: { color: '#FFFFFF' },
  filterRefresh: { marginLeft: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  schedulePageTop: { alignItems: 'flex-end' },
  sectionMetaRow: { alignItems: 'flex-end' },
  schedulePageDate: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '800' },
  scheduleDesktopGrid: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  scheduleDesktopGridMobile: { flexDirection: 'column' },
  scheduleManagementGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  scheduleManagementGridStack: {
    flexDirection: 'column',
  },
  scheduleEditorPanel: {
    flex: 0.82,
    minWidth: 320,
    maxWidth: 430,
  },
  scheduleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleTypeButton: {
    flexGrow: 1,
    minWidth: 126,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
  },
  scheduleFormStack: {
    gap: 10,
  },
  scheduleFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleFormInput: {
    minHeight: 44,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  scheduleFormHalfInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },
  scheduleTextArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  scheduleSubmitButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  scheduleListColumn: {
    flex: 1.45,
    minWidth: 0,
    gap: 12,
  },
  scheduleListToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    ...Shadow.card,
  },
  scheduleListPanel: {
    alignSelf: 'stretch',
  },
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
  calendarDayTextSelected: { color: '#FFFFFF' },
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
