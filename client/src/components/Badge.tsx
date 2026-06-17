import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

interface BadgeProps {
  label: string | number;
  color?: string;
  subtle?: boolean;
}

/** 상태와 카운트를 작게 표시하는 뱃지입니다. */
export default function Badge({ label, color = Colors.primary, subtle = true }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: subtle ? `${color}18` : color }]}>
      <Text style={[styles.text, { color: subtle ? color : Colors.surface }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    minWidth: 22,
    minHeight: 22,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
