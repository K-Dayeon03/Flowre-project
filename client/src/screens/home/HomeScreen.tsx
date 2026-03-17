import React from 'react';
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

/** 오늘 날짜 포맷 */
function getTodayLabel() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

const MOCK_SCHEDULES = [
  { id: 1, title: '봄 시즌 마네킹 교체', type: 'MANNEQUIN', status: 'IN_PROGRESS', dueDate: '오늘 18:00' },
  { id: 2, title: 'VM 점검 - 1층', type: 'VM_CHECK', status: 'PENDING', dueDate: '오늘 15:00' },
];

const MOCK_NOTICES = [
  { id: 1, title: '2025 SS 시즌 VM 가이드라인 배포', date: '03.10' },
  { id: 2, title: '4월 본사 방문 일정 안내', date: '03.09' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.storeName}>강남점 · JAJU</Text>
            <Text style={styles.todayLabel}>{getTodayLabel()}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Text style={styles.profileInitial}>김</Text>
          </TouchableOpacity>
        </View>

        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          <SummaryCard label="오늘 스케줄" value="2" sub="진행 중 1건" color={Colors.accent} />
          <SummaryCard label="미확인 문서" value="3" sub="새 파일" color={Colors.info} />
          <SummaryCard label="안읽은 채팅" value="5" sub="메시지" color={Colors.success} />
        </View>

        {/* 오늘 스케줄 */}
        <Section
          title="오늘 스케줄"
          onMore={() => navigation.navigate('ScheduleTab')}
        >
          {MOCK_SCHEDULES.map((s) => (
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
                <Text style={styles.scheduleDue}>{s.dueDate}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: Colors.statusBadge[s.status as keyof typeof Colors.statusBadge] + '20' }]}>
                <Text style={[styles.statusText, { color: Colors.statusBadge[s.status as keyof typeof Colors.statusBadge] }]}>
                  {STATUS_LABEL[s.status]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </Section>

        {/* 최근 공지 */}
        <Section
          title="최근 공지"
          onMore={() => navigation.navigate('DocumentTab')}
        >
          {MOCK_NOTICES.map((n) => (
            <TouchableOpacity key={n.id} style={styles.noticeRow}>
              <Text style={styles.noticeDot}>•</Text>
              <Text style={styles.noticeTitle} numberOfLines={1}>{n.title}</Text>
              <Text style={styles.noticeDate}>{n.date}</Text>
            </TouchableOpacity>
          ))}
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
  noticeDate: { fontSize: FontSize.sm, color: Colors.textMuted, marginLeft: Spacing.sm },
});
