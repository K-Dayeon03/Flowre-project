import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import Button from './Button';

interface EmptyStateProps {
  /** 상단에 표시할 아이콘입니다. */
  icon?: ReactNode;
  /** 빈 상태 제목입니다. */
  title: string;
  /** 빈 상태 보조 설명입니다. */
  description?: string;
  /** 액션 버튼 라벨입니다. */
  actionLabel?: string;
  /** 액션 버튼 콜백입니다. */
  onAction?: () => void;
}

/** 데이터가 없을 때 중앙에 표시하는 공통 빈 상태입니다. */
export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="md" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.gray900,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  description: {
    marginTop: Spacing.xs,
    color: Colors.gray600,
    fontSize: Typography.size.sm,
    lineHeight: Typography.size.sm * Typography.lineHeight.normal,
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.base,
  },
});
