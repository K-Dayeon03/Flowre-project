import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

/** 지원하는 상태 값 목록입니다. */
type Status =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MANUAL'
  | 'NOTICE'
  | 'REPORT';

interface StatusBadgeProps {
  /** 상태 값. 알 수 없는 값은 그대로 표시됩니다. */
  status: Status | string;
  /** 배지 크기. 기본값은 'md'입니다. */
  size?: 'sm' | 'md';
}

/** 상태값 → 색상 매핑 */
const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  IN_PROGRESS: Colors.primary,
  DONE: Colors.success,
  ACTIVE: Colors.success,
  INACTIVE: Colors.textMuted,
  MANUAL: Colors.info,
  NOTICE: Colors.primary,
  REPORT: '#7C3AED',
};

/** 상태값 → 한글 레이블 매핑 */
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  MANUAL: '매뉴얼',
  NOTICE: '공지',
  REPORT: '리포트',
};

/**
 * 스케줄·재고·문서 상태를 subtle 배지 스타일로 표시하는 컴포넌트입니다.
 * 배경색은 색상+'18' 투명도, 텍스트는 해당 색상을 사용합니다.
 *
 * @example
 * ```tsx
 * <StatusBadge status="PENDING" size="sm" />
 * <StatusBadge status="DONE" />
 * ```
 */
export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = STATUS_COLOR[status] ?? Colors.textMuted;
  const label = STATUS_LABEL[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.text, { color }, size === 'sm' ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: FontSize.xs,
  },
  textMd: {
    fontSize: FontSize.sm,
  },
});
