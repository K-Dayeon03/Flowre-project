import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../constants/theme';

interface MetricCardProps {
  /** 카드 제목 (예: "오늘 스케줄") */
  label: string;
  /** 주요 수치 */
  value: string | number;
  /** 보조 텍스트 */
  sub?: string;
  /** 상단 강조 라인 및 수치 텍스트 색상 */
  color: string;
  /** 탭 핸들러. 제공 시 TouchableOpacity로 감쌉니다. */
  onPress?: () => void;
}

/**
 * KPI 요약 수치를 상단 컬러 라인과 함께 표시하는 메트릭 카드입니다.
 * HomeScreen의 summaryRow에서 사용됩니다.
 */
export default function MetricCard({ label, value, sub, color, onPress }: MetricCardProps) {
  const content = (
    <View style={styles.container}>
      {/* 상단 3px 컬러 강조 라인 */}
      <View style={[styles.accentLine, { backgroundColor: color }]} />
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub != null ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.touchWrapper} onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchWrapper: {
    flex: 1,
    minWidth: 130,
  },
  container: {
    flex: 1,
    minWidth: 130,
    minHeight: 100,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  sub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
