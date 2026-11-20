import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, MIN_TOUCH_SIZE, Radius, Spacing, Typography } from '../../constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  /** 버튼 라벨입니다. */
  label: string;
  /** 버튼을 눌렀을 때 실행할 콜백입니다. */
  onPress: () => void;
  /** 버튼 시각 유형입니다. */
  variant?: ButtonVariant;
  /** 버튼 높이 유형입니다. */
  size?: ButtonSize;
  /** 로딩 중 스피너를 표시하고 입력을 막습니다. */
  loading?: boolean;
  /** 비활성 상태입니다. */
  disabled?: boolean;
  /** 라벨 왼쪽에 표시할 아이콘입니다. */
  leftIcon?: ReactNode;
  /** 부모 너비를 꽉 채울지 여부입니다. */
  fullWidth?: boolean;
  /** 외부 컨테이너 스타일입니다. */
  style?: StyleProp<ViewStyle>;
}

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 32, paddingHorizontal: Spacing.md },
  md: { minHeight: MIN_TOUCH_SIZE, paddingHorizontal: Spacing.base },
  lg: { minHeight: 52, paddingHorizontal: Spacing.lg },
};

const VARIANT_STYLES: Record<ButtonVariant, { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: { backgroundColor: Colors.primary500, borderColor: Colors.primary500, textColor: Colors.white },
  secondary: { backgroundColor: Colors.gray100, borderColor: Colors.gray100, textColor: Colors.gray800 },
  danger: { backgroundColor: Colors.danger, borderColor: Colors.danger, textColor: Colors.white },
  ghost: { backgroundColor: Colors.transparent, borderColor: Colors.primary500, textColor: Colors.primary500 },
};

/** 앱 전체에서 쓰는 Pressable 기반 버튼입니다. loading, disabled, icon, size, variant를 지원합니다. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const inactive = disabled || loading;
  const variantStyle = VARIANT_STYLES[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      android_ripple={{ color: variant === 'ghost' ? Colors.primary100 : Colors.gray200 }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 100 });
      }}
      style={[fullWidth && styles.fullWidth, inactive && styles.disabled, style]}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            SIZE_STYLES[size],
            {
              backgroundColor: variantStyle.backgroundColor,
              borderColor: variantStyle.borderColor,
              opacity: pressed ? 0.85 : 1,
            },
            animatedStyle,
          ]}
        >
          {loading ? <ActivityIndicator color={variantStyle.textColor} size="small" /> : leftIcon}
          <Text style={[styles.label, { color: variantStyle.textColor }]}>{label}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_SIZE,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
});
