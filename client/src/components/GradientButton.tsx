import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Gradients, Radius, Shadow, Spacing } from '../constants/theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** flowre 브랜드 그라데이션을 사용하는 기본 액션 버튼입니다. */
export default function GradientButton({ title, onPress, loading, disabled, style }: GradientButtonProps) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={inactive}
      style={[styles.touchable, inactive && styles.disabled, style]}
    >
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {loading ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.raised,
  },
  disabled: {
    opacity: 0.55,
  },
  gradient: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
