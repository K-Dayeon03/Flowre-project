import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../constants/theme';

/** 필터 탭 옵션 한 개를 나타내는 타입입니다. */
export interface FilterOption<T extends string | number | boolean | undefined = string | undefined> {
  label: string;
  value: T;
}

interface FilterBarProps<T extends string | number | boolean | undefined = string | undefined> {
  /** 탭 옵션 목록 */
  options: FilterOption<T>[];
  /** 현재 선택된 값 */
  value: T;
  /** 탭 선택 콜백 */
  onChange: (value: T) => void;
}

/**
 * 세그먼트 스타일 필터 탭 컴포넌트입니다.
 * ScheduleListScreen, DocumentListScreen 등 카테고리/상태 필터에 사용합니다.
 *
 * @example
 * ```tsx
 * <FilterBar
 *   options={[
 *     { label: '전체', value: undefined },
 *     { label: '대기', value: 'PENDING' },
 *   ]}
 *   value={activeFilter}
 *   onChange={setActiveFilter}
 * />
 * ```
 */
export default function FilterBar<T extends string | number | boolean | undefined = string | undefined>({
  options,
  value,
  onChange,
}: FilterBarProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value ?? '__all__')}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
