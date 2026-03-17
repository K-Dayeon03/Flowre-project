import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export interface MarkedDate {
  date: string; // 'YYYY-MM-DD'
  color?: string;
}

interface Props {
  markedDates?: MarkedDate[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Calendar({ markedDates = [], onDateSelect, selectedDate }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // 해당 월의 첫째 날 요일, 마지막 날
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();

  const markedSet = new Map(markedDates.map((m) => [m.date, m.color ?? Colors.accent]));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onDateSelect?.(toKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // 달력 셀 배열 (null = 빈 칸)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ];
  // 6주 그리드 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday}>
          <Text style={styles.monthLabel}>
            {viewYear}년 {viewMonth + 1}월
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekRow}>
        {DAYS.map((d, i) => (
          <Text
            key={d}
            style={[
              styles.weekDay,
              i === 0 && styles.sunday,
              i === 6 && styles.saturday,
            ]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;

          const dateKey = toKey(viewYear, viewMonth, day);
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          const isSelected = dateKey === selectedDate;
          const dotColor = markedSet.get(dateKey);
          const col = idx % 7;

          return (
            <TouchableOpacity
              key={dateKey}
              style={styles.cell}
              onPress={() => onDateSelect?.(dateKey)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.selectedCircle,
                  isToday && !isSelected && styles.todayCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    col === 0 && styles.sundayText,
                    col === 6 && styles.saturdayText,
                    isSelected && styles.selectedText,
                    isToday && !isSelected && styles.todayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
              {dotColor && (
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: { padding: Spacing.sm },
  navText: { fontSize: 24, color: Colors.textSecondary, lineHeight: 26 },
  monthLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingVertical: 4,
  },
  sunday: { color: Colors.error },
  saturday: { color: Colors.info },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCircle: { backgroundColor: Colors.primary },
  todayCircle: { borderWidth: 1.5, borderColor: Colors.accent },
  dayText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  sundayText: { color: Colors.error },
  saturdayText: { color: Colors.info },
  selectedText: { color: Colors.surface, fontWeight: '700' },
  todayText: { color: Colors.accent, fontWeight: '700' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
    marginTop: 2,
  },
});
