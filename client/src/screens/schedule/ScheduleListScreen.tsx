import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ScheduleStackParamList } from '../../navigation/types';
import Calendar, { MarkedDate } from '../../components/Calendar';

type Nav = NativeStackNavigationProp<ScheduleStackParamList, 'ScheduleList'>;

const TYPE_LABEL: Record<string, string> = {
  MANNEQUIN: '마네킹 교체',
  HQ_VISIT: '본사 방문',
  VM_CHECK: 'VM 점검',
  OTHER: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

const MOCK_SCHEDULES = [
  { id: 1, title: '봄 시즌 마네킹 교체', type: 'MANNEQUIN', status: 'IN_PROGRESS', dueDate: '2025-03-11', assignee: '김민지' },
  { id: 2, title: 'VM 점검 - 1층 윈도우', type: 'VM_CHECK', status: 'PENDING', dueDate: '2025-03-11', assignee: '이수진' },
  { id: 3, title: '본사 VMD 팀 방문', type: 'HQ_VISIT', status: 'PENDING', dueDate: '2025-03-13', assignee: '전체' },
  { id: 4, title: '여름 시즌 마네킹 준비', type: 'MANNEQUIN', status: 'PENDING', dueDate: '2025-03-20', assignee: '박소연' },
  { id: 5, title: '주간 VM 체크리스트', type: 'VM_CHECK', status: 'DONE', dueDate: '2025-03-07', assignee: '김민지' },
];

/** 날짜별 dot 색상: 첫 번째 스케줄의 타입 색상 사용 */
const markedDates: MarkedDate[] = Object.entries(
  MOCK_SCHEDULES.reduce<Record<string, string>>((acc, s) => {
    if (!acc[s.dueDate]) {
      acc[s.dueDate] = Colors.scheduleType[s.type as keyof typeof Colors.scheduleType];
    }
    return acc;
  }, {})
).map(([date, color]) => ({ date, color }));

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function ScheduleListScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 선택된 날짜의 스케줄 (캘린더 모드) 또는 전체 (목록 모드)
  const displayed = viewMode === 'calendar'
    ? MOCK_SCHEDULES.filter((s) => s.dueDate === selectedDate)
    : MOCK_SCHEDULES;

  const selectedCount = MOCK_SCHEDULES.filter((s) => s.dueDate === selectedDate).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 뷰 전환 토글 */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
            📅 캘린더
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            ☰ 목록
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          viewMode === 'calendar' ? (
            <View>
              {/* 캘린더 */}
              <Calendar
                markedDates={markedDates}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              {/* 선택 날짜 라벨 */}
              <View style={styles.dateLabelRow}>
                <Text style={styles.dateLabel}>{selectedDate}</Text>
                <Text style={styles.dateCount}>
                  {selectedCount > 0 ? `${selectedCount}건` : '스케줄 없음'}
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={[styles.typeChip, { backgroundColor: Colors.scheduleType[item.type as keyof typeof Colors.scheduleType] + '20' }]}>
                <Text style={[styles.typeText, { color: Colors.scheduleType[item.type as keyof typeof Colors.scheduleType] }]}>
                  {TYPE_LABEL[item.type]}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: Colors.statusBadge[item.status as keyof typeof Colors.statusBadge] + '20' }]}>
                <Text style={[styles.statusText, { color: Colors.statusBadge[item.status as keyof typeof Colors.statusBadge] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.cardMeta}>📅 {item.dueDate}</Text>
              <Text style={styles.cardMeta}>👤 {item.assignee}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'calendar' ? '이 날짜에 스케줄이 없습니다.' : '스케줄이 없습니다.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ScheduleCreate')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toggleRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  toggleTextActive: { color: Colors.surface, fontWeight: '700' },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  dateLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  dateCount: { fontSize: FontSize.sm, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  cardBottom: { flexDirection: 'row', gap: Spacing.md },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  empty: { paddingVertical: 48, alignItems: 'center', gap: Spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Colors.surface, fontSize: 28, lineHeight: 32 },
});
