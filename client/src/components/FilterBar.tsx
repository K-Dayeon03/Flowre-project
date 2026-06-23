import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../constants/theme';

/** 필터 탭 옵션 한 개를 나타내는 타입입니다. */
export interface FilterOption<T extends string | number | boolean | undefined = string | undefined> {
  label: string;
  value: T;
}

interface FilterBarProps<T extends string | number | boolean | undefined = string | undefined> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

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
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
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
    color: '#FFFFFF',
  },
});
