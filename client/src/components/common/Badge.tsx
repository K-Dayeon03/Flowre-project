import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  /** 뱃지에 표시할 텍스트입니다. */
  label: string;
  /** 뱃지 의미 색상입니다. */
  variant?: BadgeVariant;
  /** 뱃지 크기입니다. */
  size?: BadgeSize;
}

const VARIANTS: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: Colors.success50, color: Colors.success700 },
  warning: { backgroundColor: Colors.warning50, color: Colors.warning700 },
  danger: { backgroundColor: Colors.danger50, color: Colors.danger700 },
  info: { backgroundColor: Colors.primary100, color: Colors.info },
  neutral: { backgroundColor: Colors.gray100, color: Colors.gray600 },
};

/** 상태, 분류, 카운트 값을 작게 강조하는 pill 뱃지입니다. */
export default function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const tone = VARIANTS[variant];

  return (
    <View style={[styles.badge, size === 'sm' ? styles.badgeSm : styles.badgeMd, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.text, size === 'sm' ? styles.textSm : styles.textMd, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  text: {
    fontWeight: Typography.weight.semibold,
  },
  textSm: {
    fontSize: Typography.size.xs,
  },
  textMd: {
    fontSize: Typography.size.sm,
  },
});
