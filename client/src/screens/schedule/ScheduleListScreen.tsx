import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { MainStackParamList } from '../../navigation/types';
import Calendar, { MarkedDate } from '../../components/Calendar';
import FilterBar from '../../components/FilterBar';
import SearchBar from '../../components/SearchBar';
import { useScheduleStore } from '../../store/useScheduleStore';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ScheduleList'>;

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

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

/** dueDate가 'YYYY-MM-DDTHH:mm:ss' 형식이면 날짜 부분만 추출 */
function toDateKey(dueDate: string): string {
  return dueDate.split('T')[0];
}

type StatusFilter = 'PENDING' | 'IN_PROGRESS' | 'DONE' | undefined;

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: '전체', value: undefined },
  { label: '대기', value: 'PENDING' },
  { label: '진행 중', value: 'IN_PROGRESS' },
  { label: '완료', value: 'DONE' },
];

export default function ScheduleListScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [searchText, setSearchText] = useState('');

  const schedules = useScheduleStore((s) => s.schedules);
  const fetchSchedules = useScheduleStore((s) => s.fetchSchedules);

  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [fetchSchedules])
  );

  const markedDates: MarkedDate[] = Object.entries(
    schedules.reduce<Record<string, string>>((acc, s) => {
      const key = toDateKey(s.dueDate);
      if (!acc[key]) {
        acc[key] = Colors.scheduleType[s.type as keyof typeof Colors.scheduleType];
      }
      return acc;
    }, {})
  ).map(([date, color]) => ({ date, color }));

  const displayed = schedules
    .filter((s) => viewMode === 'calendar' ? toDateKey(s.dueDate) === selectedDate : true)
    .filter((s) => statusFilter ? s.status === statusFilter : true)
    .filter((s) => searchText.trim() ? s.title.includes(searchText.trim()) : true);

  const selectedCount = schedules.filter((s) => toDateKey(s.dueDate) === selectedDate).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.controlPanel}>
        <View style={styles.screenHead}>
          <View>
            <Text style={styles.screenKicker}>SCHEDULE</Text>
            <Text style={styles.screenTitle}>업무 일정</Text>
          </View>
          <Text style={styles.screenCount}>{schedules.length}건</Text>
        </View>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
              캘린더
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              목록
            </Text>
          </TouchableOpacity>
        </View>
        <FilterBar
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="일정 제목 검색"
        />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          viewMode === 'calendar' ? (
            <View>
              <Calendar
                markedDates={markedDates}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
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
              <Text style={styles.cardMeta}>📅 {toDateKey(item.dueDate)}</Text>
              <Text style={styles.cardMeta}>👤 {item.assignee ?? '-'}</Text>
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
  controlPanel: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.card,
  },
  screenHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenKicker: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    marginTop: 2,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  screenCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  toggleText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  toggleTextActive: { color: Colors.textPrimary, fontWeight: '800' },
  list: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm, paddingBottom: 88 },
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
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  empty: { paddingVertical: 48, alignItems: 'center', gap: Spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.raised,
  },
  fabText: { color: Colors.surface, fontSize: 28, lineHeight: 32 },
});
