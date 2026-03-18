import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useChatStore } from '../../store/useChatStore';

/** 오늘 날짜 포맷 */
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

export default function HomeScreen() {
  // any 타입 사용 — HomeStack + MainTab 양쪽으로 네비게이션 필요
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const schedules = useScheduleStore((s) => s.schedules);
  const fetchSchedules = useScheduleStore((s) => s.fetchSchedules);
  const rooms = useChatStore((s) => s.rooms);
  const fetchRooms = useChatStore((s) => s.fetchRooms);

  useEffect(() => {
    fetchSchedules();
    fetchRooms();
  }, []);

  const todayKey = getTodayKey();
  const todaySchedules = schedules.filter((s) => s.dueDate.startsWith(todayKey));
  const inProgressCount = todaySchedules.filter((s) => s.status === 'IN_PROGRESS').length;
  const totalUnread = rooms.reduce((sum, r) => sum + r.unread, 0);

  const storeName = user ? `${user.storeName} · JAJU` : 'JAJU';
  const initial = user?.name[0] ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.todayLabel}>{getTodayLabel()}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileInitial}>{initial}</Text>
          </TouchableOpacity>
        </View>

        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="오늘 스케줄"
            value={String(todaySchedules.length)}
            sub={inProgressCount > 0 ? `진행 중 ${inProgressCount}건` : '진행 중 없음'}
            color={Colors.accent}
          />
          <SummaryCard
            label="안읽은 채팅"
            value={String(totalUnread)}
            sub="메시지"
            color={Colors.success}
          />
        </View>

        {/* 오늘 스케줄 */}
        <Section
          title="오늘 스케줄"
          onMore={() => navigation.navigate('ScheduleTab')}
        >
          {todaySchedules.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>오늘 등록된 스케줄이 없습니다.</Text>
            </View>
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
                <View style={[styles.typeBar, { backgroundColor: Colors.scheduleType[s.type as keyof typeof Colors.scheduleType] }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle}>{s.title}</Text>
                  <Text style={styles.scheduleDue}>{s.dueDate.split('T')[0]}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: Colors.statusBadge[s.status as keyof typeof Colors.statusBadge] + '20' }]}>
                  <Text style={[styles.statusText, { color: Colors.statusBadge[s.status as keyof typeof Colors.statusBadge] }]}>
                    {STATUS_LABEL[s.status]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* 최근 채팅방 */}
        <Section
          title="최근 채팅"
          onMore={() => navigation.navigate('ChatTab')}
        >
          {rooms.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>참여 중인 채팅방이 없습니다.</Text>
            </View>
          ) : (
            rooms.slice(0, 3).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.noticeRow}
                onPress={() => navigation.navigate('ChatTab', {
                  screen: 'ChatRoom',
                  params: { roomId: r.id, roomName: r.name, roomType: r.type },
                })}
              >
                <Text style={styles.noticeDot}>{r.type === 'GROUP' ? '👥' : '💬'}</Text>
                <Text style={styles.noticeTitle} numberOfLines={1}>{r.name}</Text>
                {r.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{r.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summarySub}>{sub}</Text>
    </View>
  );
}

function Section({ title, onMore, children }: { title: string; onMore: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onMore}>
          <Text style={styles.moreText}>전체 보기</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  storeName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  todayLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: { color: Colors.surface, fontWeight: '700', fontSize: FontSize.md },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '700' },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  summarySub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary },
  moreText: { fontSize: FontSize.sm, color: Colors.accent },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBar: { width: 4, alignSelf: 'stretch' },
  scheduleInfo: { flex: 1, padding: Spacing.md },
  scheduleTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  scheduleDue: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    marginRight: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  noticeDot: { color: Colors.accent, marginRight: Spacing.sm, fontSize: FontSize.lg },
  noticeTitle: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  emptySection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptySectionText: { fontSize: FontSize.sm, color: Colors.textMuted },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: Colors.surface, fontSize: FontSize.xs, fontWeight: '700' },
});
