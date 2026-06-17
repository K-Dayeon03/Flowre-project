import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 섹션 제목과 선택 액션을 한 줄로 표시합니다. */
export default function SectionHeader({ title, actionLabel = '전체 보기', onAction }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  action: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
});
