import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

/** 목록이 비어 있을 때 쓰는 간결한 안내 상태입니다. */
export default function EmptyState({ icon = '•', title, description }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    fontSize: 26,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
